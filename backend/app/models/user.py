# Module import on purpose: in `date: Mapped[date]` the field would shadow the type.
import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(100))
    language: Mapped[str] = mapped_column(String(2))
    role: Mapped[str] = mapped_column(String(20), server_default="student")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    # One row per user, updated by the payment webhook. No row means the free plan.
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    plan: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20))
    provider: Mapped[str] = mapped_column(String(20))
    provider_subscription_id: Mapped[str | None] = mapped_column(
        String(100), unique=True
    )
    current_period_end: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True)
    )


class UsageDaily(Base):
    __tablename__ = "usage_daily"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    date: Mapped[datetime.date] = mapped_column(primary_key=True)
    messages_count: Mapped[int] = mapped_column(server_default="0")
