from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from app.main import app
from app.models import Subscription

STUDENT = {
    "email": "student@example.com",
    "password": "secret123",
    "name": "Aliya",
    "language": "ru",
}


def register(client: TestClient) -> Response:
    return client.post("/api/auth/register", json=STUDENT)


def login(client: TestClient) -> dict[str, str]:
    credentials = {"email": STUDENT["email"], "password": STUDENT["password"]}
    return client.post("/api/auth/login", json=credentials).json()


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_register_creates_student_with_free_subscription(
    client: TestClient, test_engine: Engine
) -> None:
    response = register(client)

    assert response.status_code == 201
    assert response.json() == {
        "id": 1,
        "email": "student@example.com",
        "name": "Aliya",
        "language": "ru",
        "role": "student",
        "plan": "free",
    }
    with Session(test_engine) as db:
        subscription = db.scalars(select(Subscription)).one()
    assert subscription.user_id == 1
    assert subscription.plan == "free"


def test_register_with_taken_email_returns_409(client: TestClient) -> None:
    register(client)

    duplicate = {**STUDENT, "email": "Student@Example.com"}
    response = client.post("/api/auth/register", json=duplicate)

    assert response.status_code == 409
    assert response.json() == {"detail": "email_taken"}


def test_register_with_password_over_72_bytes_returns_422(
    client: TestClient,
) -> None:
    # 37 Cyrillic letters are 74 bytes in UTF-8.
    response = client.post("/api/auth/register", json={**STUDENT, "password": "я" * 37})

    assert response.status_code == 422


def test_login_with_wrong_password_returns_401(client: TestClient) -> None:
    register(client)

    credentials = {"email": STUDENT["email"], "password": "wrong-password"}
    response = client.post("/api/auth/login", json=credentials)

    assert response.status_code == 401
    assert response.json() == {"detail": "invalid_credentials"}


def test_me_without_token_returns_401() -> None:
    # No database needed: the request is rejected before any query.
    response = TestClient(app).get("/api/users/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "not_authenticated"}


def test_refresh_returns_working_access_token(client: TestClient) -> None:
    register(client)
    tokens = login(client)

    response = client.post(
        "/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )

    assert response.status_code == 200
    access_token = response.json()["access_token"]
    me = client.get("/api/users/me", headers=bearer(access_token))
    assert me.status_code == 200
    assert me.json()["email"] == STUDENT["email"]


def test_refresh_token_is_not_accepted_as_access_token(client: TestClient) -> None:
    register(client)
    tokens = login(client)

    response = client.get("/api/users/me", headers=bearer(tokens["refresh_token"]))

    assert response.status_code == 401
    assert response.json() == {"detail": "invalid_token"}


def test_update_me_changes_name_and_language(client: TestClient) -> None:
    register(client)
    tokens = login(client)

    response = client.patch(
        "/api/users/me",
        json={"name": "Aliya B.", "language": "kk"},
        headers=bearer(tokens["access_token"]),
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Aliya B."
    assert response.json()["language"] == "kk"
