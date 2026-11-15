"""
Multi-Traveler Group Cost Split, Collaborative Tracks & Settlement Ledger (`group_split_agent`).
"""
import json
from typing import Any, Dict, List, Optional


def compute_group_cost_split(
    travelers: int = 2,
    flight_cost_per_trip: float = 550.0,
    hotel_cost_total: float = 700.0,
    activities_cost_total: float = 150.0,
    daily_food_per_person: float = 55.0,
    duration_days: int = 7,
    traveler_profiles: Optional[List[Dict[str, Any]]] = None,
    fx_ils_rate: float = 3.70,
    fx_eur_rate: float = 0.92,
) -> str:
    """
    Compute per-traveler and per-category cost allocation with adult/child/infant fare weights,
    room sharing, and Bit/PayBox settlement links.
    """
    count = max(1, int(travelers or 1))
    profiles = list(traveler_profiles or [])
    if not profiles:
        profiles = [{"name": f"נוסע {i + 1}", "age_group": "adult"} for i in range(count)]

    # Normalize weights: adult=1.0, child=0.75, infant=0.15
    weights: List[float] = []
    for p in profiles:
        ag = str(p.get("age_group", "adult")).lower()
        if ag == "infant":
            weights.append(0.15)
        elif ag == "child":
            weights.append(0.75)
        else:
            weights.append(1.0)
    total_weight = sum(weights) or 1.0

    # Hotel rooms: 2 travelers per room (infants share parents' room)
    non_infants = sum(1 for p in profiles if str(p.get("age_group", "adult")).lower() != "infant")
    rooms_needed = max(1, (non_infants + 1) // 2)
    adjusted_hotel = round(hotel_cost_total * (rooms_needed if count > 2 else 1), 2)
    adjusted_flights = round(flight_cost_per_trip * (total_weight / max(1.0, min(2.0, total_weight))), 2)
    adjusted_food = round(daily_food_per_person * duration_days * total_weight, 2)
    adjusted_activities = round(activities_cost_total * (total_weight / max(1.0, min(2.0, total_weight))), 2)

    group_total_usd = round(adjusted_flights + adjusted_hotel + adjusted_food + adjusted_activities, 2)

    per_person: List[Dict[str, Any]] = []
    for idx, p in enumerate(profiles):
        w = weights[idx]
        share_ratio = w / total_weight
        share_usd = round(group_total_usd * share_ratio, 2)
        per_person.append({
            "name": p.get("name") or f"נוסע {idx + 1}",
            "age_group": p.get("age_group", "adult"),
            "weight": w,
            "share_pct": round(share_ratio * 100, 1),
            "share_usd": share_usd,
            "share_ils": round(share_usd * fx_ils_rate, 2),
            "share_eur": round(share_usd * fx_eur_rate, 2),
        })

    settlement = build_group_settlement_ledger(per_person, organizer_name=per_person[0]["name"])

    return json.dumps({
        "travelers_count": len(profiles),
        "rooms_needed": rooms_needed,
        "group_total_usd": group_total_usd,
        "group_total_ils": round(group_total_usd * fx_ils_rate, 2),
        "group_total_eur": round(group_total_usd * fx_eur_rate, 2),
        "per_person": per_person,
        "settlement_ledger": settlement,
        "split_tracks": generate_split_track_options(profiles),
    }, ensure_ascii=False)


def generate_split_track_options(traveler_profiles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Suggest parallel morning/afternoon tracks when group interests or ages diverge."""
    has_children = any(str(p.get("age_group", "")).lower() in ("child", "infant") for p in traveler_profiles)
    if has_children:
        return [
            {
                "track_name": "מסלול משפחות וילדים",
                "slot": "בוקר",
                "suggestion": "פארק מדע / אקווריום + הפסקת גלידה ומנוחת צהריים במלון",
                "meetup_dinner": "ארוחת ערב משפחתית משותפת בשעה 19:00",
            },
            {
                "track_name": "מסלול מבוגרים / תרבות",
                "slot": "בוקר",
                "suggestion": "גלריה מקומית, קפה בוטיק ושדרת קניות Tax-Free",
                "meetup_dinner": "ארוחת ערב משפחתית משותפת בשעה 19:00",
            },
        ]
    return [
        {
            "track_name": "מסלול תרבות ומוזיאונים",
            "slot": "אחר הצהריים",
            "suggestion": "מוזיאון מרכזי + סיור אדריכלות ברובע ההיסטורי",
            "meetup_dinner": "מפגש ערב קבוצתי במסעדת השף המומלצת ב-20:00",
        },
        {
            "track_name": "מסלול שופינג וקולינריה",
            "slot": "אחר הצהריים",
            "suggestion": "שוק אוכל מקומי + חנויות דגל ואאוטלטים",
            "meetup_dinner": "מפגש ערב קבוצתי במסעדת השף המומלצת ב-20:00",
        },
    ]


def build_group_settlement_ledger(
    per_person: List[Dict[str, Any]],
    organizer_name: str = "מארגן הטיול",
) -> List[Dict[str, Any]]:
    """Build 'Who Owes Whom' Bit/PayBox settlement items assuming organizer pays upfront."""
    ledger: List[Dict[str, Any]] = []
    for item in per_person[1:]:
        ledger.append({
            "from_traveler": item["name"],
            "to_traveler": organizer_name,
            "amount_usd": item["share_usd"],
            "amount_ils": item["share_ils"],
            "payment_app_hint": "Bit / PayBox",
            "whatsapp_text": (
                f"היי {item['name']}! חלקך בטיול הוא ₪{item['share_ils']:,.0f} "
                f"(${item['share_usd']:,.0f}) — ניתן להעביר ב-Bit ל-{organizer_name}."
            ),
        })
    return ledger
