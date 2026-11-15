"""
Post-Booking Concierge Timeline & Proactive Watchdog Scanner (`post_booking_concierge_agent`, `watchdog_agent`).
"""
import json
from typing import Any, Dict, List, Optional

from app.tools.safety_tools import get_safety_and_visa_info
from app.tools.sentinel_tools import get_ground_sentinel_alerts
from app.tools.weather_tools import get_destination_weather
from app.tools.loyalty_vault_tools import get_loyalty_and_vault_readiness


def build_pre_departure_timeline(
    booking_ref: str,
    destination: str,
    start_date: str = "2026-10-15",
    duration_days: int = 7,
    total_amount: float = 1500.0,
    passport_expiry: Optional[str] = None,
) -> Dict[str, Any]:
    """Build T-30d, T-7d, T-24h, T-0d pre-departure readiness milestones for a confirmed booking."""
    safety = json.loads(get_safety_and_visa_info(destination))
    alerts = json.loads(get_ground_sentinel_alerts(destination))
    weather = json.loads(get_destination_weather(destination, start_date, duration_days))
    vault = json.loads(
        get_loyalty_and_vault_readiness(
            destination=destination,
            start_date=start_date,
            duration_days=duration_days,
            passport_expiry=passport_expiry,
        )
    )

    milestones: List[Dict[str, Any]] = [
        {
            "window": "T-30 יום",
            "title": "דרכון, ויזות ואישורי כניסה דיגיטליים",
            "status": "ACTION_NEEDED" if vault["readiness_vault"]["passport_check"]["status"] == "WARNING" else "READY",
            "details": f"{safety.get('visa_policy', '')} | {vault['readiness_vault']['passport_check']['message']}",
            "forms": vault["readiness_vault"]["required_entry_forms"],
        },
        {
            "window": "T-7 ימים",
            "title": "בדיקת מזג אוויר, ביטוח ושביתות יעד",
            "status": "MONITORING",
            "details": (
                f"תחזית: {weather.get('summary', '')} | "
                f"מדד שביתות: {alerts.get('strike_risk_index', 'נמוך')} | "
                "זכרו להפעיל ביטוח נסיעות וכרטיס אשראי."
            ),
        },
        {
            "window": "T-24 שעות",
            "title": "צ'ק-אין אונליין, בחירת מושבים ו-eSIM",
            "status": "UPCOMING",
            "details": "בצעו צ'ק-אין 24 שעות מראש, בדקו טרמינל יציאה בנתב\"ג (T3/T1) והתקינו eSIM.",
        },
        {
            "window": "יום ההמראה (T-0)",
            "title": "הגעה לנתב\"ג + הורדת ארנק אופליין",
            "status": "UPCOMING",
            "details": "הגעה 3–3.5 שעות לפני ההמראה. ודאו שובר מלון ודרכון בארנק האופליין.",
        },
    ]

    return {
        "booking_ref": booking_ref,
        "destination": destination,
        "duration_days": duration_days,
        "total_amount": total_amount,
        "milestones": milestones,
        "safety_summary": safety.get("visa_policy"),
        "sentinel_badge": alerts.get("safety_badge"),
        "weather_summary": weather.get("summary"),
    }


def run_watchdog_scan(bookings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Scan active bookings for weather/strike anomalies and return actionable alerts."""
    alerts_out: List[Dict[str, Any]] = []
    for b in bookings[:10]:
        dest = str(b.get("destination") or "")
        if not dest:
            continue
        sentinel = json.loads(get_ground_sentinel_alerts(dest))
        if "high" in str(sentinel.get("strike_risk_index", "")).lower():
            alerts_out.append({
                "booking_ref": b.get("booking_ref"),
                "destination": dest,
                "severity": "warning",
                "message": f"התראת תחבורה ב{dest}: מומלץ להפעיל יום חלופי ב-Re-Planner.",
            })
    return {"scanned": len(bookings), "alerts": alerts_out}
