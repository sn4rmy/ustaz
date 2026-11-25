from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.billing import mock, paddle
from app.billing.limits import daily_limit, messages_used_today
from app.billing.plans import list_plans
from app.billing.subscriptions import get_subscription
from app.config import settings
from app.schemas.billing import (
    MockCheckout,
    PaddleCheckout,
    PlanInfo,
    SubscriptionOut,
)

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
def checkout(user: CurrentUser) -> PaddleCheckout | MockCheckout:
    if settings.payment_provider == "paddle":
        return paddle.checkout_data(user)
    return MockCheckout()


@router.post("/mock/complete")
def complete_mock_checkout(user: CurrentUser, db: DbSession) -> SubscriptionOut:
    # Otherwise anyone could get Premium for free when real payments are on.
    if settings.payment_provider != "mock":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "not_found")
    mock.complete_checkout(db, user.id)
    db.commit()
    return to_subscription_out(db, user.id)


# The body can only be read with await, so this small dependency is async while
# the endpoint stays sync like the others.
async def raw_body(request: Request) -> bytes:
    return await request.body()


@router.post("/webhook")
def paddle_webhook(
    body: Annotated[bytes, Depends(raw_body)],
    db: DbSession,
    paddle_signature: Annotated[str | None, Header()] = None,
) -> dict[str, bool]:
    # The signature covers the exact bytes Paddle sent, so it is checked on the raw
    # body before any JSON parsing.
    secret = settings.paddle_webhook_secret
    if not paddle.verify_signature(body, paddle_signature, secret):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid_signature")
    paddle.handle_event(db, body)
    db.commit()
    return {"received": True}
