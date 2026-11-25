from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

# SQLAlchemy 2.1 uses psycopg 3 for plain postgresql:// URLs.
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(engine)


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db
