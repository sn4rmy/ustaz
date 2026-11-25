from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import DbSession
from app.api.users import to_user_out
from app.models import User
from app.schemas.auth import (
    AccessToken,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
)
from app.schemas.user import UserOut
from app.security import (
    create_access_token,
    create_refresh_token,
    user_id_from_token,
    verify_password,
)
from app.users import create_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: DbSession) -> UserOut:
    try:
        user = create_user(db, data.email, data.password, data.name, data.language)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "email_taken") from None
    return to_user_out(db, user)


@router.post("/login")
def login(data: LoginRequest, db: DbSession) -> TokenPair:
    user = db.scalar(select(User).where(User.email == data.email))
    # One error for both cases, so the response doesn't reveal which e-mails exist.
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid_credentials")
    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh")
def refresh(data: RefreshRequest, db: DbSession) -> AccessToken:
    user_id = user_id_from_token(data.refresh_token, "refresh")
    if user_id is None or db.get(User, user_id) is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid_token")
    return AccessToken(access_token=create_access_token(user_id))
