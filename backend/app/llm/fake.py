import hashlib
import math
import re

from app.llm.base import ChatMessage
from app.models.course import EMBEDDING_DIM


def words(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def generate(
    model: str, system: str, messages: list[ChatMessage]
) -> tuple[str, int, int]:
    last = messages[-1]["content"] if messages else ""
    text = f"[{model}] {last}"
    tokens_in = len(words(system)) + sum(len(words(m["content"])) for m in messages)
    return text, tokens_in, len(words(text))


def embed(texts: list[str]) -> list[list[float]]:
    return [word_vector(text) for text in texts]


def word_vector(text: str) -> list[float]:
    # Each word adds 1 to its own bucket, so texts with common words end up close.
    vector = [0.0] * EMBEDDING_DIM
    for word in words(text):
        digest = hashlib.sha256(word.encode()).digest()
        vector[int.from_bytes(digest[:4], "big") % EMBEDDING_DIM] += 1.0
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        # Cosine distance is undefined for a zero vector.
        vector[0] = 1.0
        return vector
    return [value / norm for value in vector]
