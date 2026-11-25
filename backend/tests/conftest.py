import os

# Settings are read when app.main is imported, so test values must be set first.
# Fake providers keep tests offline.
os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test"
os.environ["JWT_SECRET"] = "test-secret-at-least-32-bytes-long"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["LLM_PROVIDER"] = "fake"
os.environ["PAYMENT_PROVIDER"] = "mock"

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, pool, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.db import get_db
from app.main import app
from app.models import Base

TEST_SERVER_URL = os.environ.get("TEST_DATABASE_URL")
TEST_DB_NAME = "ustaz_test"


@pytest.fixture(scope="session")
def test_engine() -> Iterator[Engine]:
    if TEST_SERVER_URL is None:
        pytest.skip("TEST_DATABASE_URL is not set")

    # A separate database, so tests never touch development data.
    server = create_engine(
        TEST_SERVER_URL, isolation_level="AUTOCOMMIT", poolclass=pool.NullPool
    )
    with server.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {TEST_DB_NAME} WITH (FORCE)"))
        conn.execute(text(f"CREATE DATABASE {TEST_DB_NAME}"))

    # Tables come from the models; test_migrations checks the migrations themselves.
    engine = create_engine(make_url(TEST_SERVER_URL).set(database=TEST_DB_NAME))
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION vector"))
    Base.metadata.create_all(engine)
    yield engine

    engine.dispose()
    with server.connect() as conn:
        conn.execute(text(f"DROP DATABASE {TEST_DB_NAME} WITH (FORCE)"))


@pytest.fixture
def client(test_engine: Engine) -> Iterator[TestClient]:
    TestSession = sessionmaker(test_engine)

    def get_test_db() -> Iterator[Session]:
        with TestSession() as db:
            yield db

    app.dependency_overrides[get_db] = get_test_db
    yield TestClient(app)
    app.dependency_overrides.clear()

    # Every test starts with empty tables and ids from 1.
    tables = ", ".join(Base.metadata.tables)
    with test_engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
