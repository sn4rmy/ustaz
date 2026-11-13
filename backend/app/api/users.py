from fastapi import APIRouter
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.models import User
from app.schemas.user import UserOut, UserUpdate
from app.users import get_plan

router = APIRouter(prefix="/users", tags=["users"])


def to_user_out(db: Session, user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        language=user.language,
        role=user.role,
        plan=get_plan(db, user.id),
    )


@router.get("/me")
def read_me(user: CurrentUser, db: DbSession) -> UserOut:
    return to_user_out(db, user)


@router.patch("/me")
def update_me(data: UserUpdate, user: CurrentUser, db: DbSession) -> UserOut:
    if data.name is not None:
        user.name = data.name
    if data.language is not None:
        user.language = data.language
    db.commit()
    return to_user_out(db, user)
