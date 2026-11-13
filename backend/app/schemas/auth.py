from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, Field, StringConstraints

from app.schemas.user import Language, Name
from app.security import PASSWORD_MAX_BYTES

# A light check instead of EmailStr, which needs the extra email-validator package.
# Lowercase, so "Aliya@Mail.com" and "aliya@mail.com" are one account.
Email = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        max_length=255,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    ),
]


def check_password_bytes(password: str) -> str:
    if len(password.encode()) > PASSWORD_MAX_BYTES:
        raise ValueError(f"password must be at most {PASSWORD_MAX_BYTES} bytes")
    return password


Password = Annotated[str, Field(min_length=8), AfterValidator(check_password_bytes)]


class RegisterRequest(BaseModel):
    email: Email
    password: Password
    name: Name
    language: Language


class LoginRequest(BaseModel):
    email: Email
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"


class AccessToken(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
