from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.billing.subscriptions import update_subscription
from app.models import Subscription

# Same period as the monthly Paddle price. Nothing turns the mock Premium off later:
# without a provider there is no webhook to do it.
MOCK_PERIOD = timedelta(days=30)


def complete_checkout(db: Session, user_id: int) -> Subscription:
    return update_subscription(
        db,
        user_id,
        status="active",
        provider="mock",
        provider_subscription_id=None,
        current_period_end=datetime.now(UTC) + MOCK_PERIOD,
    )
