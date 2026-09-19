import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.routes import router as trip_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("travel_app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle initialization and cleanup."""
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    logger.info(f"Target Gemini Model: {settings.GEMINI_MODEL}")
    yield
    logger.info("Shutting down AI Multi-Agent Travel Planner...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack AI Multi-Agent Travel Planner powered by FastAPI, Agno, Google Gemini, and PostgreSQL.",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.cors_origins != ["*"] else ["*"],
    allow_origin_regex=r"^https?:\/\/.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all global exception handler."""
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please check server logs."},
    )


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint to verify backend operational readiness."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "gemini_model": settings.GEMINI_MODEL,
        "environment": settings.APP_ENV,
    }


# Register API subrouters
app.include_router(auth_router, prefix="/api")
app.include_router(trip_router, prefix="/api")


@app.get("/api/workspace/download-ics", tags=["Workspace Integration"])
async def download_calendar_ics_alias(
    destination: str,
    start_date: str = "2026-10-15",
    duration_days: int = 7,
    days: int | None = None,
):
    """Direct alias for /api/v1/workspace/download-ics for backward compatibility."""
    from app.api.routes import download_calendar_ics
    return await download_calendar_ics(destination, start_date, duration_days, days)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
    )
