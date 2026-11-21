import time
from typing import Literal

from app.config import settings
from app.llm import fake, gemini, openrouter
from app.llm.base import ChatMessage, LLMError, LLMResult

__all__ = ["ChatMessage", "LLMError", "LLMResult", "embed", "generate"]

Agent = Literal["teacher", "examiner", "mentor"]
EmbedKind = Literal["document", "query"]


def model_for(agent: Agent) -> str:
    models = {
        "teacher": settings.teacher_model,
        "examiner": settings.examiner_model,
        "mentor": settings.mentor_model,
    }
    return models[agent]


def generate(agent: Agent, system: str, messages: list[ChatMessage]) -> LLMResult:
    model = model_for(agent)
    started = time.perf_counter()
    if settings.llm_provider == "gemini":
        text, tokens_in, tokens_out = gemini.generate(model, system, messages)
    elif settings.llm_provider == "openrouter":
        text, tokens_in, tokens_out = openrouter.generate(model, system, messages)
    elif settings.llm_provider == "fake":
        text, tokens_in, tokens_out = fake.generate(model, system, messages)
    else:
        raise LLMError(f"Unknown LLM_PROVIDER: {settings.llm_provider}")
    latency_ms = round((time.perf_counter() - started) * 1000)
    return LLMResult(text, model, tokens_in, tokens_out, latency_ms)


def embed(texts: list[str], kind: EmbedKind) -> list[list[float]]:
    if not texts:
        return []
    if settings.llm_provider == "fake":
        return fake.embed(texts)
    # Vectors from different models are not comparable, and the stored chunks were
    # embedded by Gemini, so embeddings stay on Gemini even with OpenRouter.
    return gemini.embed(settings.embedding_model, texts, kind)
