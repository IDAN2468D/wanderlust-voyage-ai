"""
Tests for Persistent Database Layer (PostgreSQL/SQLite) and Rotating-News Newsletter System.
"""
from datetime import date, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import Settings
from app.services.newsletter_service import NEWSLETTER_EDITIONS, select_rotating_edition
from app.services.email_templates import render_newsletter_html

client = TestClient(app)


def test_database_url_normalization():
    """Verify Render postgres:// URIs normalize to postgresql+psycopg2://."""
    assert (
        Settings._normalize_db_url("postgres://user:pass@host:5432/dbname")
        == "postgresql+psycopg2://user:pass@host:5432/dbname"
    )
    assert (
        Settings._normalize_db_url("postgresql://user:pass@host:5432/dbname")
        == "postgresql+psycopg2://user:pass@host:5432/dbname"
    )


def test_health_reports_database_backend():
    """Verify /health reports operational database backend."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database_backend"] in ("sqlite", "postgresql")


def test_booking_persistence_in_database():
    """Verify booking confirmation saves booking into DB and GET /bookings returns it."""
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "booking.db@example.com",
            "password": "Password123!",
            "full_name": "עידן לוי",
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "booking_ref": "WNDR-DB1001",
        "destination": "טוקיו, יפן",
        "duration_days": 9,
        "total_amount": 2850.0,
        "currency": "USD",
        "recipient_email": "booking.db@example.com",
        "customer_name": "עידן לוי",
        "customer_phone": "0501234567",
        "payment_method": "card",
        "installments": 3,
    }
    confirm_res = client.post(
        "/api/v1/workspace/booking-confirmation",
        json=payload,
        headers=headers,
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "SUCCESS"

    list_res = client.get("/api/v1/bookings", headers=headers)
    assert list_res.status_code == 200
    bookings = list_res.json()["bookings"]
    refs = [b["booking_ref"] for b in bookings]
    assert "WNDR-DB1001" in refs
    matched = next(b for b in bookings if b["booking_ref"] == "WNDR-DB1001")
    assert matched["destination"] == "טוקיו, יפן"
    assert matched["installments"] == 3


def test_trip_plan_persistence_in_database():
    """Verify planned trips persist in DB and are returned by GET /api/v1/trips/history."""
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "trips.db@example.com",
            "password": "Password123!",
            "full_name": "נועה כהן",
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    depart = (date.today() + timedelta(days=35)).strftime("%Y-%m-%d")
    plan_res = client.post(
        "/api/v1/trips/plan",
        json={
            "origin": "TLV",
            "destination": "Rome, Italy",
            "start_date": depart,
            "duration_days": 5,
            "total_budget": 2500.0,
            "currency": "USD",
        },
        headers=headers,
    )
    assert plan_res.status_code == 200
    session_id = plan_res.json()["session_id"]

    history_res = client.get("/api/v1/trips/history", headers=headers)
    assert history_res.status_code == 200
    trips = history_res.json()["trips"]
    assert any(t["session_id"] == session_id and t["destination"] == "Rome, Italy" for t in trips)


def test_newsletter_rotation_and_html_template():
    """Verify rotating newsletter unit rotation & rich RTL HTML rendering."""
    import html as html_lib

    seen_ids = set()
    for i in range(len(NEWSLETTER_EDITIONS)):
        ed = select_rotating_edition(previous_editions_sent=i)
        seen_ids.add(ed["edition_id"])
        html_out = render_newsletter_html(
            recipient_email="reader@example.com",
            edition_data=ed,
            edition_number=i + 1,
            dispatch_date_il="14/11/2026",
        )
        assert 'dir="rtl"' in html_out
        assert f"מהדורה #{i + 1}" in html_out
        assert html_lib.escape(ed["headline"]) in html_out
        assert html_lib.escape(ed["breaking_story"]["title"]) in html_out
    assert len(seen_ids) == len(NEWSLETTER_EDITIONS)


def test_newsletter_subscribe_endpoint_rotates_news_per_send():
    """Verify POST /api/v1/newsletter/subscribe persists subscriber & sends different rotating news on each send."""
    email = "idan.newsletter@example.com"

    res1 = client.post("/api/v1/newsletter/subscribe", json={"email": email})
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["status"] == "SUCCESS"
    assert d1["edition_number"] == 1
    assert d1["email"] == email
    assert len(d1["headlines"]) >= 3
    assert 'dir="rtl"' in d1["preview_html"]

    res2 = client.post("/api/v1/newsletter/subscribe", json={"email": email})
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["status"] == "SUCCESS"
    assert d2["edition_number"] == 2
    assert d2["edition_id"] != d1["edition_id"]
    assert d2["edition_title"] != d1["edition_title"]
    assert d2["headlines"] != d1["headlines"]
    assert "מהדורה #2" in d2["preview_html"]

    res3 = client.post("/api/v1/newsletter/subscribe", json={"email": email})
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["edition_number"] == 3
    assert d3["edition_id"] not in (d1["edition_id"], d2["edition_id"])


def test_newsletter_preview_endpoint():
    """Verify GET /api/v1/newsletter/preview returns distinct editions."""
    p0 = client.get("/api/v1/newsletter/preview?edition_index=0")
    p1 = client.get("/api/v1/newsletter/preview?edition_index=1")
    assert p0.status_code == 200
    assert p1.status_code == 200
    assert p0.json()["edition"]["edition_id"] != p1.json()["edition"]["edition_id"]
    assert 'dir="rtl"' in p0.json()["html"]
    assert "https://wanderlust-frontend-rvw9.onrender.com/#planner-form" in p0.json()["html"]
    assert "http://localhost:3000" not in p0.json()["html"]


def test_render_frontend_url_resolution(monkeypatch):
    """Verify email links resolve to Render production URL even if FRONTEND_URL is unset or localhost."""
    prod_settings = Settings(APP_ENV="production", FRONTEND_URL="http://localhost:3000")
    assert prod_settings.effective_frontend_url == "https://wanderlust-frontend-rvw9.onrender.com"

    monkeypatch.setenv("RENDER", "true")
    render_settings = Settings(APP_ENV="development", FRONTEND_URL="")
    assert render_settings.effective_frontend_url == "https://wanderlust-frontend-rvw9.onrender.com"

    custom_settings = Settings(APP_ENV="production", FRONTEND_URL="https://custom.wanderlust.ai/")
    assert custom_settings.effective_frontend_url == "https://custom.wanderlust.ai"

