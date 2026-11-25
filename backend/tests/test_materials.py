from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.llm import LLMError, fake
from app.models import Chunk, Course, Material
from app.rag import add_material, retrieve_materials
from app.rag.loader import extract_text
from app.users import create_user

GROUP_BY_NOTES = (
    "# Aggregates\n\nGROUP BY splits rows into groups with equal values. "
    "COUNT, SUM and AVG are then computed for every group.\n\n"
    "HAVING filters groups after GROUP BY, WHERE filters rows before it."
)
JOIN_NOTES = (
    "# Joins\n\nLEFT JOIN keeps every row of the left table. "
    "INNER JOIN keeps only pairs that match the ON condition."
)


@pytest.fixture(autouse=True)
def materials_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(settings, "materials_dir", str(tmp_path))
    return tmp_path


def headers_for(client: TestClient, engine: Engine, role: str) -> dict[str, str]:
    email = f"{role}@example.com"
    with Session(engine) as db:
        create_user(db, email, "secret123", role.title(), "ru", role=role)
        db.commit()
    credentials = {"email": email, "password": "secret123"}
    tokens = client.post("/api/auth/login", json=credentials).json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def create_course(engine: Engine, title: str) -> int:
    with Session(engine) as db:
        course = Course(title=title, language="en")
        db.add(course)
        db.commit()
        return course.id


def upload(
    client: TestClient, headers: dict[str, str], filename: str, data: bytes
) -> dict:
    response = client.post(
        "/api/courses/1/materials",
        headers=headers,
        data={"title": "Aggregates"},
        files={"file": (filename, data)},
    )
    return {"status": response.status_code, "body": response.json()}


def test_admin_uploads_markdown_material(
    client: TestClient, test_engine: Engine, materials_dir: Path
) -> None:
    headers = headers_for(client, test_engine, "admin")
    create_course(test_engine, "SQL")

    result = upload(client, headers, "notes.md", GROUP_BY_NOTES.encode())

    assert result["status"] == 201
    assert result["body"] == {"id": 1, "title": "Aggregates", "chunks_count": 1}
    with Session(test_engine) as db:
        material = db.get(Material, 1)
        assert material is not None
        assert material.uploaded_by == 1
        assert db.scalar(select(func.count()).select_from(Chunk)) == 1
        assert Path(material.file_path) == materials_dir / "1.md"
    assert (materials_dir / "1.md").read_bytes() == GROUP_BY_NOTES.encode()


def test_unsupported_file_type(client: TestClient, test_engine: Engine) -> None:
    headers = headers_for(client, test_engine, "admin")
    create_course(test_engine, "SQL")

    result = upload(client, headers, "notes.docx", b"anything")

    assert result == {"status": 400, "body": {"detail": "unsupported_file_type"}}


def test_empty_material(client: TestClient, test_engine: Engine) -> None:
    headers = headers_for(client, test_engine, "admin")
    create_course(test_engine, "SQL")

    result = upload(client, headers, "notes.txt", b"   \n\n  ")

    assert result == {"status": 400, "body": {"detail": "empty_material"}}


def test_embedding_error_is_logged_and_saves_nothing(
    client: TestClient,
    test_engine: Engine,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    def fail(texts: list[str]) -> list[list[float]]:
        raise LLMError("429 quota exceeded")

    monkeypatch.setattr(fake, "embed", fail)
    headers = headers_for(client, test_engine, "admin")
    create_course(test_engine, "SQL")

    result = upload(client, headers, "notes.md", GROUP_BY_NOTES.encode())

    assert result == {"status": 503, "body": {"detail": "llm_unavailable"}}
    assert "429 quota exceeded" in caplog.text
    with Session(test_engine) as db:
        assert db.scalar(select(func.count()).select_from(Material)) == 0


def test_student_cannot_upload(client: TestClient, test_engine: Engine) -> None:
    headers = headers_for(client, test_engine, "student")
    create_course(test_engine, "SQL")

    result = upload(client, headers, "notes.md", GROUP_BY_NOTES.encode())

    assert result == {"status": 403, "body": {"detail": "admin_required"}}


def test_upload_to_missing_course(client: TestClient, test_engine: Engine) -> None:
    headers = headers_for(client, test_engine, "admin")

    result = upload(client, headers, "notes.md", GROUP_BY_NOTES.encode())

    assert result == {"status": 404, "body": {"detail": "course_not_found"}}


def test_courses_and_topics(client: TestClient, test_engine: Engine) -> None:
    admin = headers_for(client, test_engine, "admin")
    course = {"title": "Базы данных (SQL)", "language": "ru"}

    created = client.post("/api/courses", headers=admin, json=course)
    second = client.post(
        "/api/courses/1/topics", headers=admin, json={"title": "JOIN", "position": 2}
    )
    first = client.post(
        "/api/courses/1/topics",
        headers=admin,
        json={"title": "SELECT и WHERE", "position": 1},
    )

    assert created.status_code == 201
    assert created.json() == {"id": 1, **course}
    assert second.status_code == first.status_code == 201
    assert client.get("/api/courses", headers=admin).json() == [{"id": 1, **course}]
    assert client.get("/api/courses/1/topics", headers=admin).json() == [
        {"id": 2, "title": "SELECT и WHERE", "position": 1},
        {"id": 1, "title": "JOIN", "position": 2},
    ]


def test_student_cannot_create_course(client: TestClient, test_engine: Engine) -> None:
    headers = headers_for(client, test_engine, "student")

    response = client.post(
        "/api/courses", headers=headers, json={"title": "SQL", "language": "ru"}
    )

    assert response.status_code == 403


def test_retrieve_returns_only_chunks_of_the_course(
    client: TestClient, test_engine: Engine
) -> None:
    sql_course = create_course(test_engine, "SQL")
    other_course = create_course(test_engine, "Other")
    with Session(test_engine) as db:
        add_material(db, sql_course, "Joins", "joins.md", JOIN_NOTES.encode(), None)
        add_material(
            db, sql_course, "Aggregates", "agg.md", GROUP_BY_NOTES.encode(), None
        )
        # Same text in another course: it must never be returned for sql_course.
        add_material(db, other_course, "Copy", "copy.md", GROUP_BY_NOTES.encode(), None)
        db.commit()

        found = retrieve_materials(db, "What does GROUP BY do?", sql_course, k=5)

    assert [chunk.material_title for chunk in found] == ["Aggregates", "Joins"]
    assert found[0].material_id == 2
    assert "GROUP BY" in found[0].text
    assert found[0].score > found[1].score


def test_extract_text_from_pdf() -> None:
    text = extract_text("notes.pdf", one_page_pdf("GROUP BY makes groups"))

    assert "GROUP BY makes groups" in text


def one_page_pdf(text: str) -> bytes:
    stream = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length %d >>\nstream\n%s\nendstream" % (len(stream), stream),
    ]
    pdf = b"%PDF-1.4\n"
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += b"%d 0 obj\n%s\nendobj\n" % (number, body)
    xref_start = len(pdf)
    pdf += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    pdf += b"".join(b"%010d 00000 n \n" % offset for offset in offsets)
    pdf += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (
        len(objects) + 1,
        xref_start,
    )
    return pdf
