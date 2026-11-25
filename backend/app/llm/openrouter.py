from app.config import settings
from app.llm.base import ChatMessage, LLMError, post_json

URL = "https://openrouter.ai/api/v1/chat/completions"


def generate(
    model: str, system: str, messages: list[ChatMessage]
) -> tuple[str, int, int]:
    if not settings.openrouter_api_key:
        raise LLMError("OPENROUTER_API_KEY is not set")
    headers = {"Authorization": f"Bearer {settings.openrouter_api_key}"}
    body = {
        "model": model,
        "messages": [{"role": "system", "content": system}, *messages],
    }
    data = post_json(URL, headers, body)

    try:
        text = data["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError):
        raise LLMError(f"OpenRouter returned no answer: {data}") from None
    usage = data.get("usage", {})
    return text, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
