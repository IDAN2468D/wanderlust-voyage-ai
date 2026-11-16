"""
Dynamic Day/Slot Re-Planning & Disruption Swap Tools (`trip_disruption_replan_agent`).
Supports stateful edits for weather, strikes, flight delays, budget cuts, or custom tweaks.
"""
import copy
import json
from typing import Any, Dict, List, Optional

from app.tools.budget_tools import calculate_trip_budget
from app.tools.calendar_tools import generate_trip_calendar_pack
from app.tools.briefing_tools import generate_whatsapp_daily_briefings


_INDOOR_ALTERNATIVES: Dict[str, List[Dict[str, Any]]] = {
    "rome": [
        {
            "title": "מוזיאוני הקפיטולין והפנתאון (מקורה)",
            "description": "שילוב מרתק של האוסף הציבורי העתיק בעולם בגבעת הקפיטולין לצד הכיפה האייקונית המקורה של הפנתאון.",
            "cost_usd": 22.0,
            "area": "Centro Storico",
        },
        {
            "title": "גלריית בורגזה או שוק האוכל Mercato Centrale",
            "description": "יצירות המופת של ברניני וקאראווג'ו במתחם מקורה מפואר, או טעימות קולינריות משוק האוכל המרכזי.",
            "cost_usd": 24.0,
            "area": "Termini / Pinciano",
        },
    ],
    "paris": [
        {
            "title": "מוזיאון אורסיי והאורנז'רי (מקורה)",
            "description": "תחנת רכבת היסטורית מרשימה שהפכה לבית האימפרסיוניזם, ובה יצירות מונה, ואן גוך ודגה במתחם סגור ונעים.",
            "cost_usd": 20.0,
            "area": "Left Bank",
        },
        {
            "title": "גלרי לפאייט ופאסאז'ים מקורים (Galeries Vivienne)",
            "description": "שיטוט יבש וחמים בפאסאז'ים הזכוכיתיים מהמאה ה-19 וכיפת הארט-נובו המפורסמת של גלרי לפאייט.",
            "cost_usd": 0.0,
            "area": "Opéra",
        },
    ],
    "london": [
        {
            "title": "המוזיאון הבריטי וגלריית טייט מודרן (מקורה)",
            "description": "כניסה חופשית לאוצרות תרבות עולמיים תחת תקרת הזכוכית של פוסטר ולאמנות עכשווית על גדת התמזה.",
            "cost_usd": 0.0,
            "area": "Bloomsbury / Bankside",
        },
        {
            "title": "שוק Borough המקורה ומוזיאון ויקטוריה ואלברט",
            "description": "טעימות משוק האוכל המקורה הוותיק בלונדון והצצה לאוספי אופנה, עיצוב ואדריכלות מהיפים בעולם.",
            "cost_usd": 15.0,
            "area": "Southwark / Kensington",
        },
    ],
    "tokyo": [
        {
            "title": "מוזיאון האמנות הדיגיטלית teamLab Borderless (מקורה)",
            "description": "מתחם תצוגות אינטראקטיביות עצום ללא גבולות, מקרני אור ומראות מרהיבים המתאימים לכל מזג אוויר.",
            "cost_usd": 28.0,
            "area": "Azabudai Hills",
        },
        {
            "title": "מתחם התצפית המקורה ואקווריום סומידה",
            "description": "חוויית בילוי מקורה המשלבת מרכזי עיצוב יפניים ואקווריום מודרני.",
            "cost_usd": 20.0,
            "area": "Shibuya / Sumida",
        },
    ],
}


def detect_itinerary_conflicts(
    plan_payload: Dict[str, Any],
    weather_metrics: Optional[Dict[str, Any]] = None,
    ground_alerts: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Detect weather, strike, or budget overrun conflicts across structured_days."""
    conflicts: List[Dict[str, Any]] = []
    weather = weather_metrics or plan_payload.get("weather_metrics") or {}
    alerts = ground_alerts or plan_payload.get("ground_alerts") or {}

    rain_prob = float(weather.get("rain_probability_pct", 0) or 0)
    if rain_prob >= 55:
        conflicts.append({
            "type": "weather",
            "severity": "medium",
            "message": f"הסתברות גשם גבוהה ({rain_prob:.0f}%) — מומלץ להעביר פעילויות חוץ למתחמים מקורים.",
            "recommended_day": 2,
        })

    strike_risk = str(alerts.get("strike_risk_index", "")).lower()
    if any(tok in strike_risk for tok in ("high", "גבוה", "elevated")):
        conflicts.append({
            "type": "strike",
            "severity": "high",
            "message": "זוהתה התראת שביתות תחבורה מקומית — מומלץ לרכז את היום בהליכה רגלית סביב המלון.",
            "recommended_day": 1,
        })

    if plan_payload.get("budget_overrun_flagged"):
        conflicts.append({
            "type": "budget_cut",
            "severity": "high",
            "message": "חריגה מתקרת התקציב — ניתן להחליף אטרקציות בתשלום לסיורים חינמיים/מקומיים.",
            "recommended_day": 2,
        })

    return conflicts


def _pick_replacement_activity(destination: str, trigger_type: str, constraint_note: str) -> Dict[str, Any]:
    dest_lower = destination.lower()
    for key, options in _INDOOR_ALTERNATIVES.items():
        if key in dest_lower:
            if trigger_type == "budget_cut":
                free_opts = [o for o in options if o["cost_usd"] == 0]
                if free_opts:
                    return free_opts[0]
            return options[0]

    if trigger_type == "budget_cut":
        return {
            "title": f"סיור הליכה עצמאי ברובע ההיסטורי והשווקים של {destination} (חינמי)",
            "description": f"חוויה מקומית אותנטית ללא עלות כניסה: הליכה רגלית בין הסמטאות, הכיכרות והשווקים התוססים של {destination}.",
            "cost_usd": 0.0,
            "area": "City Center",
        }
    if trigger_type == "kosher":
        return {
            "title": f"סיור קולינרי כשר וביקור בבית חב\"ד המרכזי ב{destination}",
            "description": f"מסלול מותאם לשומרי כשרות ב{destination} הכולל היכרות עם המרכז היהודי, מאפיות כשרות ואווירה חמה.",
            "cost_usd": 18.0,
            "area": "Jewish Quarter / Center",
        }
    if trigger_type == "weather":
        return {
            "title": f"ביקור במוזיאון הלאומי ובמתחם הגלריות המקורה של {destination}",
            "description": f"חלופה מקורה ונעימה ליום גשום או חם במיוחד ב{destination}, עם אוספי אמנות והיסטוריה מקומית.",
            "cost_usd": 16.0,
            "area": "Museum District",
        }
    note_suffix = f" ({constraint_note[:40]})" if constraint_note else ""
    return {
        "title": f"חלופה מותאמת אישית ב{destination}{note_suffix}",
        "description": f"פעילות חלופית מעודכנת ב{destination} המותאמת במיוחד לבקשה שלך ({constraint_note or trigger_type}).",
        "cost_usd": 15.0,
        "area": "Central District",
    }


def apply_itinerary_swap(
    plan_payload: Dict[str, Any],
    day_number: int = 1,
    slot: str = "morning",
    trigger_type: str = "custom_edit",
    constraint_note: str = "",
) -> Dict[str, Any]:
    """
    Mutate a copy of plan_payload for the target day/slot, recalculate budget & .ics,
    and return {updated_plan, diffs}.
    """
    updated = copy.deepcopy(plan_payload)
    destination = str(updated.get("destination") or "Rome")
    days: List[Dict[str, Any]] = list(updated.get("structured_days") or [])

    if not days:
        days = [{
            "day_number": 1,
            "title": f"יום 1 ב{destination}",
            "morning": {"activity": f"סיור פתיחה ב{destination}"},
            "afternoon": {"activity": f"אטרקציה מרכזית ב{destination}", "dining": "מסעדה מקומית"},
            "evening": {"activity": f"תצפית ערב ב{destination}"},
            "local_tip": "מומלץ להזמין כרטיסים מראש.",
        }]

    target_idx = 0
    for idx, d in enumerate(days):
        if int(d.get("day_number", idx + 1)) == int(day_number):
            target_idx = idx
            break

    slot_key = slot if slot in ("morning", "afternoon", "evening") else "morning"
    day_obj = days[target_idx]
    slot_obj = day_obj.get(slot_key)
    if not isinstance(slot_obj, dict):
        slot_obj = {"activity": str(slot_obj or "")}

    before_text = str(slot_obj.get("activity") or "פעילות מתוכננת")
    replacement = _pick_replacement_activity(destination, trigger_type, constraint_note)
    after_text = replacement["title"]
    after_desc = replacement.get("description") or after_text

    slot_obj["activity"] = after_text
    if slot_key == "afternoon":
        slot_obj["activity_description"] = after_desc
        slot_obj["activity_highlight"] = after_desc
        slot_obj["activity_cost_usd"] = replacement.get("cost_usd", 0.0)
        slot_obj["activity_what_to_see"] = []
    else:
        slot_obj["description"] = after_desc
        slot_obj["highlight"] = after_desc
        if slot_key == "morning":
            slot_obj["cost_usd"] = replacement.get("cost_usd", 0.0)
            slot_obj["what_to_see"] = []
    slot_obj["replan_reason"] = trigger_type
    if constraint_note:
        slot_obj["constraint_note"] = constraint_note
    day_obj[slot_key] = slot_obj
    day_obj["local_tip"] = f"עודכן ע״י Co-Pilot ({trigger_type}): {after_text}"
    days[target_idx] = day_obj
    updated["structured_days"] = days

    # Recalculate budget delta
    old_activities = float(updated.get("activities_cost", 120.0) or 120.0)
    cost_delta = -25.0 if trigger_type == "budget_cut" else (0.0 if trigger_type == "weather" else -10.0)
    new_activities = max(0.0, round(old_activities + cost_delta, 2))
    updated["activities_cost"] = new_activities

    total_budget = float(updated.get("total_budget", 2400.0) or 2400.0)
    flight_cost = float(updated.get("flight_cost", 550.0) or 550.0)
    hotel_cost = float(updated.get("hotel_cost", 700.0) or 700.0)
    duration_days = int(updated.get("duration_days", len(days)) or len(days))

    budget_raw = calculate_trip_budget(
        total_budget=total_budget,
        flight_cost=flight_cost,
        accommodation_cost=hotel_cost,
        daily_food_estimate=65.0,
        activities_cost=new_activities,
        duration_days=duration_days,
    )
    budget_report = json.loads(budget_raw)
    updated["total_estimated"] = budget_report["total_projected_expenses_usd"]
    updated["remaining_balance"] = budget_report["remaining_balance_usd"]
    updated["budget_status"] = budget_report["audit_status"]
    updated["budget_overrun_flagged"] = budget_report["audit_status"] != "APPROVED"
    updated["itemized_breakdown"] = budget_report["itemized_breakdown"]

    # Refresh calendar & WhatsApp briefings
    start_date_str = str(updated.get("start_date") or "2026-10-15")
    try:
        updated["calendar_events"] = generate_trip_calendar_pack(
            destination=destination,
            start_date=start_date_str,
            duration_days=duration_days,
            structured_days=days,
            flight_info=updated.get("recommended_flight"),
            hotel_info=updated.get("selected_hotel"),
        )
    except Exception:
        pass

    try:
        updated["whatsapp_briefings"] = json.loads(
            generate_whatsapp_daily_briefings(
                destination=destination,
                duration_days=duration_days,
                structured_days=days,
                weather_metrics=updated.get("weather_metrics"),
            )
        )
    except Exception:
        pass

    diffs = [{
        "day_number": int(day_obj.get("day_number", day_number)),
        "slot": slot_key,
        "before": before_text,
        "after": after_text,
        "cost_delta_usd": round(new_activities - old_activities, 2),
        "reason": constraint_note or f"התאמה אוטומטית ({trigger_type})",
    }]
    return {"updated_plan": updated, "diffs": diffs}


def compute_plan_diff(before_plan: Dict[str, Any], after_plan: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Compute slot-level diffs between two plan payloads."""
    diffs: List[Dict[str, Any]] = []
    before_days = before_plan.get("structured_days") or []
    after_days = after_plan.get("structured_days") or []
    for idx, b_day in enumerate(before_days):
        if idx >= len(after_days):
            break
        a_day = after_days[idx]
        for slot in ("morning", "afternoon", "evening"):
            b_act = (b_day.get(slot) or {}).get("activity") if isinstance(b_day.get(slot), dict) else b_day.get(slot)
            a_act = (a_day.get(slot) or {}).get("activity") if isinstance(a_day.get(slot), dict) else a_day.get(slot)
            if b_act != a_act:
                diffs.append({
                    "day_number": b_day.get("day_number", idx + 1),
                    "slot": slot,
                    "before": str(b_act or ""),
                    "after": str(a_act or ""),
                    "cost_delta_usd": 0.0,
                    "reason": "עדכון מסלול",
                })
    return diffs
