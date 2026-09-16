import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_workspace_calendar_sync():
    """Verify calendar sync returns valid Google Calendar URL and iCal payload."""
    payload = {
        "destination": "Bali, Indonesia",
        "start_date": "2026-10-15",
        "duration_days": 7,
        "flight_number": "LY-081",
        "hotel_name": "Maya Ubud Resort",
    }
    response = client.post("/api/v1/workspace/sync-calendar", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "google_calendar_url" in data
    assert "calendar.google.com" in data["google_calendar_url"]
    assert "BEGIN:VCALENDAR" in data["ical_data"]
    assert "END:VCALENDAR" in data["ical_data"]


def test_workspace_gmail_briefing():
    """Verify Gmail briefing endpoint prepares formatted briefing."""
    payload = {
        "destination": "Santorini, Greece",
        "duration_days": 5,
        "recipient_email": "traveler@example.com",
        "markdown_plan": "# Trip to Santorini\nPlan details...",
        "total_estimated_usd": 2100.0,
    }
    response = client.post("/api/v1/workspace/send-briefing", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SENT_SIMULATED"
    assert "traveler@example.com" in data["recipient"]
    assert "תדריך" in data["subject"]


def test_workspace_doc_export():
    """Verify Google Docs export endpoint returns docs URL."""
    payload = {
        "destination": "Paris, France",
        "duration_days": 4,
        "markdown_plan": "# Paris Trip",
    }
    response = client.post("/api/v1/workspace/export-doc", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "docs.google.com" in data["google_docs_url"]


def test_spec_contract_trips_plan_route():
    """Verify adherence to SPEC.md POST /api/v1/trips/plan contract."""
    payload = {
        "destination": "Bali, Indonesia",
        "origin": "TLV",
        "departure_date": "2026-10-15",
        "return_date": "2026-10-22",
        "travelers": 2,
        "budget": 3500.0,
        "currency": "USD",
        "travel_style": "balanced",
        "interests": ["beaches", "temples", "culinary"],
    }
    response = client.post("/api/v1/trips/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["destination"] == "Bali, Indonesia"
    assert data["budget_status"] in ["APPROVED", "OVER_BUDGET"]
    assert data["total_estimated"] > 0
    assert "weather_metrics" in data
    assert "packing_checklist" in data
    assert "safety_info" in data
    assert "seasonal_events" in data
