import random
from dataclasses import dataclass, field
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Attempt, Item
from app.sandbox import Cell, SandboxError, compare, run_query

FeedbackCode = Literal["correct", "wrong_result", "sql_error"]

# The student sees at most this many rows of their result.
SHOWN_ROWS = 50


@dataclass
class GradeResult:
    correct: bool
    score: float
    feedback_code: FeedbackCode
    # Result of the student's query, not of the answer key.
    columns: list[str]
    rows: list[tuple[Cell, ...]]
    error: str | None = None
    # Filled when the Examiner learns to diagnose errors (M3).
    misconception_tags: list[str] = field(default_factory=list)


def next_item(db: Session, topic_id: int, user_id: int) -> Item | None:
    items = db.scalars(select(Item).where(Item.topic_id == topic_id)).all()
    if not items:
        return None
    solved = set(
        db.scalars(
            select(Attempt.item_id).where(Attempt.user_id == user_id, Attempt.correct)
        )
    )
    unsolved = [item for item in items if item.id not in solved]
    if not unsolved:
        return random.choice(items)
    easiest = min(item.difficulty for item in unsolved)
    return random.choice([item for item in unsolved if item.difficulty == easiest])


def grade(item: Item, answer: str) -> GradeResult:
    # M2 has only sql_query items; they are graded by running the query, no LLM.
    if item.type != "sql_query" or item.fixture is None:
        raise ValueError(f"item {item.id} is not an SQL task")

    try:
        student = run_query(item.fixture, answer)
    except SandboxError as error:
        return GradeResult(False, 0.0, "sql_error", [], [], str(error))

    # A broken answer key is our bug, so its error is not caught here.
    reference = run_query(item.fixture, item.answer_key)
    correct = compare(student, reference, item.ordered)
    return GradeResult(
        correct=correct,
        score=1.0 if correct else 0.0,
        feedback_code="correct" if correct else "wrong_result",
        columns=student.columns,
        rows=student.rows[:SHOWN_ROWS],
    )
