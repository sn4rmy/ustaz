from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str
    jwt_secret: str
    cors_origins: str = "http://localhost:5173"

    llm_provider: str = "gemini"
    teacher_model: str = "gemini-3.5-flash-lite"
    examiner_model: str = "gemini-3.5-flash-lite"
    mentor_model: str = "gemini-3.5-flash-lite"
    embedding_model: str = "gemini-embedding-2"
    # Only the key of the selected provider is needed, so both are optional here.
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None

    payment_provider: str = "mock"

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]


settings = Settings()
