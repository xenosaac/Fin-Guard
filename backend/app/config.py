"""Application configuration via environment variables."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Auth0
    auth0_domain: str = ""
    auth0_client_id: str = ""
    auth0_client_secret: str = ""
    auth0_audience: str = ""
    auth0_callback_url: str = "http://localhost:8000/callback"

    # LLM (AI agent reasoning — supports both, uses whichever key is set)
    llm_provider: str = "anthropic"  # "anthropic" or "openai"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # App
    app_secret_key: str = "change-me-in-production"
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
