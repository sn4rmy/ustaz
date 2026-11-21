from pathlib import Path

from sqlalchemy.orm import Session

from app.config import settings
from app.llm import embed
from app.models import Chunk, Material
from app.rag.chunker import split_text
from app.rag.loader import MaterialError, extract_text


def add_material(
    db: Session,
    course_id: int,
    title: str,
    filename: str,
    data: bytes,
    uploaded_by: int | None,
) -> tuple[Material, int]:
    chunks = split_text(extract_text(filename, data))
    if not chunks:
        raise MaterialError("empty_material")
    # Embeddings come first: if the provider fails, nothing is written.
    vectors = embed(chunks, "document")

    material = Material(
        course_id=course_id, title=title, file_path="", uploaded_by=uploaded_by
    )
    db.add(material)
    db.flush()
    material.file_path = save_file(material.id, filename, data)
    db.add_all(
        Chunk(material_id=material.id, position=position, text=text, embedding=vector)
        for position, (text, vector) in enumerate(zip(chunks, vectors, strict=True))
    )
    return material, len(chunks)


def save_file(material_id: int, filename: str, data: bytes) -> str:
    # Named by id, so the uploaded file name never becomes part of a path.
    folder = Path(settings.materials_dir)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{material_id}{Path(filename).suffix.lower()}"
    path.write_bytes(data)
    return path.as_posix()
