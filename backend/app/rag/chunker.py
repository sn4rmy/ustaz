import re

CHUNK_SIZE = 800
CHUNK_OVERLAP = 150

# From the strongest break to the weakest: paragraph, line, sentence, word.
BREAKS = ["\n\n", "\n", ". ", " "]


def split_text(
    text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP
) -> list[str]:
    text = re.sub(r"\n{3,}", "\n\n", text.strip())
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            end = find_break(text, start + size // 2, end)
        chunks.append(text[start:end].strip())
        if end == len(text):
            break
        start = next_start(text, end - overlap, end)
    return [chunk for chunk in chunks if chunk]


def find_break(text: str, earliest: int, latest: int) -> int:
    # Cut at a natural break in the second half of the chunk, so chunks stay large.
    for separator in BREAKS:
        position = text.rfind(separator, earliest, latest)
        if position != -1:
            return position + len(separator)
    return latest


def next_start(text: str, position: int, end: int) -> int:
    # The overlap starts at a word boundary, not in the middle of a word.
    space = text.find(" ", position, end)
    return space + 1 if space != -1 else position
