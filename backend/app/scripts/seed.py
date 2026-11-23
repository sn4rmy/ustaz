import json
from pathlib import Path

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Course, Item, Topic
from app.rag import add_material

COURSE_TITLE = "Базы данных (SQL)"
TOPICS = [
    "SELECT и WHERE",
    "Сортировка и LIMIT",
    "Агрегаты и GROUP BY",
    "JOIN",
    "Подзапросы",
]
SEED_DIR = Path(__file__).resolve().parents[2] / "seed"
MATERIALS_DIR = SEED_DIR / "materials"
FIXTURE_PATH = SEED_DIR / "fixture.sql"
ITEMS_PATH = SEED_DIR / "items.json"


def material_title(path: Path) -> str:
    # The first line of a seed file is its heading: "# Конспект: JOIN".
    first_line = path.read_text(encoding="utf-8").splitlines()[0]
    return first_line.lstrip("#").strip()


def create_course(db: Session) -> Course:
    course = Course(title=COURSE_TITLE, language="ru")
    db.add(course)
    db.flush()
    db.add_all(
        Topic(course_id=course.id, title=title, position=position)
        for position, title in enumerate(TOPICS, start=1)
    )
    for path in sorted(MATERIALS_DIR.glob("*.md")):
        title = material_title(path)
        _, chunks_count = add_material(
            db, course.id, title, path.name, path.read_bytes(), uploaded_by=None
        )
        print(f"{title}: {chunks_count} chunks")
    return course


def load_items() -> dict[str, list[dict]]:
    return json.loads(ITEMS_PATH.read_text(encoding="utf-8"))


def add_items(db: Session, course_id: int) -> int:
    fixture = FIXTURE_PATH.read_text(encoding="utf-8")
    items_by_topic = load_items()
    added = 0
    for topic in db.scalars(select(Topic).where(Topic.course_id == course_id)):
        # Topics that already have items are left as they are.
        if db.scalar(select(exists().where(Item.topic_id == topic.id))):
            continue
        for data in items_by_topic.get(topic.title, []):
            db.add(Item(topic_id=topic.id, type="sql_query", fixture=fixture, **data))
            added += 1
    return added


def main() -> None:
    with SessionLocal() as db:
        course = db.scalar(select(Course).where(Course.title == COURSE_TITLE))
        if course is None:
            course = create_course(db)
            print(f"Course {COURSE_TITLE!r} created, id {course.id}.")
        else:
            print(f"Course {COURSE_TITLE!r} already exists, id {course.id}.")
        print(f"Items added: {add_items(db, course.id)}.")
        # One commit: a failed embedding call leaves no half-seeded course.
        db.commit()


if __name__ == "__main__":
    main()
