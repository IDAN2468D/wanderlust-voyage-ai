"""
Loyalty Points/Miles Optimizer, TLV Lounge Access & Pre-Flight Document Vault (`loyalty_vault_agent`).
"""
import json
from typing import Any, Dict, List, Optional

from app.tools.memory_tools import check_passport_validity_window


def get_loyalty_and_vault_readiness(
    destination: str,
    start_date: str,
    duration_days: int = 7,
    flight_cost_usd: float = 550.0,
    airline: str = "EL AL",
    passport_expiry: Optional[str] = None,
    loyalty_programs: Optional[List[str]] = None,
) -> str:
    """Evaluate miles vs cash CPP value, TLV lounge eligibility, and entry-form readiness."""
    dest_lower = destination.lower()
    estimated_points_needed = 42000 if any(k in dest_lower for k in ("tokyo", "new york", "bali", "bangkok")) else 24000
    taxes_usd = 110.0
    net_cash_saved = max(0.0, flight_cost_usd - taxes_usd)
    cpp_cents = round((net_cash_saved / estimated_points_needed) * 100, 2)
    redemption_verdict = "שווה מימוש נקודות (ערך גבוה)" if cpp_cents >= 1.4 else "עדיף לשלם במזומן/אשראי ולצבור נקודות"

    # Entry digital forms by destination
    entry_forms: List[Dict[str, str]] = []
    if any(k in dest_lower for k in ("london", "uk")):
        entry_forms.append({"name": "UK ETA (אישור כניסה דיגיטלי)", "deadline": "לפחות 72 שעות לפני ההמראה", "fee": "£16"})
    elif any(k in dest_lower for k in ("new york", "usa")):
        entry_forms.append({"name": "US ESTA (פטור ויזה ביומטרי)", "deadline": "לפחות 72 שעות לפני ההמראה", "fee": "$21"})
    elif any(k in dest_lower for k in ("tokyo", "japan")):
        entry_forms.append({"name": "Visit Japan Web QR", "deadline": "עד 6 שעות לפני הנחיתה", "fee": "חינם"})
    elif any(k in dest_lower for k in ("bangkok", "phuket", "thailand")):
        entry_forms.append({"name": "Thailand TDAC", "deadline": "72 שעות לפני ההגעה", "fee": "חינם"})
    else:
        entry_forms.append({"name": "אימות דרכון וכרטיסי עלייה למטוס", "deadline": "24 שעות לפני ההמראה", "fee": "חינם"})

    passport_check = check_passport_validity_window(passport_expiry, start_date, duration_days, destination)

    return json.dumps({
        "destination": destination,
        "miles_vs_cash": {
            "programs_checked": loyalty_programs or ["EL AL Matmid / Fly Card", "Flying Blue", "Miles & More"],
            "estimated_points_required": estimated_points_needed,
            "taxes_and_surcharges_usd": taxes_usd,
            "cents_per_point": cpp_cents,
            "verdict": redemption_verdict,
        },
        "lounge_and_fast_track": {
            "tlv_terminal_3": "טרקלין דן (Dan Lounge) או טרקלין המלך דוד (EL AL) — כניסה דרך Fly Card Premium / Priority Pass / מחלקת עסקים.",
            "fast_track_hint": "בדיקה מוקדמת בצ'ק-אין דיגיטלי ודלפקי W/A חוסכת 35-50 דקות בשעות העומס.",
        },
        "readiness_vault": {
            "passport_check": passport_check,
            "required_entry_forms": entry_forms,
        },
    }, ensure_ascii=False)
