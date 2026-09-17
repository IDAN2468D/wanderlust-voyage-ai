import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings loaded from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # General
    PROJECT_NAME: str = "AI Multi-Agent Travel Planner"
    VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    PORT: int = 8000

    # Google Gemini AI
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key")
    GEMINI_MODEL: str = Field(default="gemini-2.0-flash", description="Gemini model identifier")

    # JWT Authentication
    JWT_SECRET_KEY: str = Field(
        default="travel-planner-super-secret-jwt-key-minimum-32-chars-xyz123",
        description="Secret key for signing JWT tokens",
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Google OAuth 2.0 Credentials
    GOOGLE_CLIENT_ID: str = Field(default="", description="Google OAuth 2.0 Client ID")
    GOOGLE_CLIENT_SECRET: str = Field(default="", description="Google OAuth 2.0 Client Secret")
    GOOGLE_REDIRECT_URI: str = Field(
        default="http://localhost:3000/api/auth/callback/google",
        description="Authorized redirect URI for Google OAuth",
    )

    # PostgreSQL Database
    POSTGRES_USER: str = "travel_agent"
    POSTGRES_PASSWORD: str = "travel_agent_secret"
    POSTGRES_DB: str = "travel_agent_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,*"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def database_url(self) -> str:
        """SQLAlchemy connection string for PostgreSQL."""
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()

# Ensure GOOGLE_API_KEY environment variable is synced for Google GenAI / Agno SDK
if settings.GEMINI_API_KEY and not os.getenv("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
