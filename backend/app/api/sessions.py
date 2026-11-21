from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.billing.limits import count_message
from app.llm import ChatMessage, LLMError
from app.models import Course, Message, StudySession, Topic
from app.orchestrator.graph import run_turn
from app.orchestrator.state import PERSISTED_FIELDS, SessionState
from app.schemas.session import MessageCreate, MessageOut, SessionCreate, SessionOut

router = APIRouter(prefix="/sessions", tags=["sessions"])

HISTORY_SIZE = 6


def get_own_session(db: Session, session_id: int, user_id: int) -> StudySession:
    session = db.get(StudySession, session_id)
    # Someone else's session looks the same as a missing one.
    if session is None or session.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session_not_found")
    return session


def recent_history(db: Session, session_id: int) -> list[ChatMessage]:
    messages = db.scalars(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.id.desc())
        .limit(HISTORY_SIZE)
    ).all()
    history: list[ChatMessage] = [
        {"role": "user" if m.role == "user" else "assistant", "content": m.content}
        for m in reversed(messages)
    ]
    # The model expects the dialogue to start with the user.
    while history and history[0]["role"] == "assistant":
        history.pop(0)
    return history


@router.post("", status_code=status.HTTP_201_CREATED)
def create_session(data: SessionCreate, user: CurrentUser, db: DbSession) -> SessionOut:
    if db.get(Course, data.course_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "course_not_found")
    session = StudySession(user_id=user.id, course_id=data.course_id)
    db.add(session)
    db.commit()
    return SessionOut.model_validate(session)


@router.get("/{session_id}")
def read_session(session_id: int, user: CurrentUser, db: DbSession) -> SessionOut:
    return SessionOut.model_validate(get_own_session(db, session_id, user.id))


@router.get("/{session_id}/messages")
def list_messages(
    session_id: int, user: CurrentUser, db: DbSession
) -> list[MessageOut]:
    get_own_session(db, session_id, user.id)
    messages = db.scalars(
        select(Message).where(Message.session_id == session_id).order_by(Message.id)
    )
    return [MessageOut.model_validate(message) for message in messages]


@router.post("/{session_id}/messages", status_code=status.HTTP_201_CREATED)
def send_message(
    session_id: int, data: MessageCreate, user: CurrentUser, db: DbSession
) -> MessageOut:
    session = get_own_session(db, session_id, user.id)
    if data.topic_id is not None:
        topic = db.get(Topic, data.topic_id)
        if topic is None or topic.course_id != session.course_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "topic_not_found")

    # Raises 429 before any LLM call. Nothing is committed on an error below,
    # so a failed message is not counted.
    count_message(db, user.id)

    state: SessionState = {
        **session.state,
        "student_id": user.id,
        "session_id": session.id,
        "course_id": session.course_id,
        "language": user.language,
        "history": recent_history(db, session.id),
        "user_message": data.content,
        "action": data.action,
    }
    if data.topic_id is not None:
        state["current_topic_id"] = data.topic_id

    try:
        result = run_turn(db, state)
    except LLMError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "llm_unavailable"
        ) from None

    db.add(Message(session_id=session.id, role="user", content=data.content))
    db.flush()
    reply = result["reply"]
    answer = Message(
        session_id=session.id,
        role="assistant",
        agent=reply["agent"],
        content=reply["content"],
        citations=reply["citations"],
        ai_generated=True,
    )
    db.add(answer)
    session.state = {field: result.get(field) for field in PERSISTED_FIELDS}
    db.commit()
    return MessageOut.model_validate(answer)
