from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.billing.limits import (
    count_message,
    kazakhstan_date,
    messages_used_today,
    today,
)
from app.config import settings
from app.models import UsageDaily

STUDENT = {
    "email": "student@example.com",
    "password": "secret123",
    "name": "Aliya",
    "language": "ru",
}


def student_headers(client: TestClient) -> dict[str, str]:
    client.post("/api/auth/register", json=STUDENT)
    credentials = {"email": STUDENT["email"], "password": STUDENT["password"]}
    tokens = client.post("/api/auth/login", json=credentials).json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_plans_list_free_limit_and_premium_price(client: TestClient) -> None:
    response = client.get("/api/billing/plans", headers=student_headers(client))

    assert response.status_code == 200
    assert response.json() == [
        {"code": "free", "daily_message_limit": 20, "price": None},
        {
            "code": "premium",
            "daily_message_limit": None,
            "price": {"amount": "4.99", "currency": "USD", "interval": "month"},
        },
    ]


def test_new_user_has_free_subscription(client: TestClient) -> None:
    response = client.get("/api/billing/subscription", headers=student_headers(client))

    assert response.status_code == 200
    assert response.json() == {
        "plan": "free",
        "status": "active",
        "current_period_end": None,
        "messages_used_today": 0,
        "daily_message_limit": 20,
    }


def test_checkout_with_mock_provider(client: TestClient) -> None:
    response = client.post("/api/billing/checkout", headers=student_headers(client))

    assert response.status_code == 200
    assert response.json() == {"provider": "mock"}


def test_mock_payment_switches_user_to_premium(client: TestClient) -> None:
    headers = student_headers(client)

    response = client.post("/api/billing/mock/complete", headers=headers)

    assert response.status_code == 200
    subscription = response.json()
    assert subscription["plan"] == "premium"
    assert subscription["daily_message_limit"] is None
    assert subscription["current_period_end"] is not None
    me = client.get("/api/users/me", headers=headers)
    assert me.json()["plan"] == "premium"


def test_mock_payment_is_not_found_with_real_provider(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = student_headers(client)
    monkeypatch.setattr(settings, "payment_provider", "paddle")

    response = client.post("/api/billing/mock/complete", headers=headers)

    assert response.status_code == 404
    me = client.get("/api/users/me", headers=headers)
    assert me.json()["plan"] == "free"


def test_free_user_is_stopped_after_daily_limit(
    client: TestClient, test_engine: Engine
) -> None:
    student_headers(client)

    with Session(test_engine) as db:
        for _ in range(20):
            count_message(db, 1)
            db.commit()
        with pytest.raises(HTTPException) as error:
            count_message(db, 1)
        db.rollback()

        assert error.value.status_code == 429
        assert error.value.detail == "daily_limit_reached"
        # The rejected message is not counted.
        assert messages_used_today(db, 1) == 20


def test_premium_user_has_no_daily_limit(
    client: TestClient, test_engine: Engine
) -> None:
    client.post("/api/billing/mock/complete", headers=student_headers(client))

    with Session(test_engine) as db:
        for _ in range(25):
            count_message(db, 1)
        db.commit()

        assert messages_used_today(db, 1) == 25


def test_messages_from_yesterday_are_not_counted(
    client: TestClient, test_engine: Engine
) -> None:
    headers = student_headers(client)
    with Session(test_engine) as db:
        yesterday = today() - timedelta(days=1)
        db.add(UsageDaily(user_id=1, date=yesterday, messages_count=20))
        db.commit()

        count_message(db, 1)
        db.commit()

    response = client.get("/api/billing/subscription", headers=headers)
    assert response.json()["messages_used_today"] == 1


def test_day_changes_at_midnight_in_kazakhstan() -> None:
    before_midnight = datetime(2026, 11, 21, 18, 59, tzinfo=UTC)
    after_midnight = datetime(2026, 11, 21, 19, 0, tzinfo=UTC)

    assert kazakhstan_date(before_midnight) == date(2026, 11, 21)
    assert kazakhstan_date(after_midnight) == date(2026, 11, 22)
