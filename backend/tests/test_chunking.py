from app.rag.chunker import split_text


def sample_text() -> str:
    paragraphs = [
        f"Paragraph {number}. " + "GROUP BY splits rows into groups. " * 8
        for number in range(10)
    ]
    return "\n\n".join(paragraphs)


def test_chunks_are_not_longer_than_size() -> None:
    chunks = split_text(sample_text(), size=800, overlap=150)

    assert len(chunks) > 1
    assert all(0 < len(chunk) <= 800 for chunk in chunks)


def test_neighbour_chunks_overlap() -> None:
    chunks = split_text(sample_text(), size=800, overlap=150)

    for previous, current in zip(chunks, chunks[1:]):
        # The start of each chunk repeats the end of the previous one.
        assert current[:50] in previous


def test_chunks_cover_whole_text() -> None:
    text = sample_text()
    chunks = split_text(text, size=800, overlap=150)

    for number in range(10):
        assert any(f"Paragraph {number}." in chunk for chunk in chunks)
    assert chunks[0].startswith("Paragraph 0.")
    assert text.strip().endswith(chunks[-1])


def test_chunk_ends_at_paragraph_break() -> None:
    first = "a" * 500
    second = "b" * 500

    chunks = split_text(f"{first}\n\n{second}", size=800, overlap=150)

    assert chunks[0] == first


def test_short_text_is_one_chunk() -> None:
    assert split_text("  SELECT * FROM employees;  ") == ["SELECT * FROM employees;"]


def test_empty_text_gives_no_chunks() -> None:
    assert split_text("") == []
    assert split_text(" \n\n ") == []
