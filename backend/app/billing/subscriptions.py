from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Subscription

# Payment provider statuses that keep Premium access (see docs/payments.md).
PREMIUM_STATUSES = {"active", "trialing", "past_due"}


def get_subscription(db: Session, user_id: int) -> Subscription:
    # Every user gets a free subscription row at registration (app/users.py).
    return db.scalars(select(Subscription).where(Subscription.user_id == user_id)).one()


def update_subscription(
    db: Session,
    user_id: int,
    status: str,
    provider: str,
    provider_subscription_id: str | None,
    current_period_end: datetime | None,
) -> Subscription:
    subscription = get_subscription(db, user_id)
    # The plan is always derived from the status here, so get_plan() in app/users.py
    # can read subscriptions.plan directly.
    subscription.plan = "premium" if status in PREMIUM_STATUSES else "free"
    subscription.status = status
    subscription.provider = provider
    subscription.provider_subscription_id = provider_subscription_id
    subscription.current_period_end = current_period_end
    return subscription
