import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from app.billing.paddle import verify_signature
from app.config import settings
from app.models import Subscription

SECRET = "pdl_ntfset_test_secret"
STUDENT = {
    "email": "student@example.com",
    "password": "secret123",
    "name": "Aliya",
    "language": "ru",
}


def sign(body: bytes, secret: str = SECRET, timestamp: int | None = None) -> str:
    ts = int(time.time()) if timestamp is None else timestamp
    payload = f"{ts}:".encode() + body
    digest = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return f"ts={ts};h1={digest}"


def subscription_event(
    event_type: str,
    status: str,
    user_id: str = "1",
    ends_at: str | None = "2026-12-22T09:00:00.000000Z",
) -> bytes:
    period = {"starts_at": "2026-11-22T09:00:00.000000Z", "ends_at": ends_at}
    event = {
        "event_id": "evt_01test",
        "event_type": event_type,
        "occurred_at": "2026-11-22T09:00:00.000000Z",
        "notification_id": "ntf_01test",
        "data": {
            "id": "sub_01test",
            "status": status,
            "customer_id": "ctm_01test",
            "custom_data": {"user_id": user_id},
            "current_billing_period": period if ends_at else None,
        },
    }
    return json.dumps(event).encode()


def send_webhook(client: TestClient, body: bytes, signature: str) -> Response:
    return client.post(
        "/api/billing/webhook", content=body, headers={"Paddle-Signature": signature}
    )


def student_headers(client: TestClient) -> dict[str, str]:
    client.post("/api/auth/register", json=STUDENT)
    credentials = {"email": STUDENT["email"], "password": STUDENT["password"]}
    tokens = client.post("/api/auth/login", json=credentials).json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.fixture
def paddle_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "payment_provider", "paddle")
    monkeypatch.setattr(settings, "paddle_client_token", "test_client_token")
    monkeypatch.setattr(settings, "paddle_price_id", "pri_test")
    monkeypatch.setattr(settings, "paddle_webhook_secret", SECRET)


def test_valid_signature_is_accepted() -> None:
    body = b'{"event_type": "subscription.created"}'

    assert verify_signature(body, sign(body), SECRET)


def test_signature_with_other_secret_is_rejected() -> None:
    body = b'{"event_type": "subscription.created"}'

    assert not verify_signature(body, sign(body, secret="other_secret"), SECRET)


def test_changed_body_is_rejected() -> None:
    body = b'{"event_type": "subscription.created"}'
    signature = sign(body)

    assert not verify_signature(body.replace(b"created", b"updated"), signature, SECRET)


def test_old_signature_is_rejected() -> None:
    body = b'{"event_type": "subscription.created"}'
    signature = sign(body, timestamp=int(time.time()) - 60)

    assert not verify_signature(body, signature, SECRET)


def test_missing_or_broken_signature_is_rejected() -> None:
    body = b'{"event_type": "subscription.created"}'

    assert not verify_signature(body, None, SECRET)
    assert not verify_signature(body, "garbage", SECRET)
    # Without a configured secret nothing can be verified.
    assert not verify_signature(body, sign(body), None)


def test_any_of_several_signatures_is_accepted() -> None:
    body = b'{"event_type": "subscription.created"}'
    ts, valid = sign(body).split(";")

    assert verify_signature(body, f"{ts};h1={'0' * 64};{valid}", SECRET)


@pytest.mark.usefixtures("paddle_settings")
def test_checkout_with_paddle_provider(client: TestClient) -> None:
    response = client.post("/api/billing/checkout", headers=student_headers(client))

    assert response.status_code == 200
    assert response.json() == {
        "provider": "paddle",
        "environment": "sandbox",
        "client_token": "test_client_token",
        "price_id": "pri_test",
        "custom_data": {"user_id": "1"},
    }


@pytest.mark.usefixtures("paddle_settings")
def test_subscription_created_switches_user_to_premium(
    client: TestClient, test_engine: Engine
) -> None:
    headers = student_headers(client)
    body = subscription_event("subscription.created", "active")

    response = send_webhook(client, body, sign(body))

    assert response.status_code == 200
    assert response.json() == {"received": True}
    subscription = client.get("/api/billing/subscription", headers=headers).json()
    assert subscription["plan"] == "premium"
    assert subscription["status"] == "active"
    assert subscription["current_period_end"] == "2026-12-22T09:00:00Z"
    assert subscription["daily_message_limit"] is None
    with Session(test_engine) as db:
        row = db.scalars(select(Subscription)).one()
    assert row.provider == "paddle"
    assert row.provider_subscription_id == "sub_01test"


@pytest.mark.usefixtures("paddle_settings")
def test_canceled_subscription_returns_user_to_free(client: TestClient) -> None:
    headers = student_headers(client)
    created = subscription_event("subscription.created", "active")
    canceled = subscription_event("subscription.updated", "canceled", ends_at=None)

    send_webhook(client, created, sign(created))
    response = send_webhook(client, canceled, sign(canceled))

    assert response.status_code == 200
    subscription = client.get("/api/billing/subscription", headers=headers).json()
    assert subscription["plan"] == "free"
    assert subscription["status"] == "canceled"
    assert subscription["daily_message_limit"] == 20


@pytest.mark.usefixtures("paddle_settings")
def test_webhook_with_invalid_signature_changes_nothing(client: TestClient) -> None:
    headers = student_headers(client)
    body = subscription_event("subscription.created", "active")

    response = send_webhook(client, body, sign(body, secret="other_secret"))

    assert response.status_code == 400
    assert response.json() == {"detail": "invalid_signature"}
    me = client.get("/api/users/me", headers=headers)
    assert me.json()["plan"] == "free"


@pytest.mark.usefixtures("paddle_settings")
def test_other_events_are_ignored(client: TestClient) -> None:
    headers = student_headers(client)
    body = subscription_event("transaction.completed", "completed")

    response = send_webhook(client, body, sign(body))

    assert response.status_code == 200
    me = client.get("/api/users/me", headers=headers)
    assert me.json()["plan"] == "free"


@pytest.mark.usefixtures("paddle_settings")
def test_event_for_unknown_user_is_ignored(client: TestClient) -> None:
    headers = student_headers(client)
    body = subscription_event("subscription.created", "active", user_id="999")

    response = send_webhook(client, body, sign(body))

    assert response.status_code == 200
    me = client.get("/api/users/me", headers=headers)
    assert me.json()["plan"] == "free"
