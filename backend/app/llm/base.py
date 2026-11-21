from dataclasses import dataclass
from time import sleep
from typing import Literal, TypedDict

import httpx

MAX_ATTEMPTS = 3
TIMEOUT_SECONDS = 60
MAX_RETRY_DELAY_SECONDS = 30

# Shared client; tests replace it with one that has a mock transport.
http = httpx.Client(timeout=TIMEOUT_SECONDS)


class LLMError(Exception):
    pass


class ChatMessage(TypedDict):
    role: Literal["user", "assistant"]
    content: str


@dataclass
class LLMResult:
    text: str
    model: str
    tokens_in: int
    tokens_out: int
    latency_ms: int


def retry_delay(response: httpx.Response, attempt: int) -> float:
    retry_after = response.headers.get("Retry-After", "")
    if retry_after.isdigit():
        return min(int(retry_after), MAX_RETRY_DELAY_SECONDS)
    return 2.0**attempt


def post_json(url: str, headers: dict[str, str], body: dict) -> dict:
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = http.post(url, headers=headers, json=body)
        except httpx.HTTPError as error:
            raise LLMError(f"Request to {url} failed: {error}") from error
        if response.status_code == 429 and attempt < MAX_ATTEMPTS:
            sleep(retry_delay(response, attempt))
            continue
        if response.is_error:
            raise LLMError(
                f"{url} returned {response.status_code}: {response.text[:500]}"
            )
        return response.json()
    raise AssertionError("unreachable")
