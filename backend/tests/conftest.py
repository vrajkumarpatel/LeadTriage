"""Shared pytest fixtures.

Tests run entirely against an isolated in-memory SQLite database and the
mock classifier (no GROQ_API_KEY, no real Postgres, no network calls) so
they work in CI with zero external dependencies.
"""
import os

# Set required env vars before importing app modules, so auth/db config
# picks them up.
os.environ.setdefault("ADMIN_USERNAME", "admin")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.pop("GROQ_API_KEY", None)
os.environ.pop("NOTIFICATION_WEBHOOK_URL", None)
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

import models  # noqa: F401 ensures all tables are registered
from database import Base, get_db
from main import app
from services.auth_service import pwd_context

TEST_PASSWORD = "test-password123"
os.environ["ADMIN_PASSWORD_HASH"] = pwd_context.hash(TEST_PASSWORD)

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function", autouse=True)
def _fresh_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def _override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def auth_token(client):
    response = client.post(
        "/api/v1/auth/login", json={"username": "admin", "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture()
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}
