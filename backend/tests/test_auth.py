import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_login_demo_user_success():
    """Verify built-in demo user login succeeds and yields bearer token."""
    response = client.post(
        "/api/auth/login",
        json={"email": "demo@travelplanner.ai", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "demo@travelplanner.ai"
    assert data["user"]["full_name"] == "Demo Traveler"


def test_login_invalid_credentials():
    """Verify incorrect password produces HTTP 401."""
    response = client.post(
        "/api/auth/login",
        json={"email": "demo@travelplanner.ai", "password": "wrong_password"},
    )
    assert response.status_code == 401
    assert "שגויים" in response.json()["detail"]


def test_register_and_login_flow():
    """Verify end-to-end registration flow for new traveler."""
    test_email = "shir.cohen@example.com"
    reg_response = client.post(
        "/api/auth/register",
        json={
            "email": test_email,
            "password": "SecurePassword2026!",
            "full_name": "שיר כהן",
        },
    )
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == test_email
    assert reg_data["user"]["full_name"] == "שיר כהן"
    assert reg_data["user"]["auth_provider"] == "local"

    # Duplicate registration should fail
    dup_response = client.post(
        "/api/auth/register",
        json={
            "email": test_email,
            "password": "AnotherPassword123!",
            "full_name": "שיר כהן",
        },
    )
    assert dup_response.status_code == 400

    # Login with newly registered user
    login_response = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": "SecurePassword2026!"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # Verify /me endpoint with token
    me_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == test_email
    assert me_response.json()["full_name"] == "שיר כהן"


def test_google_login_flow():
    """Verify Google sign-in endpoint creates or logs in user seamlessly."""
    google_email = "traveler.google@gmail.com"
    payload = {
        "email": google_email,
        "name": "דניאל ישראלי",
        "picture": "https://lh3.googleusercontent.com/a/sample_avatar",
    }
    response = client.post("/api/auth/google", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == google_email
    assert data["user"]["full_name"] == "דניאל ישראלי"
    assert data["user"]["auth_provider"] == "google"
    assert data["user"]["picture"] == "https://lh3.googleusercontent.com/a/sample_avatar"

    # Calling again should update or log in the existing user
    relogin_resp = client.post("/api/auth/google", json=payload)
    assert relogin_resp.status_code == 200
    assert relogin_resp.json()["user"]["id"] == data["user"]["id"]
