import re

import pytest

from app.sandbox import QueryResult, SandboxError, compare, describe, run_query, sqlite
from app.scripts.seed import FIXTURE_PATH, TOPICS, load_items

FIXTURE = """
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER);
INSERT INTO employees VALUES (1, 'Aliya', 300), (2, 'Bolat', 500), (3, 'Dana', 400);
"""


def grade_like(query: str, reference: str, ordered: bool = False) -> bool:
    return compare(run_query(FIXTURE, query), run_query(FIXTURE, reference), ordered)


def test_select_returns_columns_and_rows() -> None:
    result = run_query(FIXTURE, "SELECT name, salary FROM employees WHERE salary > 350")

    assert result.columns == ["name", "salary"]
    assert result.rows == [("Bolat", 500), ("Dana", 400)]


def test_right_and_wrong_query() -> None:
    reference = "SELECT name FROM employees WHERE salary > 350"

    assert grade_like("SELECT name FROM employees WHERE salary >= 400", reference)
    assert not grade_like("SELECT name FROM employees", reference)


def test_other_query_with_same_result_is_right() -> None:
    reference = "SELECT COUNT(*) FROM employees"

    assert grade_like("SELECT COUNT(id) AS total FROM employees", reference)
    assert grade_like(
        "WITH e AS (SELECT * FROM employees) SELECT COUNT(*) FROM e", reference
    )


def test_number_of_columns_matters() -> None:
    reference = "SELECT name FROM employees"

    assert not grade_like("SELECT name, salary FROM employees", reference)


@pytest.mark.parametrize(
    "query",
    [
        "INSERT INTO employees VALUES (4, 'Erlan', 100)",
        "UPDATE employees SET salary = 0",
        "DELETE FROM employees",
        "DROP TABLE employees",
        "ATTACH DATABASE ':memory:' AS other",
        "PRAGMA table_info(employees)",
        "CREATE TABLE other (id INTEGER)",
        "WITH e AS (SELECT id FROM employees) DELETE FROM employees",
    ],
)
def test_writes_and_settings_are_blocked(query: str) -> None:
    with pytest.raises(SandboxError, match="only SELECT and WITH"):
        run_query(FIXTURE, query)


def test_second_statement_is_not_run() -> None:
    with pytest.raises(SandboxError):
        run_query(FIXTURE, "SELECT 1; DROP TABLE employees")


def test_endless_recursive_query_is_stopped(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sqlite, "TIME_LIMIT_SECONDS", 0.2)
    query = (
        "WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n) "
        "SELECT COUNT(*) FROM n"
    )

    with pytest.raises(SandboxError, match="longer than 0.2 seconds"):
        run_query(FIXTURE, query)


def test_too_many_rows_is_an_error() -> None:
    query = (
        "WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n LIMIT 5000) "
        "SELECT x FROM n"
    )

    with pytest.raises(SandboxError, match="more than 1000 rows"):
        run_query(FIXTURE, query)


def test_huge_value_is_an_error() -> None:
    with pytest.raises(SandboxError):
        run_query(FIXTURE, "SELECT zeroblob(10000000)")


def test_syntax_error_has_sqlite_text() -> None:
    with pytest.raises(SandboxError, match="no such table: staff"):
        run_query(FIXTURE, "SELECT * FROM staff")


def test_order_counts_only_when_ordered() -> None:
    reference = "SELECT name FROM employees ORDER BY salary DESC"
    other_order = "SELECT name FROM employees ORDER BY salary"

    assert grade_like(other_order, reference, ordered=False)
    assert not grade_like(other_order, reference, ordered=True)
    assert grade_like("SELECT name FROM employees ORDER BY 0 - salary", reference, True)


def test_duplicate_rows_are_counted() -> None:
    student = QueryResult(["x"], [(1,), (1,), (2,)])
    reference = QueryResult(["x"], [(1,), (2,), (2,)])

    assert not compare(student, reference, ordered=False)


def test_floats_are_compared_rounded() -> None:
    student = QueryResult(["avg"], [(0.1 + 0.2,)])
    reference = QueryResult(["avg"], [(0.3,)])

    assert compare(student, reference, ordered=False)


def test_describe_lists_tables_and_columns() -> None:
    assert describe(FIXTURE) == [
        {
            "table": "employees",
            "columns": ["id INTEGER", "name TEXT", "salary INTEGER"],
        }
    ]


def test_seed_has_three_runnable_items_per_topic() -> None:
    fixture = FIXTURE_PATH.read_text(encoding="utf-8")
    items = load_items()

    assert list(items) == TOPICS
    for topic_items in items.values():
        assert len(topic_items) == 3
        for item in topic_items:
            result = run_query(fixture, item["answer_key"])
            assert result.rows, item["answer_key"]
            has_order_by = re.search(r"\bORDER BY\b", item["answer_key"]) is not None
            assert item["ordered"] == has_order_by, item["answer_key"]
