"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings. Values come from environment variables or .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "RamxWorkspace API"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    frontend_url: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        """Comma-separated FRONTEND_URL is honored for multiple origins."""
        return [origin.strip() for origin in self.frontend_url.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
