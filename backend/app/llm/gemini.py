from app.config import settings
from app.llm.base import ChatMessage, LLMError, post_json
from app.models.course import EMBEDDING_DIM

BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
EMBED_BATCH_SIZE = 100

# gemini-embedding-2 has no taskType parameter; the task goes into the text instead.
QUERY_PREFIX = "task: search result | query: "
DOCUMENT_PREFIX = "title: none | text: "


def auth_headers() -> dict[str, str]:
    if not settings.gemini_api_key:
        raise LLMError("GEMINI_API_KEY is not set")
    return {"x-goog-api-key": settings.gemini_api_key}


def generate(
    model: str, system: str, messages: list[ChatMessage]
) -> tuple[str, int, int]:
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [
            {
                "role": "model" if message["role"] == "assistant" else "user",
                "parts": [{"text": message["content"]}],
            }
            for message in messages
        ],
    }
    data = post_json(f"{BASE_URL}/{model}:generateContent", auth_headers(), body)

    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError):
        raise LLMError(f"Gemini returned no answer: {data}") from None
    text = "".join(part.get("text", "") for part in parts if not part.get("thought"))

    usage = data.get("usageMetadata", {})
    # Thinking tokens are billed as output, so they count towards the budget.
    tokens_out = usage.get("candidatesTokenCount", 0) + usage.get(
        "thoughtsTokenCount", 0
    )
    return text, usage.get("promptTokenCount", 0), tokens_out


def embed(model: str, texts: list[str], kind: str) -> list[list[float]]:
    prefix = QUERY_PREFIX if kind == "query" else DOCUMENT_PREFIX
    vectors = []
    for start in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[start : start + EMBED_BATCH_SIZE]
        # One request per text: several parts in one request give a single vector.
        body = {
            "requests": [
                {
                    "model": f"models/{model}",
                    "content": {"parts": [{"text": prefix + text}]},
                    "outputDimensionality": EMBEDDING_DIM,
                }
                for text in batch
            ]
        }
        data = post_json(f"{BASE_URL}/{model}:batchEmbedContents", auth_headers(), body)
        vectors += [embedding["values"] for embedding in data["embeddings"]]
    return vectors
