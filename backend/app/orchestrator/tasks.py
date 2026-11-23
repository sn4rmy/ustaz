import time

from sqlalchemy.orm import Session

from app.agents.examiner import GradeResult, grade, next_item
from app.models import AgentTrace, Attempt, Item, StudySession

# Tasks are not chat messages, so they go past the LangGraph graph, but the Examiner
# is still called only from the orchestrator and every call is traced.


def add_examiner_trace(
    db: Session, session_id: int, data: dict, output: dict, started: float
) -> None:
    db.add(
        AgentTrace(
            session_id=session_id,
            agent="examiner",
            input=data,
            output=output,
            model=None,
            latency_ms=round((time.monotonic() - started) * 1000),
        )
    )


def give_item(
    db: Session, session: StudySession, user_id: int, topic_id: int
) -> Item | None:
    started = time.monotonic()
    item = next_item(db, topic_id, user_id)
    if item is None:
        return None

    add_examiner_trace(
        db,
        session.id,
        {"action": "next_item", "topic_id": topic_id},
        {"item_id": item.id},
        started,
    )
    # A new dict, so SQLAlchemy notices the change of the JSONB column.
    session.state = {
        **session.state,
        "current_topic_id": topic_id,
        "pending_item_id": item.id,
    }
    return item


def submit_attempt(
    db: Session, session: StudySession, user_id: int, item: Item, answer: str
) -> tuple[Attempt, GradeResult]:
    started = time.monotonic()
    result = grade(item, answer)
    attempt = Attempt(
        user_id=user_id,
        item_id=item.id,
        answer=answer,
        correct=result.correct,
        score=result.score,
        misconception_tags=result.misconception_tags,
    )
    db.add(attempt)
    db.flush()

    add_examiner_trace(
        db,
        session.id,
        {"action": "grade", "item_id": item.id, "answer": answer},
        {
            "attempt_id": attempt.id,
            "correct": result.correct,
            "feedback_code": result.feedback_code,
            "error": result.error,
        },
        started,
    )
    # After a wrong answer the task stays open, so the student can try again.
    pending_item_id = session.state.get("pending_item_id")
    if result.correct and pending_item_id == item.id:
        pending_item_id = None
    session.state = {
        **session.state,
        "pending_item_id": pending_item_id,
        # Without the answer key: the Teacher may read it in M3 (review_error).
        "last_grade": {
            "item_id": item.id,
            "correct": result.correct,
            "feedback_code": result.feedback_code,
        },
    }
    return attempt, result
