from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints

MessageText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)
]


class SessionCreate(BaseModel):
    course_id: int


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    created_at: datetime


class MessageCreate(BaseModel):
    content: MessageText
    topic_id: int | None = None
    action: Literal["explain", "hint"] | None = None


class Citation(BaseModel):
    material_id: int
    material_title: str
    chunk_id: int


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    agent: str | None
    content: str
    citations: list[Citation]
    ai_generated: bool
    created_at: datetime
