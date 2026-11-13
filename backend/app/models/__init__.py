# Importing every model registers its table in Base.metadata, which Alembic reads.
from app.models.agent_trace import AgentTrace
from app.models.base import Base
from app.models.course import Chunk, Course, Material, Topic
from app.models.item import Attempt, Item
from app.models.study_session import Message, StudySession
from app.models.user import Subscription, UsageDaily, User

__all__ = [
    "AgentTrace",
    "Attempt",
    "Base",
    "Chunk",
    "Course",
    "Item",
    "Material",
    "Message",
    "StudySession",
    "Subscription",
    "Topic",
    "UsageDaily",
    "User",
]
