from pathlib import Path

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Course, Topic
from app.rag import add_material

COURSE_TITLE = "Базы данных (SQL)"
TOPICS = [
    "SELECT и WHERE",
    "Сортировка и LIMIT",
    "Агрегаты и GROUP BY",
    "JOIN",
    "Подзапросы",
]
MATERIALS_DIR = Path(__file__).resolve().parents[2] / "seed" / "materials"


def material_title(path: Path) -> str:
    # The first line of a seed file is its heading: "# Конспект: JOIN".
    first_line = path.read_text(encoding="utf-8").splitlines()[0]
    return first_line.lstrip("#").strip()


def main() -> None:
    with SessionLocal() as db:
        if db.scalar(select(Course).where(Course.title == COURSE_TITLE)):
            print(f"Course {COURSE_TITLE!r} already exists, nothing to do.")
            return

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
        # One commit: a failed embedding call leaves no half-seeded course.
        db.commit()
        print(f"Course {COURSE_TITLE!r} created, id {course.id}.")


if __name__ == "__main__":
    main()
