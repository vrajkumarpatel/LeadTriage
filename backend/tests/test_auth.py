"""Auth flow tests: login success/failure, protected endpoint access."""
from tests.conftest import TEST_PASSWORD


def test_health_requires_no_auth(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_success(client):
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": TEST_PASSWORD})
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password(client):
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrong"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid username or password"}


def test_login_wrong_username(client):
    response = client.post("/api/v1/auth/login", json={"username": "nope", "password": TEST_PASSWORD})
    assert response.status_code == 401


def test_protected_endpoint_without_token_is_401(client):
    response = client.get("/api/v1/leads")
    assert response.status_code == 401


def test_protected_endpoint_with_bad_token_is_401(client):
    response = client.get("/api/v1/leads", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_protected_endpoint_with_valid_token_succeeds(client, auth_headers):
    response = client.get("/api/v1/leads", headers=auth_headers)
    assert response.status_code == 200
