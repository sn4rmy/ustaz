from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Subscription, User
from app.security import hash_password


def create_user(
    db: Session,
    email: str,
    password: str,
    name: str,
    language: str,
    role: str = "student",
) -> User:
    user = User(
        email=email,
        password_hash=hash_password(password),
        name=name,
        language=language,
        role=role,
    )
    db.add(user)
    # Gives user.id, and raises IntegrityError here if the e-mail is taken.
    db.flush()
    db.add(Subscription(user_id=user.id, plan="free", status="active", provider="none"))
    return user


def get_plan(db: Session, user_id: int) -> str:
    plan = db.scalar(select(Subscription.plan).where(Subscription.user_id == user_id))
    return plan or "free"
