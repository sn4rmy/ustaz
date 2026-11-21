from app.billing.limits import daily_limit
from app.schemas.billing import PlanInfo, Price

# Shown on the pricing page. With Paddle the charged amount comes from the Paddle price.
PREMIUM_PRICE = Price(amount="4.99", currency="USD", interval="month")


def list_plans() -> list[PlanInfo]:
    return [
        PlanInfo(code="free", daily_message_limit=daily_limit("free"), price=None),
        PlanInfo(code="premium", daily_message_limit=None, price=PREMIUM_PRICE),
    ]
