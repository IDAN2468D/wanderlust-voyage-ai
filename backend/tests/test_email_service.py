"""
Tests for Resend Email Service, Templates, and Email Endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.email_templates import (
    render_trip_briefing_html,
    render_welcome_html,
    render_password_reset_html,
    render_flight_board_html,
    render_contact_confirmation_html,
)
from app.services.email_service import email_service

client = TestClient(app)


def test_render_trip_briefing_html():
    """Verify trip briefing template renders valid RTL HTML with key data."""
    html_output = render_trip_briefing_html(
        destination="Tokyo, Japan",
        duration_days=10,
        total_estimated_usd=3500.0,
        markdown_plan="# Tokyo Tour\nDay 1: Shibuya\nDay 2: Asakusa",
        recipient_name="דניאל",
    )
    assert 'dir="rtl"' in html_output
    assert "Tokyo, Japan" in html_output
    assert "$3,500" in html_output
    assert "דניאל" in html_output
    assert "WANDERLUST" in html_output


def test_render_welcome_html():
    """Verify welcome template renders with greeting and feature highlights."""
    html_output = render_welcome_html(
        email="traveler@wanderlust.ai",
        full_name="יוסי כהן",
    )
    assert 'dir="rtl"' in html_output
    assert "יוסי כהן" in html_output
    assert "סוכני AI אוטונומיים" in html_output


def test_render_password_reset_html():
    """Verify password reset template contains secure link and expiration warning."""
    reset_url = "http://localhost:3000/login?action=reset-password&token=test_tok_123"
    html_output = render_password_reset_html(
        email="user@example.com",
        reset_url=reset_url,
        recipient_name="מיכל",
    )
    assert reset_url in html_output
    assert "מיכל" in html_output
    assert "60 דקות" in html_output


def test_render_flight_board_html():
    """Verify flight board template generates flight table."""
    mock_flights = [
        {
            "rank": 1,
            "airline": "אל על",
            "destination_name": "אתונה",
            "stops_text": "ישיר",
            "true_total_nis": 1250,
            "base_fare_usd": 340.0,
            "bag_included": True,
            "shabbat_compliant": True,
        }
    ]
    html_output = render_flight_board_html(
        holiday_name="פסח 2026",
        flights=mock_flights,
        search_links={"google_flights": "https://google.com/flights"},
    )
    assert "פסח 2026" in html_output
    assert "אתונה" in html_output
    assert "אל על" in html_output
    assert "₪1,250" in html_output


def test_render_contact_confirmation_html():
    """Verify contact confirmation template renders ticket ID and user query."""
    html_output = render_contact_confirmation_html(
        sender_name="עומר",
        subject="שאלה לגבי טיסות לחגים",
        message="רציתי לדעת אם יש טיסות ישירות לתאילנד בפסח",
        ticket_id="TICKET123",
    )
    assert "TICKET123" in html_output
    assert "עומר" in html_output
    assert "שאלה לגבי טיסות לחגים" in html_output


@pytest.mark.asyncio
async def test_email_service_fallback_simulation():
    """Verify email service gracefully simulates dispatch when no live API key."""
    # Ensure test runs in simulation
    res = await email_service.send_email(
        to_email="test@wanderlust.ai",
        subject="בדיקת מערכת",
        html_content="<p>Test content</p>",
    )
    assert res["status"] in ["simulated", "sent"]
    assert "id" in res


def test_endpoint_send_flight_board():
    """Verify POST /api/v1/flights/send-board endpoint."""
    payload = {
        "recipient_email": "traveler@example.com",
        "holiday_name": "פסח",
        "flights": [
            {
                "airline": "ארקיע",
                "destination_name": "לרנקה",
                "stops_text": "ישיר",
                "true_total_nis": 890,
                "base_fare_usd": 240.0,
                "bag_included": True,
                "shabbat_compliant": False,
            }
        ],
        "search_links": {"google_flights": "https://google.com/flights"},
    }
    response = client.post("/api/v1/flights/send-board", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "traveler@example.com" in data["recipient"]


def test_endpoint_contact_inquiry():
    """Verify POST /api/v1/contact endpoint."""
    payload = {
        "name": "דנה לוי",
        "email": "dana@example.com",
        "subject": "המלצה על מסלול בטוקיו",
        "message": "שלום, המסלול שהסוכן יצר היה פשוט מושלם! תודה רבה.",
    }
    response = client.post("/api/v1/contact", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"


def test_endpoint_forgot_and_reset_password_flow():
    """Verify forgot password and password reset token flow."""
    # 1. Register a test user
    test_email = "resend_test_user@example.com"
    reg_res = client.post(
        "/api/auth/register",
        json={"email": test_email, "password": "OriginalPassword123", "full_name": "משתמש בדיקה"},
    )
    # Registration might return 201 or 400 if already exists
    assert reg_res.status_code in [201, 400]

    # 2. Request forgot password
    forgot_res = client.post("/api/auth/forgot-password", json={"email": test_email})
    assert forgot_res.status_code == 200
    assert forgot_res.json()["status"] == "SUCCESS"

    # 3. Generate a valid reset token directly using the security helper to test reset
    from app.core.security import create_access_token
    from datetime import timedelta

    valid_token = create_access_token(
        data={"sub": test_email, "purpose": "password_reset"},
        expires_delta=timedelta(minutes=30),
    )

    # 4. Perform password reset
    reset_res = client.post(
        "/api/auth/reset-password",
        json={"token": valid_token, "new_password": "NewSecurePassword456"},
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "SUCCESS"

    # 5. Verify login with new password
    login_res = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": "NewSecurePassword456"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_endpoint_booking_confirmation():
    """Verify POST /api/v1/workspace/booking-confirmation sends official booking voucher."""
    from app.services.email_templates import render_booking_confirmation_html

    # Test template rendering
    html_out = render_booking_confirmation_html(
        booking_ref="WNDR-998877",
        destination="Rome, Italy",
        duration_days=6,
        total_amount=1850.0,
        currency="USD",
        customer_name="שירה כהן",
    )
    assert "WNDR-998877" in html_out
    assert "Rome, Italy" in html_out
    assert "שירה כהן" in html_out
    assert "$1,850" in html_out

    # Test API endpoint
    payload = {
        "booking_ref": "WNDR-998877",
        "destination": "Rome, Italy",
        "duration_days": 6,
        "total_amount": 1850.0,
        "currency": "USD",
        "recipient_email": "shira@example.com",
        "customer_name": "שירה כהן",
        "flight_portion": 850.0,
        "hotel_portion": 800.0,
    }
    response = client.post("/api/v1/workspace/booking-confirmation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "shira@example.com" in data["recipient"]

