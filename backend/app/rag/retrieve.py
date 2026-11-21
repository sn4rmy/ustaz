from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.llm import embed
from app.models import Chunk, Material


@dataclass
class RetrievedChunk:
    chunk_id: int
    material_id: int
    material_title: str
    text: str
    # Cosine similarity: 1 means the same direction as the query.
    score: float


def retrieve_materials(
    db: Session, query: str, course_id: int, k: int = 5
) -> list[RetrievedChunk]:
    [query_vector] = embed([query], "query")
    distance = Chunk.embedding.cosine_distance(query_vector)
    rows = db.execute(
        select(Chunk.id, Chunk.material_id, Material.title, Chunk.text, distance)
        .join(Material, Chunk.material_id == Material.id)
        .where(Material.course_id == course_id)
        .order_by(distance)
        .limit(k)
    ).all()
    return [
        RetrievedChunk(chunk_id, material_id, title, text, 1 - row_distance)
        for chunk_id, material_id, title, text, row_distance in rows
    ]
