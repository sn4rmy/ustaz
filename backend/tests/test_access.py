import base64
import json
import re
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, delete
from sqlalchemy.orm import Session

from app.main import app
from app.models import User
from app.security import create_token

STUDENT = {
    "email": "student@example.com",
    "password": "secret123",
    "name": "Aliya",
    "language": "ru",
}
PUBLIC_PATHS = {
    "/api/health",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/billing/webhook",
}


# Taken from the app itself, so a new endpoint is checked as soon as it is added.
def protected_endpoints() -> list[tuple[str, str]]:
    paths = app.openapi()["paths"]
    return [
        (method.upper(), path)
        for path, methods in paths.items()
        if path not in PUBLIC_PATHS
        for method in methods
    ]


def login(client: TestClient) -> dict[str, str]:
    client.post("/api/auth/register", json=STUDENT)
    credentials = {"email": STUDENT["email"], "password": STUDENT["password"]}
    return client.post("/api/auth/login", json=credentials).json()


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def base64url(data: dict[str, Any]) -> str:
    raw = json.dumps(data).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


@pytest.mark.parametrize(("method", "path"), protected_endpoints())
def test_endpoint_without_token_returns_401(method: str, path: str) -> None:
    # No database needed: requests without a token are rejected before any query.
    # Server errors become responses, so an unprotected endpoint fails the assert.
    client = TestClient(app, raise_server_exceptions=False)
    url = re.sub(r"\{\w+\}", "1", path)

    response = client.request(method, url)

    assert response.status_code == 401
    assert response.json() == {"detail": "not_authenticated"}


def test_expired_access_token_returns_401() -> None:
    token = create_token(1, "access", timedelta(minutes=-1))

    response = TestClient(app).get("/api/users/me", headers=bearer(token))

    assert response.status_code == 401
    assert response.json() == {"detail": "invalid_token"}


def forged_with_other_secret() -> str:
    payload = {
        "sub": "1",
        "type": "access",
        "exp": datetime.now(UTC) + timedelta(minutes=5),
    }
    return jwt.encode(payload, "another-secret-at-least-32-bytes-long", "HS256")


def forged_without_signature() -> str:
    # The classic "alg: none" attack: a token that claims it needs no signature.
    header = base64url({"alg": "none", "typ": "JWT"})
    expires = int((datetime.now(UTC) + timedelta(minutes=5)).timestamp())
    payload = base64url({"sub": "1", "type": "access", "exp": expires})
    return f"{header}.{payload}."


@pytest.mark.parametrize(
    "token",
    [forged_with_other_secret(), forged_without_signature()],
    ids=["other_secret", "alg_none"],
)
def test_forged_token_returns_401(token: str) -> None:
    response = TestClient(app).get("/api/users/me", headers=bearer(token))

    assert response.status_code == 401
    assert response.json() == {"detail": "invalid_token"}


def test_tokens_of_deleted_user_stop_working(
    client: TestClient, test_engine: Engine
) -> None:
    tokens = login(client)
    with Session(test_engine) as db:
        db.execute(delete(User))
        db.commit()

    me = client.get("/api/users/me", headers=bearer(tokens["access_token"]))
    refresh = client.post(
        "/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )

    assert me.status_code == 401
    assert me.json() == {"detail": "invalid_token"}
    assert refresh.status_code == 401
    assert refresh.json() == {"detail": "invalid_token"}


ADMIN_REQUESTS = {
    "create_course": (
        "/api/courses",
        {"json": {"title": "SQL", "language": "ru"}},
    ),
    "create_topic": (
        "/api/courses/1/topics",
        {"json": {"title": "JOIN", "position": 1}},
    ),
    "upload_material": (
        "/api/courses/1/materials",
        {
            "data": {"title": "Notes"},
            "files": {"file": ("notes.md", b"# Notes", "text/markdown")},
        },
    ),
}


@pytest.mark.parametrize("name", ADMIN_REQUESTS)
def test_student_cannot_use_admin_endpoints(client: TestClient, name: str) -> None:
    url, body = ADMIN_REQUESTS[name]
    headers = bearer(login(client)["access_token"])

    response = client.post(url, headers=headers, **body)

    assert response.status_code == 403
    assert response.json() == {"detail": "admin_required"}
