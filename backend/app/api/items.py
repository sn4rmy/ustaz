from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.api.sessions import get_own_session
from app.models import Item, Topic
from app.orchestrator.tasks import give_item, submit_attempt
from app.sandbox import describe
from app.schemas.item import AttemptCreate, AttemptOut, ItemOut, NextItemRequest

router = APIRouter(prefix="/sessions", tags=["items"])


# The answer key is left out here, and this is the only way an item leaves the API.
def to_item_out(item: Item) -> ItemOut:
    return ItemOut(
        id=item.id,
        topic_id=item.topic_id,
        type=item.type,
        prompt=item.prompt,
        table_schema=describe(item.fixture) if item.fixture else [],
        difficulty=item.difficulty,
    )


@router.post("/{session_id}/items/next")
def next_item(
    session_id: int, data: NextItemRequest, user: CurrentUser, db: DbSession
) -> ItemOut:
    session = get_own_session(db, session_id, user.id)
    topic = db.get(Topic, data.topic_id)
    if topic is None or topic.course_id != session.course_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "topic_not_found")

    item = give_item(db, session, user.id, topic.id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no_items")
    db.commit()
    return to_item_out(item)


@router.post("/{session_id}/attempts", status_code=status.HTTP_201_CREATED)
def create_attempt(
    session_id: int, data: AttemptCreate, user: CurrentUser, db: DbSession
) -> AttemptOut:
    session = get_own_session(db, session_id, user.id)
    item = db.scalar(
        select(Item)
        .join(Topic)
        .where(Item.id == data.item_id, Topic.course_id == session.course_id)
    )
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item_not_found")

    # No LLM call here, so attempts don't count toward the daily message limit.
    attempt, result = submit_attempt(db, session, user.id, item, data.answer)
    db.commit()
    return AttemptOut(
        attempt_id=attempt.id,
        correct=result.correct,
        score=result.score,
        feedback_code=result.feedback_code,
        columns=result.columns,
        rows=[list(row) for row in result.rows],
        error=result.error,
    )
