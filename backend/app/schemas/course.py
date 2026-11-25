from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.user import Language

Title = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]


class CourseCreate(BaseModel):
    title: Title
    language: Language


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    language: Language


class TopicCreate(BaseModel):
    title: Title
    position: int = Field(ge=1)


class TopicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    position: int


class MaterialOut(BaseModel):
    id: int
    title: str
    chunks_count: int
