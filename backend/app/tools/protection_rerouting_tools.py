"""
Travel Insurance, Disruption Re-Routing & Aviation Claims Specialist (`protection_rerouting_agent`).
Covers insurance riders, 5-day Israeli credit card activation rule, MCT layover risk,
and Israeli Aviation Services Law ("חוק טיבי") / EU261 compensation calculator.
"""
import json
from typing import Any, Dict, List, Optional


def get_protection_and_rerouting_plan(
    destination: str,
    flight_info: Optional[Dict[str, Any]] = None,
    interests: Optional[List[str]] = None,
    travelers: int = 2,
) -> str:
    """Audit travel insurance riders, connection MCT risk, and passenger compensation rights."""
    flight = flight_info or {}
    stops = int(flight.get("stops", 0) or 0)
    airline = str(flight.get("airline") or "EL AL")
    interest_text = " ".join(interests or []).lower()

    required_riders: List[str] = ["כיסוי רפואי + חילוץ והצלה (מומלץ מעל $2M)", "הרחבת ביטול/קיצור נסיעה"]
    if any(k in interest_text for k in ("ski", "סקי", "אלפים", "alps", "winter")):
        required_riders.append("הרחבת ספורט חורף / סקי")
    if any(k in interest_text for k in ("scuba", "צלילה", "bali", "באלי", "beach", "אתגרי")):
        required_riders.append("הרחבת ספורט אתגרי וצלילה")

    mct_risk = "נמוך (טיסה ישירה)" if stops == 0 else "בינוני (קונקשן — מומלץ מרווח מינימלי של 90-120 דקות)"
    plan_b = (
        "טיסה ישירה מנתב\"ג — ללא סיכון החמצת קונקשן; גיבוי באמצעות טיסת ערב חלופית מאותו שדה."
        if stops == 0
        else f"במקרה עיכוב בלג הראשון בדרך ל-{destination}: בקשו בדלפק ההעברה Rebooking אוטומטי על כרטיס יחיד (Through-Ticket) ושמרו קבלות אוכל/מלון."
    )

    # Israeli Aviation Law (חוק שירותי תעופה - חוק טיבי) & EU261 tiers
    dest_lower = destination.lower()
    distance_tier = "long_haul" if any(k in dest_lower for k in ("tokyo", "new york", "bali", "bangkok", "maldives")) else "medium_haul"
    tibi_nis = 3410 if distance_tier == "long_haul" else (2280 if any(k in dest_lower for k in ("london", "paris", "zurich", "barcelona")) else 1440)
    eu261_eur = 600 if distance_tier == "long_haul" else 400

    claim_draft = (
        f"לכבוד מחלקת פניות הציבור — {airline}\n"
        f"הנדון: דרישת פיצוי וסיוע לפי חוק שירותי תעופה (חוק טיבי) / תקנה EU261 לטיסה ל-{destination}.\n"
        f"במידה והטיסה תידחה ב-8+ שעות או תבוטל ללא הודעה מוקדמת של 14 יום, הנוסעים ({travelers}) זכאים לסיוע מיידי ופיצוי סטטוטורי של עד ₪{tibi_nis:,} לנוסע."
    )

    return json.dumps({
        "destination": destination,
        "insurance_audit": {
            "required_riders": required_riders,
            "credit_card_trap_alert": "שימו לב: ביטוח חינם של כרטיסי האשראי בישראל מחייב הפעלה אקטיבית עד 5 ימים לפני ההמראה ואינו מכסה מצב רפואי קיים ללא הצהרה.",
            "estimated_policy_cost_usd_per_person": 24.0,
        },
        "connection_resilience": {
            "stops": stops,
            "mct_risk_level": mct_risk,
            "plan_b_protocol": plan_b,
        },
        "passenger_rights": {
            "tibi_law_max_compensation_nis": tibi_nis,
            "eu261_max_compensation_eur": eu261_eur,
            "trigger_threshold": "עיכוב המראה מעל 8 שעות (טיבי) / הגעה מעל 3 שעות (EU261) או ביטול טיסה.",
            "claim_letter_template": claim_draft,
        },
    }, ensure_ascii=False)
