import math

import httpx
import pytest

from app import llm
from app.config import settings
from app.llm import LLMError, base
from app.models.course import EMBEDDING_DIM


def test_fake_generate_returns_text_tokens_and_latency() -> None:
    result = llm.generate(
        "teacher", "You are a teacher.", [{"role": "user", "content": "What is JOIN?"}]
    )

    assert result.model == settings.teacher_model
    assert "What is JOIN?" in result.text
    assert result.tokens_in == 7
    assert result.tokens_out > 0
    assert result.latency_ms >= 0


def test_fake_embeddings_are_normalized_and_stable() -> None:
    first, again, other = llm.embed(["GROUP BY", "GROUP BY", "LEFT JOIN"], "document")

    assert len(first) == EMBEDDING_DIM
    assert math.isclose(sum(value * value for value in first), 1.0)
    assert first == again
    assert first != other


def gemini_answer() -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "candidates": [{"content": {"parts": [{"text": "Answer"}]}}],
            "usageMetadata": {"promptTokenCount": 12, "candidatesTokenCount": 3},
        },
    )


@pytest.fixture
def gemini(monkeypatch: pytest.MonkeyPatch) -> list[float]:
    monkeypatch.setattr(settings, "llm_provider", "gemini")
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    delays: list[float] = []
    monkeypatch.setattr(base, "sleep", delays.append)
    return delays


def use_responses(
    monkeypatch: pytest.MonkeyPatch, responses: list[httpx.Response]
) -> list[httpx.Request]:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return responses[len(requests) - 1]

    client = httpx.Client(transport=httpx.MockTransport(handler))
    monkeypatch.setattr(base, "http", client)
    return requests


def test_gemini_retries_after_429(
    gemini: list[float], monkeypatch: pytest.MonkeyPatch
) -> None:
    too_many = httpx.Response(429, json={"error": {"code": 429}})
    requests = use_responses(monkeypatch, [too_many, too_many, gemini_answer()])

    result = llm.generate("teacher", "system", [{"role": "user", "content": "hi"}])

    assert len(requests) == 3
    assert requests[0].headers["x-goog-api-key"] == "test-key"
    assert gemini == [2.0, 4.0]
    assert (result.text, result.tokens_in, result.tokens_out) == ("Answer", 12, 3)


def test_gemini_gives_up_after_three_attempts(
    gemini: list[float], monkeypatch: pytest.MonkeyPatch
) -> None:
    too_many = httpx.Response(429, json={"error": {"code": 429}})
    requests = use_responses(monkeypatch, [too_many, too_many, too_many])

    with pytest.raises(LLMError, match="429"):
        llm.generate("teacher", "system", [{"role": "user", "content": "hi"}])
    assert len(requests) == 3


def test_retry_after_header_sets_the_delay(
    gemini: list[float], monkeypatch: pytest.MonkeyPatch
) -> None:
    too_many = httpx.Response(429, headers={"Retry-After": "7"})
    use_responses(monkeypatch, [too_many, gemini_answer()])

    llm.generate("teacher", "system", [{"role": "user", "content": "hi"}])

    assert gemini == [7]


def test_other_errors_are_not_retried(
    gemini: list[float], monkeypatch: pytest.MonkeyPatch
) -> None:
    requests = use_responses(monkeypatch, [httpx.Response(500, text="boom")])

    with pytest.raises(LLMError, match="500"):
        llm.generate("teacher", "system", [{"role": "user", "content": "hi"}])
    assert len(requests) == 1


def test_missing_api_key(gemini: list[float], monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "gemini_api_key", None)

    with pytest.raises(LLMError, match="GEMINI_API_KEY"):
        llm.generate("teacher", "system", [{"role": "user", "content": "hi"}])
