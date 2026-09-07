"""Database engine/session setup.

Uses PostgreSQL via the DATABASE_URL env var in production. Falls back to a
local SQLite file when DATABASE_URL is unset so the app runs out of the box
for local dev / CI without any external services (see SPEC.md "Demo Mode").
"""
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./leadtriage.db"
    _connect_args = {"check_same_thread": False}
elif DATABASE_URL.startswith("postgres://"):
    # SQLAlchemy 2.x requires the postgresql:// scheme.
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    _connect_args = {}
else:
    _connect_args = {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency yielding a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
