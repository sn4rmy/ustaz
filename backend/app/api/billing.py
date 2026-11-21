from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.billing import mock
from app.billing.limits import daily_limit, messages_used_today
from app.billing.plans import list_plans
from app.billing.subscriptions import get_subscription
from app.config import settings
from app.schemas.billing import MockCheckout, PlanInfo, SubscriptionOut

router = APIRouter(prefix="/billing", tags=["billing"])


def to_subscription_out(db: Session, user_id: int) -> SubscriptionOut:
    subscription = get_subscription(db, user_id)
    return SubscriptionOut(
        plan=subscription.plan,
        status=subscription.status,
        current_period_end=subscription.current_period_end,
        messages_used_today=messages_used_today(db, user_id),
        daily_message_limit=daily_limit(subscription.plan),
    )


@router.get("/plans")
def read_plans(user: CurrentUser) -> list[PlanInfo]:
    return list_plans()


@router.get("/subscription")
def read_subscription(user: CurrentUser, db: DbSession) -> SubscriptionOut:
    return to_subscription_out(db, user.id)


@router.post("/checkout")
def checkout(user: CurrentUser) -> MockCheckout:
    return MockCheckout()


@router.post("/mock/complete")
def complete_mock_checkout(user: CurrentUser, db: DbSession) -> SubscriptionOut:
    # Otherwise anyone could get Premium for free when real payments are on.
    if settings.payment_provider != "mock":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "not_found")
    mock.complete_checkout(db, user.id)
    db.commit()
    return to_subscription_out(db, user.id)
