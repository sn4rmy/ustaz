from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints

Language = Literal["kk", "ru", "en"]
Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    language: Language
    role: Literal["student", "admin"]
    plan: Literal["free", "premium"]


class UserUpdate(BaseModel):
    name: Name | None = None
    language: Language | None = None
