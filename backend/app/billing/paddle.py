import hashlib
import hmac
import time
from datetime import datetime
from typing import Any

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.billing.subscriptions import update_subscription
from app.config import settings
from app.models import User
from app.schemas.billing import PaddleCheckout

# Paddle's default. An older signature may belong to a captured request sent again.
MAX_SIGNATURE_AGE_SECONDS = 5
# Cancellations, pauses and renewals also come as subscription.updated.
SUBSCRIPTION_EVENTS = {"subscription.created", "subscription.updated"}


class BillingPeriod(BaseModel):
    ends_at: datetime


class PaddleSubscription(BaseModel):
    id: str
    status: str
    custom_data: dict[str, Any] | None = None
    current_billing_period: BillingPeriod | None = None


class PaddleEvent(BaseModel):
    event_type: str
    data: dict[str, Any]


def checkout_data(user: User) -> PaddleCheckout:
    return PaddleCheckout(
        environment=settings.paddle_environment,
        client_token=settings.paddle_client_token,
        price_id=settings.paddle_price_id,
        custom_data={"user_id": str(user.id)},
    )


def verify_signature(body: bytes, header: str | None, secret: str | None) -> bool:
    if not header or not secret:
        return False

    timestamp = ""
    signatures = []
    for part in header.split(";"):
        key, _, value = part.partition("=")
        if key == "ts":
            timestamp = value
        elif key == "h1":
            # More than one h1 is sent while the secret is being rotated.
            signatures.append(value)

    if not timestamp.isdigit():
        return False
    if abs(time.time() - int(timestamp)) > MAX_SIGNATURE_AGE_SECONDS:
        return False

    signed_payload = timestamp.encode() + b":" + body
    expected = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    # compare_digest takes the same time wherever the strings differ, so response
    # timing doesn't reveal how much of a forged signature was right.
    return any(hmac.compare_digest(expected, signature) for signature in signatures)


def handle_event(db: Session, body: bytes) -> None:
    event = PaddleEvent.model_validate_json(body)
    if event.event_type not in SUBSCRIPTION_EVENTS:
        return

    subscription = PaddleSubscription.model_validate(event.data)
    user_id = (subscription.custom_data or {}).get("user_id")
    # A subscription made outside our checkout has no user of ours. It is skipped,
    # not rejected, so Paddle doesn't keep resending it.
    if user_id is None or db.get(User, int(user_id)) is None:
        return

    period = subscription.current_billing_period
    update_subscription(
        db,
        int(user_id),
        status=subscription.status,
        provider="paddle",
        provider_subscription_id=subscription.id,
        current_period_end=period.ends_at if period else None,
    )
