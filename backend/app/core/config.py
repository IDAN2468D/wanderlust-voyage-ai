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
    PROJECT_NAME: str = "AgentTravelPlanner"
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

    # Resend Email Service (resend.com)
    RESEND_API_KEY: str = Field(default="", description="Resend API Key for transactional emails (re_...)")
    RESEND_FROM_EMAIL: str = Field(
        default="AgentTravelPlanner <onboarding@resend.dev>",
        description="Sender email identity approved in Resend",
    )
    PRODUCTION_FRONTEND_URL: str = "https://wanderlust-frontend-rvw9.onrender.com"
    FRONTEND_URL: str = Field(
        default="https://wanderlust-frontend-rvw9.onrender.com",
        description="Public frontend web application URL (Render production URL by default)",
    )

    # Database (Render DATABASE_URL or Docker/Local PostgreSQL with SQLite fallback)
    DATABASE_URL: str = Field(
        default="",
        description="Primary database connection URL (e.g., Render PostgreSQL DATABASE_URL)",
    )
    POSTGRES_USER: str = "travel_agent"
    POSTGRES_PASSWORD: str = "travel_agent_secret"
    POSTGRES_DB: str = "travel_agent_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # CORS
    ALLOWED_ORIGINS: str = "https://wanderlust-frontend-rvw9.onrender.com,http://localhost:3000,http://127.0.0.1:3000,*"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def is_production_runtime(self) -> bool:
        return (
            self.APP_ENV.lower() == "production"
            or bool(os.getenv("RENDER"))
            or bool(os.getenv("RENDER_EXTERNAL_URL"))
        )

    @property
    def effective_frontend_url(self) -> str:
        """Returns the public Render frontend URL for email links and callbacks."""
        raw = (self.FRONTEND_URL or os.getenv("FRONTEND_URL", "")).strip().rstrip("/")
        if raw and "localhost" not in raw and "127.0.0.1" not in raw:
            return raw
        if self.is_production_runtime or not raw or "localhost" in raw or "127.0.0.1" in raw:
            return self.PRODUCTION_FRONTEND_URL.rstrip("/")
        return raw

    @staticmethod
    def _normalize_db_url(raw_url: str) -> str:
        url = (raw_url or "").strip()
        if url.startswith("postgres://"):
            return "postgresql+psycopg2://" + url[len("postgres://"):]
        if url.startswith("postgresql://"):
            return "postgresql+psycopg2://" + url[len("postgresql://"):]
        return url

    @property
    def has_explicit_postgres(self) -> bool:
        """True if an explicit PostgreSQL URL or non-default Postgres host is configured."""
        env_url = self.DATABASE_URL or os.getenv("DATABASE_URL", "")
        if env_url and env_url.strip().startswith(("postgres://", "postgresql")):
            return True
        if self.POSTGRES_HOST and self.POSTGRES_HOST not in ("localhost", "127.0.0.1", ""):
            return True
        return False

    @property
    def default_sqlite_url(self) -> str:
        """Path to local persistent SQLite database inside backend/data/wanderlust.db."""
        backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        data_dir = os.path.join(backend_root, "data")
        os.makedirs(data_dir, exist_ok=True)
        db_path = os.path.join(data_dir, "wanderlust.db")
        return f"sqlite:///{db_path}"

    @property
    def database_url(self) -> str:
        """Effective SQLAlchemy connection string (Render/Postgres if configured, else SQLite)."""
        explicit = self.DATABASE_URL or os.getenv("DATABASE_URL", "")
        if explicit.strip():
            return self._normalize_db_url(explicit)
        if self.POSTGRES_HOST and self.POSTGRES_HOST not in ("localhost", "127.0.0.1", ""):
            return (
                f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        return self.default_sqlite_url


settings = Settings()

# Ensure GOOGLE_API_KEY environment variable is synced for Google GenAI / Agno SDK
if settings.GEMINI_API_KEY and not os.getenv("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
