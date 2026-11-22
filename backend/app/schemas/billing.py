from datetime import datetime
from typing import Literal

from pydantic import BaseModel

Plan = Literal["free", "premium"]


class Price(BaseModel):
    # A string, so the amount is shown exactly as set, without float rounding.
    amount: str
    currency: str
    interval: Literal["month"]


class PlanInfo(BaseModel):
    code: Plan
    daily_message_limit: int | None
    price: Price | None


class SubscriptionOut(BaseModel):
    plan: Plan
    status: str
    current_period_end: datetime | None
    messages_used_today: int
    daily_message_limit: int | None


class MockCheckout(BaseModel):
    provider: Literal["mock"] = "mock"


class PaddleCheckout(BaseModel):
    provider: Literal["paddle"] = "paddle"
    environment: Literal["sandbox", "production"]
    client_token: str
    price_id: str
    custom_data: dict[str, str]
