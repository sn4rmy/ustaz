import sqlite3
import time
from collections import Counter
from dataclasses import dataclass
from typing import TypedDict

Cell = str | int | float | None

TIME_LIMIT_SECONDS = 2.0
MAX_ROWS = 1000
# Longest string or blob a query may build, so it can't eat the server's memory.
MAX_VALUE_BYTES = 1_000_000
# The progress handler runs after this many SQLite VM instructions.
PROGRESS_STEPS = 10_000
# Whitelist: anything that writes, attaches a file or changes settings is denied.
ALLOWED_ACTIONS = {
    sqlite3.SQLITE_SELECT,
    sqlite3.SQLITE_READ,
    sqlite3.SQLITE_FUNCTION,
    sqlite3.SQLITE_RECURSIVE,
}
# Results computed in different ways may differ in the last digits.
FLOAT_DIGITS = 6


class SandboxError(Exception):
    pass


@dataclass
class QueryResult:
    columns: list[str]
    rows: list[tuple[Cell, ...]]


class TableSchema(TypedDict):
    table: str
    columns: list[str]


def authorize(action: int, *args: str | None) -> int:
    return sqlite3.SQLITE_OK if action in ALLOWED_ACTIONS else sqlite3.SQLITE_DENY


def to_cell(value: Cell | bytes) -> Cell:
    # Blobs can't go into JSON.
    if isinstance(value, bytes):
        return value.hex()
    return value


def run_query(fixture: str, query: str) -> QueryResult:
    # A new in-memory database for every query: nothing a query does can outlive it,
    # and the main database is never reachable from here.
    conn = sqlite3.connect(":memory:")
    try:
        # The fixture is ours and trusted, so it runs before the limits are set.
        conn.executescript(fixture)
        conn.set_authorizer(authorize)
        conn.setlimit(sqlite3.SQLITE_LIMIT_LENGTH, MAX_VALUE_BYTES)
        deadline = time.monotonic() + TIME_LIMIT_SECONDS
        conn.set_progress_handler(
            lambda: int(time.monotonic() > deadline), PROGRESS_STEPS
        )

        try:
            cursor = conn.execute(query)
            rows = cursor.fetchmany(MAX_ROWS + 1)
        except sqlite3.Error as error:
            raise SandboxError(error_text(error)) from None

        if cursor.description is None:
            raise SandboxError("the query returned no result")
        if len(rows) > MAX_ROWS:
            raise SandboxError(f"the result has more than {MAX_ROWS} rows")
        columns = [column[0] for column in cursor.description]
        return QueryResult(columns, [tuple(to_cell(v) for v in row) for row in rows])
    finally:
        conn.close()


def error_text(error: sqlite3.Error) -> str:
    message = str(error)
    if message == "interrupted":
        return f"the query took longer than {TIME_LIMIT_SECONDS:g} seconds"
    if message == "not authorized":
        return "only SELECT and WITH queries are allowed"
    return message


def describe(fixture: str) -> list[TableSchema]:
    conn = sqlite3.connect(":memory:")
    try:
        conn.executescript(fixture)
        tables = conn.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid"
        ).fetchall()
        return [
            {
                "table": table,
                "columns": [
                    f"{name} {type_}"
                    for name, type_ in conn.execute(
                        "SELECT name, type FROM pragma_table_info(?)", (table,)
                    )
                ],
            }
            for (table,) in tables
        ]
    finally:
        conn.close()


def normalize(row: tuple[Cell, ...]) -> tuple[Cell, ...]:
    return tuple(round(v, FLOAT_DIGITS) if isinstance(v, float) else v for v in row)


def compare(student: QueryResult, reference: QueryResult, ordered: bool) -> bool:
    # Column names are not compared: COUNT(*) and "COUNT(*) AS total" are the same
    # answer. The number and order of columns are.
    if len(student.columns) != len(reference.columns):
        return False
    student_rows = [normalize(row) for row in student.rows]
    reference_rows = [normalize(row) for row in reference.rows]
    if ordered:
        return student_rows == reference_rows
    return Counter(student_rows) == Counter(reference_rows)
