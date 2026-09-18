"""
Wanderlust Voyage AI - Resend Email Delivery Service.
Provides asynchronous email dispatch via Resend REST API (https://api.resend.com/emails)
with resilient fallback simulation when RESEND_API_KEY is not configured.
"""
import logging
import uuid
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings
from app.services.email_templates import (
    render_trip_briefing_html,
    render_welcome_html,
    render_password_reset_html,
    render_flight_board_html,
    render_contact_confirmation_html,
    render_booking_confirmation_html,
)

logger = logging.getLogger("email_service")
RESEND_API_URL = "https://api.resend.com/emails"


class EmailService:
    """Core email dispatch service integrating Resend with graceful fallback."""

    def __init__(self):
        self.api_key = settings.RESEND_API_KEY.strip() if settings.RESEND_API_KEY else ""
        self.from_email = settings.RESEND_FROM_EMAIL or "Wanderlust Voyage AI <onboarding@resend.dev>"
        self.frontend_url = settings.FRONTEND_URL or "http://localhost:3000"

    @property
    def is_live_configured(self) -> bool:
        """Returns True if a real Resend API key is present."""
        return bool(self.api_key and self.api_key.startswith("re_") and "your_api_key" not in self.api_key)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends an HTML email via Resend REST API or simulates dispatch if no API key is set.
        Guarantees that errors do not crash the caller.
        """
        sender = from_email or self.from_email
        target = to_email.strip()

        if not target or "@" not in target:
            logger.warning(f"Invalid recipient email provided: {target}")
            return {"status": "error", "detail": "Invalid recipient email address"}

        # Graceful Simulation Mode if API Key not set
        if not self.is_live_configured:
            simulated_id = f"sim_{uuid.uuid4().hex[:12]}"
            logger.info(
                f"[SIMULATED EMAIL] To: {target} | From: {sender} | Subject: '{subject}' | "
                f"Resend API key is not configured. Set RESEND_API_KEY in .env or Render Dashboard to send real emails."
            )
            return {
                "id": simulated_id,
                "status": "simulated",
                "recipient": target,
                "subject": subject,
                "message": "Email delivery simulated successfully (Resend API key not configured).",
            }

        # Real Resend REST API Dispatch
        payload = {
            "from": sender,
            "to": [target],
            "subject": subject,
            "html": html_content,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(RESEND_API_URL, json=payload, headers=headers)
                
                if res.status_code in (200, 201):
                    res_data = res.json()
                    email_id = res_data.get("id", f"re_{uuid.uuid4().hex[:10]}")
                    logger.info(f"Resend email dispatched successfully: ID {email_id} to {target}")
                    return {
                        "id": email_id,
                        "status": "sent",
                        "recipient": target,
                        "subject": subject,
                        "message": "Email sent successfully via Resend.",
                    }
                else:
                    error_text = res.text
                    logger.error(f"Resend API returned status {res.status_code}: {error_text}")
                    # Return error info without raising 500
                    return {
                        "status": "failed",
                        "status_code": res.status_code,
                        "detail": error_text,
                        "recipient": target,
                    }
        except Exception as exc:
            logger.error(f"Exception during Resend email dispatch to {target}: {exc}")
            return {
                "status": "error",
                "detail": str(exc),
                "recipient": target,
            }

    async def send_trip_briefing(
        self,
        recipient_email: str,
        destination: str,
        duration_days: int,
        total_estimated_usd: float,
        markdown_plan: str,
        recipient_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Dispatches an executive trip briefing email."""
        subject = f"✈️ תדריך הנסיעה שלך ל{destination} ({duration_days} ימים) - Wanderlust Voyage AI"
        html_body = render_trip_briefing_html(
            destination=destination,
            duration_days=duration_days,
            total_estimated_usd=total_estimated_usd,
            markdown_plan=markdown_plan,
            frontend_url=self.frontend_url,
            recipient_name=recipient_name or "מטייל יקר",
        )
        return await self.send_email(
            to_email=recipient_email,
            subject=subject,
            html_content=html_body,
        )

    async def send_welcome_email(
        self,
        email: str,
        full_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Sends a welcome onboarding email to a newly registered user."""
        subject = "🌍 ברוך הבא ל-Wanderlust Voyage AI!"
        html_body = render_welcome_html(
            email=email,
            full_name=full_name,
            frontend_url=self.frontend_url,
        )
        return await self.send_email(
            to_email=email,
            subject=subject,
            html_content=html_body,
        )

    async def send_password_reset(
        self,
        email: str,
        reset_token: str,
        recipient_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Sends a secure password reset link to the user."""
        reset_url = f"{self.frontend_url}/login?action=reset-password&token={reset_token}"
        subject = "🔒 איפוס סיסמה לחשבונך - Wanderlust Voyage AI"
        html_body = render_password_reset_html(
            email=email,
            reset_url=reset_url,
            recipient_name=recipient_name,
        )
        return await self.send_email(
            to_email=email,
            subject=subject,
            html_content=html_body,
        )

    async def send_flight_board(
        self,
        recipient_email: str,
        holiday_name: str,
        flights: List[Dict[str, Any]],
        search_links: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Dispatches TLV holiday flight board results."""
        subject = f"🛫 לוח טיסות מומלצות מנתב״ג לחופשת {holiday_name} - Wanderlust"
        html_body = render_flight_board_html(
            holiday_name=holiday_name,
            flights=flights,
            search_links=search_links,
            frontend_url=self.frontend_url,
        )
        return await self.send_email(
            to_email=recipient_email,
            subject=subject,
            html_content=html_body,
        )

    async def send_contact_inquiry(
        self,
        sender_name: str,
        sender_email: str,
        subject: str,
        message: str,
    ) -> Dict[str, Any]:
        """Sends an auto-confirmation to the user who contacted support."""
        ticket_id = uuid.uuid4().hex[:8].upper()
        email_subject = f"✓ פנייתך התקבלה #{ticket_id}: {subject}"
        html_body = render_contact_confirmation_html(
            sender_name=sender_name,
            subject=subject,
            message=message,
            ticket_id=ticket_id,
        )
        return await self.send_email(
            to_email=sender_email,
            subject=email_subject,
            html_content=html_body,
        )

    async def send_booking_confirmation(
        self,
        recipient_email: str,
        booking_ref: str,
        destination: str,
        duration_days: int,
        total_amount: float,
        currency: str = "USD",
        customer_name: Optional[str] = None,
        flight_portion: Optional[float] = None,
        hotel_portion: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Dispatches an executive booking confirmation and flight/hotel voucher."""
        subject = f"🎉 אישור הזמנה #{booking_ref}: חופשתך ל-{destination} שוריינה בהצלחה! - Wanderlust"
        html_body = render_booking_confirmation_html(
            booking_ref=booking_ref,
            destination=destination,
            duration_days=duration_days,
            total_amount=total_amount,
            currency=currency,
            customer_name=customer_name,
            flight_portion=flight_portion,
            hotel_portion=hotel_portion,
            frontend_url=self.frontend_url,
        )
        return await self.send_email(
            to_email=recipient_email,
            subject=subject,
            html_content=html_body,
        )


email_service = EmailService()

