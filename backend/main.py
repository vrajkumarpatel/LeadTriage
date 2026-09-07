"""LeadTriage FastAPI application entrypoint."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import Base, engine
from logging_config import configure_logging
from routers import analytics, auth, leads, workflows

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("LeadTriage API starting up")
    yield
    logger.info("LeadTriage API shutting down")


app = FastAPI(
    title="LeadTriage API",
    description=(
        "AI-powered lead qualification automation platform. Leads are scored "
        "hot/warm/cold via a Groq LLM call (with a deterministic mock fallback "
        "when no GROQ_API_KEY is configured), tracked through workflow runs, "
        "and audited end to end."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # SPEC.md's error contract maps request-body/query validation failures to 400
    # (FastAPI's default is 422); the detail still carries the field-level errors.
    return JSONResponse(status_code=400, content={"detail": exc.errors()})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth.router)
app.include_router(leads.router)
app.include_router(workflows.router)
app.include_router(analytics.router)


@app.get("/health", summary="Health check", tags=["health"])
def health() -> dict:
    """No-auth health check. Returns {"status": "ok"}."""
    return {"status": "ok"}
