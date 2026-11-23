from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.sandbox import Cell, TableSchema

AnswerText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)
]


class NextItemRequest(BaseModel):
    topic_id: int


class ItemOut(BaseModel):
    id: int
    topic_id: int
    type: str
    prompt: str
    # "schema" is taken by BaseModel, so the field has another name in Python.
    table_schema: list[TableSchema] = Field(serialization_alias="schema")
    difficulty: int


class AttemptCreate(BaseModel):
    item_id: int
    answer: AnswerText


class AttemptOut(BaseModel):
    attempt_id: int
    correct: bool
    score: float
    feedback_code: Literal["correct", "wrong_result", "sql_error"]
    columns: list[str]
    rows: list[list[Cell]]
    error: str | None
