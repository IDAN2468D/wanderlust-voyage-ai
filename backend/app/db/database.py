"""
SQLAlchemy Engine & Session Management for Wanderlust Voyage AI.
Supports PostgreSQL (Render / Docker) with automatic graceful fallback to local SQLite
so local development, tests, and resilient cloud startups never crash if Postgres is unreachable.
"""
import json
import logging
import os
from contextlib import contextmanager
from typing import Generator, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.models import Base, UserModel

logger = logging.getLogger("wanderlust_db")

_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker] = None
_active_db_url: str = ""
_initialized: bool = False


def _create_sqlalchemy_engine(db_url: str) -> Engine:
    is_sqlite = db_url.startswith("sqlite")
    kwargs = {"pool_pre_ping": True}
    if is_sqlite:
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_size"] = 5
        kwargs["max_overflow"] = 10
        kwargs["connect_args"] = {"connect_timeout": 5}
    return create_engine(db_url, **kwargs)


def _configure_engine(target_url: Optional[str] = None) -> Engine:
    global _engine, _SessionLocal, _active_db_url

    candidate_url = settings._normalize_db_url(target_url) if target_url else settings.database_url
    try:
        eng = _create_sqlalchemy_engine(candidate_url)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        _engine = eng
        _active_db_url = candidate_url
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
        backend_label = "sqlite" if candidate_url.startswith("sqlite") else "postgresql"
        logger.info(f"Connected to {backend_label} database successfully.")
        return _engine
    except Exception as exc:
        if not candidate_url.startswith("sqlite"):
            fallback_url = settings.default_sqlite_url
            logger.warning(
                f"PostgreSQL connection failed ({exc}); falling back to persistent SQLite at {fallback_url}"
            )
            eng = _create_sqlalchemy_engine(fallback_url)
            _engine = eng
            _active_db_url = fallback_url
            _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
            return _engine
        raise


def get_active_db_url() -> str:
    if not _active_db_url:
        _configure_engine()
    return _active_db_url


def get_active_db_backend() -> str:
    url = get_active_db_url()
    return "sqlite" if url.startswith("sqlite") else "postgresql"


def get_session_factory() -> sessionmaker:
    if _SessionLocal is None:
        init_db()
    assert _SessionLocal is not None
    return _SessionLocal


def override_database_url(db_url: str) -> None:
    """Re-initialize engine & tables against a custom URL (primarily for isolated tests)."""
    global _initialized
    _initialized = False
    init_db(target_url=db_url, force=True)


def _seed_initial_users(db: Session) -> None:
    from app.core.security import get_password_hash

    demo_email = "demo@travelplanner.ai"
    existing_demo = db.query(UserModel).filter(UserModel.email == demo_email).first()
    if not existing_demo:
        db.add(
            UserModel(
                id="usr_demo123",
                email=demo_email,
                hashed_password=get_password_hash("password123"),
                full_name="Demo Traveler",
                role="user",
                picture="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                auth_provider="local",
            )
        )

    # Migrate legacy users from backend/data/users_store.json if present
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    legacy_path = os.path.join(backend_root, "data", "users_store.json")
    if os.path.exists(legacy_path):
        try:
            with open(legacy_path, "r", encoding="utf-8") as f:
                saved = json.load(f)
            if isinstance(saved, dict):
                for email_key, rec in saved.items():
                    if not isinstance(rec, dict):
                        continue
                    clean_email = str(rec.get("email") or email_key).lower().strip()
                    if not clean_email or "@" not in clean_email:
                        continue
                    already = db.query(UserModel).filter(UserModel.email == clean_email).first()
                    if not already:
                        db.add(
                            UserModel(
                                id=str(rec.get("id") or f"usr_{clean_email[:8]}"),
                                email=clean_email,
                                hashed_password=rec.get("hashed_password"),
                                full_name=rec.get("full_name"),
                                role=rec.get("role", "user"),
                                picture=rec.get("picture"),
                                auth_provider=rec.get("auth_provider", "local"),
                            )
                        )
        except Exception as exc:
            logger.warning(f"Could not migrate legacy users_store.json: {exc}")

    db.commit()


def init_db(target_url: Optional[str] = None, force: bool = False) -> None:
    """Create tables and seed initial user records idempotently."""
    global _initialized
    if _initialized and not force and target_url is None:
        return

    engine = _configure_engine(target_url=target_url)
    Base.metadata.create_all(bind=engine)
    assert _SessionLocal is not None
    with _SessionLocal() as db:
        _seed_initial_users(db)
    _initialized = True


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding an active SQLAlchemy Session."""
    if not _initialized:
        init_db()
    factory = get_session_factory()
    db = factory()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Context manager for non-FastAPI callers / SSE generators."""
    if not _initialized:
        init_db()
    factory = get_session_factory()
    db = factory()
    try:
        yield db
    finally:
        db.close()
