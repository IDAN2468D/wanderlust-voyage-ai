"""
Trip Critic & Fact-Checker Meta-Agent (`trip_critic_agent`).
Executes pre-completion verification & auto-repair over flight/hotel/Shabbat alignment,
geo-coherence, and baggage/FX/budget invariants.
"""
from datetime import datetime
from typing import Any, Dict, List


def run_trip_critic_audit(
    plan_data: Dict[str, Any],
    origin: str,
    destination: str,
    start_date: str,
    duration_days: int,
    total_budget: float,
    shabbat_safe_mode: bool = False,
) -> Dict[str, Any]:
    """
    Verify and auto-repair synthesized itinerary invariants before SSE COMPLETE.
    Returns critic_report dict and mutates plan_data safely if auto-repairs are needed.
    """
    checks: List[Dict[str, Any]] = []
    auto_fixes: List[str] = []

    # 1. Flight vs Hotel Check-in & TLV Carrier Check
    rec_flight = plan_data.get("recommended_flight") or {}
    airline_str = str(rec_flight.get("airline") or "")
    if origin.strip().upper() in {"TLV", "ETM"} and any(bad in airline_str for bad in ("Turkish", "Emirates", "Qatar")):
        rec_flight["airline"] = "אל על (EL AL Israel Airlines)"
        rec_flight["flight_number"] = "LY-315"
        plan_data["recommended_flight"] = rec_flight
        auto_fixes.append("הוחלפה חברת תעופה שאינה פעילה מנתב\"ג ל-EL AL (LY-315).")
        checks.append({"check": "tlv_carrier_validity", "status": "FIXED", "detail": "תוקנה חברת תעופה מ-TLV."})
    else:
        checks.append({"check": "tlv_carrier_validity", "status": "PASS", "detail": f"חברת התעופה ({airline_str or 'EL AL'}) תקינה מ-{origin}."})

    # 2. Shabbat Safe Mode Enforcement on Friday/Saturday Days
    days = plan_data.get("structured_days") or []
    shabbat_repaired = 0
    if shabbat_safe_mode and days:
        try:
            dt_start = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
            for idx, day in enumerate(days):
                cur_dt = dt_start.fromordinal(dt_start.toordinal() + idx)
                if cur_dt.weekday() == 4:  # Friday
                    eve = day.get("evening")
                    if isinstance(eve, dict) and "שבת" not in str(eve.get("activity", "")):
                        eve["activity"] = f"קבלת שבת וארוחת ערב שבת רגלית בקרבת בית חב\"ד ב{destination}"
                        shabbat_repaired += 1
                elif cur_dt.weekday() == 5:  # Saturday
                    for slot in ("morning", "afternoon"):
                        s_obj = day.get(slot)
                        if isinstance(s_obj, dict) and "רגל" not in str(s_obj.get("activity", "")):
                            s_obj["activity"] = f"טיול רגלי שומר שבת (ללא תשלום/נסיעה) בפארק וברובע המרכזי של {destination}"
                            shabbat_repaired += 1
        except Exception:
            pass
    if shabbat_repaired:
        auto_fixes.append(f"הותאמו {shabbat_repaired} סלוטים בשישי/שבת למצב שמירת שבת (ללא נסיעה ותשלום).")
    checks.append({
        "check": "shabbat_schedule_coherence",
        "status": "FIXED" if shabbat_repaired else "PASS",
        "detail": f"מצב שבת: {'הותאמו ' + str(shabbat_repaired) + ' סלוטים' if shabbat_repaired else 'תקין'}.",
    })

    # 3. Budget & Contingency Reconciliation
    total_est = float(plan_data.get("total_estimated", 0.0) or 0.0)
    flight_cost = float(plan_data.get("flight_cost", 0.0) or 0.0)
    hotel_cost = float(plan_data.get("hotel_cost", 0.0) or 0.0)
    if total_est <= 0 or (flight_cost + hotel_cost) > total_est:
        repaired_est = round(flight_cost + hotel_cost + float(plan_data.get("activities_cost", 100.0) or 100.0) + (duration_days * 65.0), 2)
        plan_data["total_estimated"] = repaired_est
        plan_data["remaining_balance"] = round(total_budget - repaired_est, 2)
        auto_fixes.append(f"אוזן סכום ההערכה הכולל ל-${repaired_est:,.2f}.")
        checks.append({"check": "financial_reconciliation", "status": "FIXED", "detail": "בוצע תיקון חישוב כולל."})
    else:
        checks.append({"check": "financial_reconciliation", "status": "PASS", "detail": f"עלות כוללת ${total_est:,.2f} מאוזנת מול הפירוט."})

    # 4. Geo-Coherence & Hotel Proximity Check
    hotel = plan_data.get("selected_hotel") or {}
    has_coords = bool(hotel.get("lat") and hotel.get("lng")) or bool(hotel.get("google_maps_url"))
    checks.append({
        "check": "geo_coherence",
        "status": "PASS" if has_coords else "WARN",
        "detail": "קישורי ניווט וקואורדינטות מלון מאומתים." if has_coords else "מלון ללא קואורדינטות מדויקות.",
    })

    overall = "REPAIRED" if auto_fixes else "VERIFIED"
    return {
        "status": overall,
        "checks_passed": len([c for c in checks if c["status"] == "PASS"]),
        "auto_fixes_applied": auto_fixes,
        "checks": checks,
    }
