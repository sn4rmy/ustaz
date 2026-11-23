import pytest
from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session

from app.models import (
    AgentTrace,
    Attempt,
    Course,
    Item,
    StudySession,
    Topic,
    UsageDaily,
)

STUDENT = {
    "email": "student@example.com",
    "password": "secret123",
    "name": "Aliya",
    "language": "ru",
}
OTHER_STUDENT = {**STUDENT, "email": "other@example.com"}
FIXTURE = """
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER);
INSERT INTO employees VALUES (1, 'Aliya', 300), (2, 'Bolat', 500), (3, 'Dana', 400);
"""
# The comment makes the key easy to spot if it ever leaks into a response.
ANSWER_KEY = "SELECT name FROM employees WHERE salary > 350 /* secret key */"
RIGHT = "SELECT name FROM employees WHERE salary >= 400"
WRONG = "SELECT name FROM employees"


@pytest.fixture
def course(test_engine: Engine) -> None:
    with Session(test_engine) as db:
        db.add_all(
            [Course(title="SQL", language="en"), Course(title="Other", language="en")]
        )
        db.flush()
        db.add_all(
            [
                Topic(course_id=1, title="WHERE", position=1),
                Topic(course_id=1, title="Empty", position=2),
                Topic(course_id=2, title="Other", position=1),
            ]
        )
        db.flush()
        db.add_all(
            [
                sql_item(topic_id=1, prompt="Rich employees", difficulty=1),
                sql_item(topic_id=1, prompt="Harder task", difficulty=2),
                sql_item(topic_id=3, prompt="Other course task", difficulty=1),
            ]
        )
        db.commit()


def sql_item(topic_id: int, prompt: str, difficulty: int) -> Item:
    return Item(
        topic_id=topic_id,
        type="sql_query",
        prompt=prompt,
        answer_key=ANSWER_KEY,
        fixture=FIXTURE,
        difficulty=difficulty,
    )


def login(client: TestClient, user: dict[str, str]) -> dict[str, str]:
    client.post("/api/auth/register", json=user)
    credentials = {"email": user["email"], "password": user["password"]}
    tokens = client.post("/api/auth/login", json=credentials).json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def start_session(client: TestClient, headers: dict[str, str]) -> int:
    response = client.post("/api/sessions", headers=headers, json={"course_id": 1})
    return response.json()["id"]


def next_item(
    client: TestClient, headers: dict[str, str], topic_id: int = 1
) -> Response:
    return client.post(
        "/api/sessions/1/items/next", headers=headers, json={"topic_id": topic_id}
    )


def attempt(
    client: TestClient, headers: dict[str, str], answer: str, item_id: int = 1
) -> Response:
    return client.post(
        "/api/sessions/1/attempts",
        headers=headers,
        json={"item_id": item_id, "answer": answer},
    )


def session_state(engine: Engine) -> dict:
    with Session(engine) as db:
        return db.get(StudySession, 1).state


@pytest.fixture
def headers(client: TestClient, course: None) -> dict[str, str]:
    student = login(client, STUDENT)
    start_session(client, student)
    return student


def test_next_item_has_schema_and_opens_task(
    client: TestClient, headers: dict[str, str], test_engine: Engine
) -> None:
    response = next_item(client, headers)

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "topic_id": 1,
        "type": "sql_query",
        "prompt": "Rich employees",
        "schema": [
            {
                "table": "employees",
                "columns": ["id INTEGER", "name TEXT", "salary INTEGER"],
            }
        ],
        "difficulty": 1,
    }
    assert session_state(test_engine) == {"current_topic_id": 1, "pending_item_id": 1}
    with Session(test_engine) as db:
        trace = db.scalars(select(AgentTrace)).one()
    assert trace.agent == "examiner"
    assert trace.model is None
    assert trace.output == {"item_id": 1}


def test_right_answer_is_correct_and_closes_task(
    client: TestClient, headers: dict[str, str], test_engine: Engine
) -> None:
    next_item(client, headers)

    response = attempt(client, headers, RIGHT)

    assert response.status_code == 201
    assert response.json() == {
        "attempt_id": 1,
        "correct": True,
        "score": 1.0,
        "feedback_code": "correct",
        "columns": ["name"],
        "rows": [["Bolat"], ["Dana"]],
        "error": None,
    }
    state = session_state(test_engine)
    assert state["pending_item_id"] is None
    assert state["last_grade"] == {
        "item_id": 1,
        "correct": True,
        "feedback_code": "correct",
    }
    with Session(test_engine) as db:
        saved = db.get(Attempt, 1)
        traces = db.scalars(select(AgentTrace).order_by(AgentTrace.id)).all()
    assert (saved.user_id, saved.item_id, saved.answer) == (1, 1, RIGHT)
    assert saved.correct is True
    assert traces[1].input == {"action": "grade", "item_id": 1, "answer": RIGHT}
    assert "secret key" not in str(traces[1].output)


def test_wrong_answer_keeps_task_open(
    client: TestClient, headers: dict[str, str], test_engine: Engine
) -> None:
    next_item(client, headers)

    response = attempt(client, headers, WRONG)

    body = response.json()
    assert body["correct"] is False
    assert body["score"] == 0.0
    assert body["feedback_code"] == "wrong_result"
    # The student sees the result of their own query.
    assert body["rows"] == [["Aliya"], ["Bolat"], ["Dana"]]
    assert session_state(test_engine)["pending_item_id"] == 1


def test_query_that_changes_data_is_sql_error(
    client: TestClient, headers: dict[str, str], test_engine: Engine
) -> None:
    next_item(client, headers)

    response = attempt(client, headers, "DROP TABLE employees")

    assert response.status_code == 201
    body = response.json()
    assert body["feedback_code"] == "sql_error"
    assert body["error"] == "only SELECT and WITH queries are allowed"
    assert (body["columns"], body["rows"]) == ([], [])
    with Session(test_engine) as db:
        assert db.get(Attempt, 1).correct is False


def test_answer_key_is_never_sent(client: TestClient, headers: dict[str, str]) -> None:
    responses = [
        next_item(client, headers),
        attempt(client, headers, WRONG),
        attempt(client, headers, "SELEC name"),
        attempt(client, headers, RIGHT),
    ]

    for response in responses:
        assert "secret key" not in response.text
        assert "answer_key" not in response.text


def test_easiest_unsolved_item_comes_first(
    client: TestClient, headers: dict[str, str]
) -> None:
    assert next_item(client, headers).json()["id"] == 1
    attempt(client, headers, WRONG)
    # Not solved yet, so the same task comes again.
    assert next_item(client, headers).json()["id"] == 1

    attempt(client, headers, RIGHT)

    assert next_item(client, headers).json()["id"] == 2


def test_topic_without_items(client: TestClient, headers: dict[str, str]) -> None:
    response = next_item(client, headers, topic_id=2)

    assert response.status_code == 404
    assert response.json() == {"detail": "no_items"}


def test_topic_and_item_of_other_course(
    client: TestClient, headers: dict[str, str]
) -> None:
    topic = next_item(client, headers, topic_id=3)
    item = attempt(client, headers, RIGHT, item_id=3)

    assert topic.status_code == 404
    assert topic.json() == {"detail": "topic_not_found"}
    assert item.status_code == 404
    assert item.json() == {"detail": "item_not_found"}


def test_session_of_other_student(client: TestClient, headers: dict[str, str]) -> None:
    other = login(client, OTHER_STUDENT)

    assert next_item(client, other).status_code == 404
    assert attempt(client, other, RIGHT).status_code == 404


def test_too_long_answer(client: TestClient, headers: dict[str, str]) -> None:
    response = attempt(client, headers, "SELECT 1 -- " + "x" * 4000)

    assert response.status_code == 422


def test_attempts_do_not_use_message_limit(
    client: TestClient, headers: dict[str, str], test_engine: Engine
) -> None:
    next_item(client, headers)
    attempt(client, headers, RIGHT)

    with Session(test_engine) as db:
        assert db.scalar(select(func.count()).select_from(UsageDaily)) == 0
