from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AgentTrace(Base):
    __tablename__ = "agent_traces"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("sessions.id", ondelete="CASCADE"), index=True
    )
    agent: Mapped[str] = mapped_column(String(20))
    input: Mapped[dict] = mapped_column(JSONB)
    output: Mapped[dict] = mapped_column(JSONB)
    # Empty when the agent made no LLM call, e.g. Examiner grading in the sandbox.
    model: Mapped[str | None] = mapped_column(String(100))
    tokens_in: Mapped[int] = mapped_column(server_default="0")
    tokens_out: Mapped[int] = mapped_column(server_default="0")
    latency_ms: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
