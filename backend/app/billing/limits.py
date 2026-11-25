from datetime import UTC, date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.config import settings
from app.models import UsageDaily
from app.users import get_plan

# Kazakhstan has used a single UTC+5 zone without daylight saving time since 2024,
# so the daily limit resets at local midnight.
KAZAKHSTAN_TZ = timezone(timedelta(hours=5))


def kazakhstan_date(moment: datetime) -> date:
    return moment.astimezone(KAZAKHSTAN_TZ).date()


def today() -> date:
    return kazakhstan_date(datetime.now(UTC))


def daily_limit(plan: str) -> int | None:
    return settings.free_daily_message_limit if plan == "free" else None


def messages_used_today(db: Session, user_id: int) -> int:
    count = db.scalar(
        select(UsageDaily.messages_count).where(
            UsageDaily.user_id == user_id, UsageDaily.date == today()
        )
    )
    return count or 0


def count_message(db: Session, user_id: int) -> None:
    # Increase first, then check: two messages sent at the same moment can't both
    # slip under the limit. On 429 the caller doesn't commit, so the rejected
    # message is not counted.
    statement = (
        insert(UsageDaily)
        .values(user_id=user_id, date=today(), messages_count=1)
        .on_conflict_do_update(
            index_elements=[UsageDaily.user_id, UsageDaily.date],
            set_={"messages_count": UsageDaily.messages_count + 1},
        )
        .returning(UsageDaily.messages_count)
    )
    count = db.scalars(statement).one()
    limit = daily_limit(get_plan(db, user_id))
    if limit is not None and count > limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "daily_limit_reached")
