from typing import TypedDict

from app.agents.teacher import Citation, TeacherMode
from app.llm import ChatMessage

# Fields kept in sessions.state between messages. The rest live for one message.
PERSISTED_FIELDS = ("current_topic_id", "pending_item_id", "last_grade", "mastery")


class Reply(TypedDict):
    agent: str
    content: str
    citations: list[Citation]


class SessionState(TypedDict, total=False):
    student_id: int
    session_id: int
    course_id: int
    language: str
    current_topic_id: int | None
    mode: TeacherMode
    # Filled by the Mentor in M3.
    mastery: dict[str, float]
    pending_item_id: int | None
    # Grade of the last attempt without the answer key; filled by the Examiner in M3.
    last_grade: dict | None
    # Last messages of the session instead of an LLM-written summary.
    history: list[ChatMessage]
    user_message: str
    # Quick action from the interface; the code may override it in route.
    action: TeacherMode | None
    teacher_output: Reply
    reply: Reply
