from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.config import settings

ALGORITHM = "HS256"
# bcrypt refuses longer passwords instead of silently cutting them.
PASSWORD_MAX_BYTES = 72


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    # Registration never accepts such passwords, so they can't match.
    if len(password.encode()) > PASSWORD_MAX_BYTES:
        return False
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user_id: int, token_type: str, lifetime: timedelta) -> str:
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "exp": datetime.now(UTC) + lifetime,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def create_access_token(user_id: int) -> str:
    lifetime = timedelta(minutes=settings.access_token_minutes)
    return create_token(user_id, "access", lifetime)


def create_refresh_token(user_id: int) -> str:
    lifetime = timedelta(days=settings.refresh_token_days)
    return create_token(user_id, "refresh", lifetime)


def user_id_from_token(token: str, token_type: str) -> int | None:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[ALGORITHM],
            options={"require": ["sub", "type", "exp"]},
        )
    except jwt.InvalidTokenError:
        return None
    # Otherwise a long-lived refresh token could be used as an access token.
    if payload["type"] != token_type:
        return None
    return int(payload["sub"])
