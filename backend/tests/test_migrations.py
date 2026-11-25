import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, create_engine, inspect, pool, text
from sqlalchemy.engine import make_url

from app.config import settings

SERVER_URL = os.environ.get("TEST_DATABASE_URL")
TEST_DB_NAME = "ustaz_migration_test"
ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"
TABLES = {
    "users",
    "subscriptions",
    "usage_daily",
    "courses",
    "topics",
    "materials",
    "chunks",
    "sessions",
    "messages",
    "items",
    "attempts",
    "agent_traces",
}

pytestmark = pytest.mark.skipif(
    SERVER_URL is None, reason="TEST_DATABASE_URL is not set"
)


@pytest.fixture
def empty_database_url(monkeypatch: pytest.MonkeyPatch) -> Iterator[str]:
    # A separate database, so the test never touches development data.
    server = create_engine(
        SERVER_URL, isolation_level="AUTOCOMMIT", poolclass=pool.NullPool
    )
    with server.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {TEST_DB_NAME} WITH (FORCE)"))
        conn.execute(text(f"CREATE DATABASE {TEST_DB_NAME}"))

    url = make_url(SERVER_URL).set(database=TEST_DB_NAME)
    url_string = url.render_as_string(hide_password=False)
    # alembic/env.py takes the database URL from settings.
    monkeypatch.setattr(settings, "database_url", url_string)
    yield url_string

    with server.connect() as conn:
        conn.execute(text(f"DROP DATABASE {TEST_DB_NAME} WITH (FORCE)"))


def vector_extension_installed(conn: Connection) -> bool:
    query = text("SELECT count(*) FROM pg_extension WHERE extname = 'vector'")
    return conn.scalar(query) == 1


def test_upgrade_creates_tables_and_downgrade_removes_them(
    empty_database_url: str,
) -> None:
    config = Config(ALEMBIC_INI)
    engine = create_engine(empty_database_url, poolclass=pool.NullPool)

    command.upgrade(config, "head")
    with engine.connect() as conn:
        assert set(inspect(conn).get_table_names()) == TABLES | {"alembic_version"}
        assert vector_extension_installed(conn)

    command.downgrade(config, "base")
    with engine.connect() as conn:
        assert set(inspect(conn).get_table_names()) == {"alembic_version"}
        assert not vector_extension_installed(conn)
