import os
import json
import logging
import asyncio
import urllib.parse
from typing import AsyncGenerator, Dict, Any, Optional, List
from datetime import datetime, timedelta

from app.core.config import settings
from app.agents.guardrails import validate_trip_input, validate_trip_output
from app.agents.reasoning import get_agno_reasoning_tools, run_reasoning_audit
from app.api.schemas import TripPlanResponse
from app.rag.retriever import get_knowledge_base, search_travel_knowledge
from app.tools.flight_tools import search_flights, search_accommodations
from app.tools.places_tools import search_attractions, search_restaurants, get_neighborhood_guide
from app.tools.budget_tools import calculate_trip_budget
from app.tools.weather_tools import get_destination_weather, generate_packing_checklist
from app.tools.safety_tools import get_safety_and_visa_info
from app.tools.events_tools import search_seasonal_events_and_gems
from app.tools.transit_tools import get_transit_guide
from app.tools.culinary_tools import get_culinary_guide
from app.tools.shopping_tools import get_shopping_and_tax_free
from app.tools.calendar_tools import generate_trip_calendar_pack
from app.tools.sentinel_tools import get_ground_sentinel_alerts
from app.tools.briefing_tools import generate_whatsapp_daily_briefings
from app.tools.memory_tools import load_traveler_memory, check_passport_validity_window
from app.tools.shabbat_halacha_tools import get_shabbat_halacha_schedule
from app.tools.connectivity_mobility_tools import get_connectivity_and_mobility_guide
from app.tools.protection_rerouting_tools import get_protection_and_rerouting_plan
from app.tools.loyalty_vault_tools import get_loyalty_and_vault_readiness
from app.tools.group_split_tools import compute_group_cost_split
from app.tools.replan_tools import apply_itinerary_swap
from app.agents.critic import run_trip_critic_audit

logger = logging.getLogger("travel_orchestrator")

# In-memory short-term fallback store when PostgreSQL / Gemini are offline
_CHAT_HISTORY: Dict[str, List[Dict[str, str]]] = {}
_SESSION_PLANS: Dict[str, Dict[str, Any]] = {}

AGNO_AVAILABLE = False
Team = None
PostgresDb = None
PostgresAgentStorage = None

try:
    from agno.agent import Agent
    from agno.models.google import Gemini

    try:
        from agno.db.postgres import PostgresDb
    except ImportError:
        PostgresDb = None

    try:
        import importlib
        _legacy_storage = importlib.import_module("agno.storage.agent.postgres")
        PostgresAgentStorage = getattr(_legacy_storage, "PostgresAgentStorage", None)
    except Exception:
        PostgresAgentStorage = None

    try:
        from agno.team import Team
    except ImportError:
        Team = None

    AGNO_AVAILABLE = True
except Exception as e:
    logger.warning(f"Agno framework not fully loaded: {e}. Running in standalone multi-agent mode.")


def format_israeli_date(date_str: str) -> str:
    """Format YYYY-MM-DD into Israeli convention DD/MM/YYYY per AGENTS.md rule 5."""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return date_str


def synthesize_deterministic_plan(
    origin: str,
    destination: str,
    start_date: str,
    duration_days: int,
    total_budget: float,
    interests: List[str],
    travel_style: str = "balanced",
    currency: str = "USD",
    travelers: int = 2,
    return_date: Optional[str] = None,
    shabbat_safe_mode: bool = False,
    kosher_only: bool = False,
    accessibility_mode: bool = False,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes the coordinated multi-agent travel pipeline deterministically.
    Synthesizes flights, hotels, attractions, weather, safety, culture, budget,
    and Sprint 8-9 specialist modules + Trip Critic verification.
    """
    validated = validate_trip_input(
        origin=origin,
        destination=destination,
        start_date=start_date,
        duration_days=duration_days,
        total_budget=total_budget,
    )
    dest_clean = validated["destination"]
    orig_clean = validated["origin"].upper()
    days = validated["duration_days"]

    # 1. Flights & Lodging (Flight Specialist)
    flight_data_raw = search_flights(orig_clean, dest_clean, start_date, return_date=return_date)
    flight_data = json.loads(flight_data_raw)
    rec_flight = flight_data["flights"][0] if flight_data.get("flights") else {
        "airline": "אל על (EL AL)",
        "flight_number": "LY-081",
        "price_usd": 550.0,
        "duration": "5h 15m",
        "stops": 0,
        "cabin": "מחלקת תיירים סטנדרט",
        "booking_url": f"https://www.google.com/travel/flights?q=Flights+from+{orig_clean}+to+{dest_clean}",
        "benchmark_note": "מחיר תחרותי לעונה",
    }
    flight_cost = rec_flight.get("price_usd", 550.0)

    # Compute checkout date
    try:
        dt_start = datetime.strptime(start_date, "%Y-%m-%d")
        checkout_str = (dt_start + timedelta(days=days)).strftime("%Y-%m-%d")
    except Exception:
        checkout_str = start_date

    hotel_data_raw = search_accommodations(dest_clean, start_date, checkout_str, budget_tier=travel_style)
    hotel_data = json.loads(hotel_data_raw)
    selected_hotel = hotel_data["options"][0] if hotel_data.get("options") else {
        "name": f"Hotel Boutique {dest_clean}",
        "stars": 4,
        "rating": 4.7,
        "nightly_rate_usd": 160.0,
        "neighborhood": "מרכז העיר ההיסטורי",
        "amenities": ["ארוחת בוקר כלולה", "Wi-Fi חינם", "בריכה/ספא"],
        "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={dest_clean}",
        "booking_url": f"https://www.google.com/travel/hotels?q={dest_clean}",
    }
    hotel_cost = selected_hotel.get("nightly_rate_usd", 160.0) * days

    # 2. Places & Attractions (Places Specialist)
    attractions_raw = search_attractions(dest_clean, interests, max_results=max(4, days * 2))
    attractions_data = json.loads(attractions_raw)
    attractions_list = attractions_data.get("attractions", [])

    restaurants_raw = search_restaurants(dest_clean)
    restaurants_data = json.loads(restaurants_raw)
    restaurants_list = restaurants_data.get("recommendations", [])

    neighborhood_raw = get_neighborhood_guide(dest_clean)
    neighborhood_data = json.loads(neighborhood_raw)

    activities_cost = sum(a.get("entry_fee_usd", 0.0) for a in attractions_list[:days * 2])
    daily_food = 50.0 if travel_style == "budget" else (90.0 if travel_style == "luxury" else 65.0)

    # 3. Weather & Smart Packing (Weather Specialist)
    weather_raw = get_destination_weather(dest_clean, start_date, days)
    weather_data = json.loads(weather_raw)

    packing_raw = generate_packing_checklist(dest_clean, travel_style, interests, weather_data.get("metrics"))
    packing_data = json.loads(packing_raw)

    # 4. Safety & Visas (Safety Advisory Specialist)
    safety_raw = get_safety_and_visa_info(dest_clean, nationality="IL")
    safety_data = json.loads(safety_raw)

    # 5. Culture & Hidden Gems (Culture & Events Specialist)
    events_raw = search_seasonal_events_and_gems(dest_clean)
    events_data = json.loads(events_raw)

    # 6. Budget Audit (Budget Specialist)
    budget_raw = calculate_trip_budget(
        total_budget=total_budget,
        flight_cost=flight_cost,
        accommodation_cost=hotel_cost,
        daily_food_estimate=daily_food,
        activities_cost=activities_cost,
        duration_days=days,
        emergency_buffer_percentage=10.0,
        currency=currency,
    )
    budget_report = json.loads(budget_raw)

    # Pull Transit, Culinary/Kosher & Shopping context so each day has varied, detailed dining & evening plans
    transit_raw = get_transit_guide(dest_clean, days)
    transit_data = json.loads(transit_raw)

    culinary_raw = get_culinary_guide(dest_clean, interests)
    culinary_data = json.loads(culinary_raw)

    shopping_raw = get_shopping_and_tax_free(dest_clean, estimated_shopping_budget_usd=350.0)
    shopping_data = json.loads(shopping_raw)

    # 7. Construct Day-by-Day Itinerary Schedule
    structured_days: List[Dict[str, Any]] = []
    israeli_start_date = format_israeli_date(start_date)

    nightlife_pool = culinary_data.get("nightlife_spots") or []
    gourmet_pool = culinary_data.get("gourmet_dining") or []
    kosher_pool = culinary_data.get("kosher_options") or []
    secret_gems_pool = (events_data.get("culture_and_events") or {}).get("secret_gems") or []
    sunset_pool = (events_data.get("culture_and_events") or {}).get("sunset_nightlife_spots") or []
    neighborhood_areas = neighborhood_data.get("neighborhood_breakdown") or []

    for day_num in range(1, days + 1):
        idx1 = ((day_num - 1) * 2) % max(1, len(attractions_list))
        idx2 = ((day_num - 1) * 2 + 1) % max(1, len(attractions_list))
        rest_idx = (day_num - 1) % max(1, len(restaurants_list))

        att1 = attractions_list[idx1] if attractions_list else {
            "name": f"סיור אתרי מורשת ב{dest_clean}",
            "category": "היסטוריה ותרבות",
            "description": f"סיור היכרות מעמיק ברובע ההיסטורי של {dest_clean}, בין כיכרות מרשימות, שווקים צבעוניים ומבנים היסטוריים שמורים.",
            "highlight": "חקירת הסמטאות העתיקות והמבנים השמורים",
            "what_to_see": [f"הכיכר המרכזית של {dest_clean}", "מבני האדריכלות ההיסטוריים", "דוכני אמנות וקפה מקומי"],
            "visitor_tips": "התחילו את ההליכה בסביבות 09:00 לפני שהרחובות המרכזיים מתמלאים.",
            "recommended_hours": 2.5,
            "best_time": "בוקר (09:00–12:00)",
            "entry_fee_usd": 0.0,
            "rating": 4.7,
            "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={dest_clean}",
        }
        att2 = attractions_list[idx2] if len(attractions_list) > 1 else {
            "name": f"תצפית שקיעה פנורמית ב{dest_clean}",
            "category": "נוף ואווירה",
            "description": f"הליכה נינוחה אל נקודת התצפית הגבוהה והמרשימה של {dest_clean} עם מבט של 360 מעלות על קו הרקיע והסביבה.",
            "highlight": "מראה עוצר נשימה על קו הרקיע",
            "what_to_see": ["מרפסת התצפית המרכזית", "שדרת הפארק הסמוכה", "בתי הקפה מול הנוף"],
            "visitor_tips": "הצטיידו במים ונעליים נוחות והגיעו כשעה לפני השקיעה לתאורה מושלמת.",
            "recommended_hours": 2.0,
            "best_time": "אחר הצהריים (15:00–17:30)",
            "entry_fee_usd": 5.0,
            "rating": 4.8,
            "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={dest_clean}",
        }
        dining = restaurants_list[rest_idx] if restaurants_list else {
            "name": f"מסעדת ביסטרו מקומית ב{dest_clean}",
            "cuisine_style": "מטבח מקומי",
            "description": f"מסעדה מומלצת בלב {dest_clean} המגישה מנות טריות מהמטבח האזורי באווירה חמימה.",
            "signature_dish": "מנת השף המסורתית",
            "atmosphere": "חמים ומזמין",
            "booking_tip": "מומלץ להגיע סביב 12:30–13:00 או לשריין שולחן ערב קודם.",
            "kosher_note": "ישנן מנות צמחוניות ודגים; מומלץ לוודא מרכיבים במקום.",
            "price_tier": "$$",
            "avg_cost_person_usd": 32.0,
            "rating": 4.7,
            "neighborhood": "מרכז העיר",
            "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={dest_clean}",
        }

        # Pick varied evening experience & dinner recommendation per day
        area_info = neighborhood_areas[(day_num - 1) % len(neighborhood_areas)] if neighborhood_areas else {
            "area": f"מרכז {dest_clean}",
            "best_for": "מסעדות, סמטאות תוססות ובילויי ערב",
        }
        evening_dinner_pool = kosher_pool if kosher_only and kosher_pool else (gourmet_pool or restaurants_list)
        evening_dinner = evening_dinner_pool[(day_num - 1) % len(evening_dinner_pool)] if evening_dinner_pool else dining
        dinner_maps = evening_dinner.get("maps_url") or evening_dinner.get("google_maps_url")
        dinner_dish = evening_dinner.get("specialty") or evening_dinner.get("signature_dish") or "מנת הדגל של השף"
        dinner_desc = evening_dinner.get("description") or f"מוסד קולינרי אהוב ב{evening_dinner.get('neighborhood', area_info.get('area', dest_clean))}."

        if day_num % 2 == 1 and nightlife_pool:
            bar_spot = nightlife_pool[((day_num - 1) // 2) % len(nightlife_pool)]
            evening_activity = f"בילוי ערב ושיטוט ב-{bar_spot['name']} ({bar_spot.get('neighborhood', area_info.get('area', dest_clean))})"
            evening_highlight = bar_spot.get("vibe", "אווירת ערב תוססת וקוקטיילים מיוחדים")
            evening_desc = bar_spot.get("description") or (
                f"מתחילים בארוחת ערב מומלצת וממשיכים לערב באווירה מקומית ב-{bar_spot['name']} — {bar_spot.get('type', 'בר קוקטיילים')}."
            )
            evening_maps = bar_spot.get("maps_url")
            evening_tip = bar_spot.get("entry_tip") or bar_spot.get("signature_drink") or "מומלץ להזמין שולחן מראש לשעות הערב."
        elif secret_gems_pool:
            gem = secret_gems_pool[(day_num - 1) % len(secret_gems_pool)]
            evening_activity = f"שיטוט שקיעה ב{gem['name']} וארוחת ערב ב{area_info.get('area', dest_clean)}"
            evening_highlight = gem.get("why_special", "נקודת שקיעה פנורמית ופינה שקטה הרחק מהמונים")
            evening_desc = f"יציאה רגועה לקראת הדמדומים אל {gem['name']} ({gem.get('location', dest_clean)}) לספיגת האווירה והאורות, ולאחר מכן ארוחת ערב משובחת באזור {area_info.get('area', dest_clean)}."
            evening_maps = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(str(gem.get('maps_query') or gem['name']))}"
            evening_tip = f"האזור מצוין במיוחד עבור: {area_info.get('best_for', 'אווירת ערב קסומה')}."
        elif sunset_pool:
            s_spot = sunset_pool[(day_num - 1) % len(sunset_pool)]
            evening_activity = f"שקיעה ואווירת לילה ב-{s_spot['name']} ({s_spot.get('neighborhood', dest_clean)})"
            evening_highlight = s_spot.get("type", "צפייה בשקיעה ואפריטיבו מקומי")
            evening_desc = f"סיום היום ב-{s_spot['name']} שבשכונת {s_spot.get('neighborhood', dest_clean)}, בשילוב נוף מרהיב וארוחת ערב רגועה."
            evening_maps = dinner_maps
            evening_tip = "הגיעו כ-40 דקות לפני השקיעה לתפיסת מקומות טובים."
        else:
            evening_activity = f"סיור ערב ברובע {area_info.get('area', dest_clean)}"
            evening_highlight = f"הליכה בין רחובות מוארים המתאימים ל{area_info.get('best_for', 'בילויי ערב וקולינריה')}"
            evening_desc = f"ערב רגוע ב{area_info.get('area', dest_clean)}: מתחילים בהליכה בין הרחובות והכיכרות המוארות ומסיימים בארוחת ערב עשירה וקינוח מקומי."
            evening_maps = dinner_maps
            evening_tip = culinary_data.get("reservation_tip", "מומלץ לשריין שולחן מראש למסעדות הערב.")

        # Calculate calendar date for this day
        try:
            current_day_dt = dt_start + timedelta(days=day_num - 1)
            current_day_formatted = current_day_dt.strftime("%d/%m/%Y")
        except Exception:
            current_day_formatted = f"יום {day_num}"

        day_tip = neighborhood_data.get("local_tips", ["הקפידו לשתות מים מרובים"])[(day_num - 1) % max(1, len(neighborhood_data.get("local_tips", [1])))]

        total_hours_day = round(float(att1.get("recommended_hours", 2.5)) + float(att2.get("recommended_hours", 2.0)), 1)
        day_summary = (
            f"יום שמוקדש לשילוב של {att1.get('category', 'תרבות')} וטעמים מקומיים: "
            f"בבוקר נחקור לעומק את {att1['name']}, בצהריים נעצור לארוחה מומלצת ב-{dining['name']} ({dining.get('neighborhood', 'מרכז העיר')}), "
            f"נמשיך אחר הצהריים ל-{att2['name']}, ונחתום את היום ב{area_info.get('area', dest_clean)}."
        )
        pacing_note = (
            f"קצב מומלץ: כ-{total_hours_day} שעות סיור נטו | התניידות: "
            f"{transit_data.get('pass_name', neighborhood_data.get('recommended_transit', 'תחבורה ציבורית והליכה רגלית'))}"
        )

        structured_days.append({
            "day_number": day_num,
            "date_formatted": current_day_formatted,
            "title": f"יום {day_num}: {att1.get('category', 'תרבות וסיורים')} וקולינריה מקומית",
            "summary": day_summary,
            "pacing_note": pacing_note,
            "morning": {
                "time": "09:00 - 12:30",
                "activity": att1["name"],
                "category": att1.get("category", "אתר תרבות וסיור"),
                "description": att1.get("description") or att1.get("highlight", ""),
                "highlight": att1.get("highlight", att1.get("description", "")),
                "what_to_see": att1.get("what_to_see", []),
                "visitor_tips": att1.get("visitor_tips", ""),
                "recommended_hours": att1.get("recommended_hours", 2.5),
                "best_time": att1.get("best_time", "שעות הבוקר"),
                "cost_usd": att1.get("entry_fee_usd", 0.0),
                "maps_url": att1.get("google_maps_url"),
                "rating": att1.get("rating", 4.7),
            },
            "afternoon": {
                "time": "13:00 - 17:30",
                "dining": dining["name"],
                "dining_description": dining.get("description", ""),
                "dining_cuisine": dining.get("cuisine_style", "מטבח מקומי"),
                "dining_atmosphere": dining.get("atmosphere", ""),
                "dining_price_tier": dining.get("price_tier", "$$"),
                "dining_avg_cost_usd": dining.get("avg_cost_person_usd", 32.0),
                "dining_rating": dining.get("rating", 4.7),
                "dining_booking_tip": dining.get("booking_tip", ""),
                "dining_kosher_note": dining.get("kosher_note", ""),
                "signature_dish": dining.get("signature_dish", "מנות אותנטיות מומלצות"),
                "neighborhood": dining.get("neighborhood", "מרכז העיר"),
                "dining_maps_url": dining.get("google_maps_url"),
                "activity": att2["name"],
                "activity_category": att2.get("category", "אטרקציה ונוף"),
                "activity_description": att2.get("description") or att2.get("highlight", ""),
                "activity_highlight": att2.get("highlight", att2.get("description", "")),
                "activity_what_to_see": att2.get("what_to_see", []),
                "activity_visitor_tips": att2.get("visitor_tips", ""),
                "activity_recommended_hours": att2.get("recommended_hours", 2.0),
                "activity_best_time": att2.get("best_time", "שעות אחר הצהריים"),
                "activity_cost_usd": att2.get("entry_fee_usd", 0.0),
                "activity_rating": att2.get("rating", 4.7),
                "activity_maps_url": att2.get("google_maps_url"),
            },
            "evening": {
                "time": "18:30 - 22:00",
                "activity": evening_activity,
                "description": evening_desc,
                "highlight": evening_highlight,
                "neighborhood": area_info.get("area", dest_clean),
                "maps_url": evening_maps,
                "dining_name": evening_dinner.get("name"),
                "dining_description": dinner_desc,
                "dining_dish": dinner_dish,
                "dining_maps_url": dinner_maps,
                "evening_tip": evening_tip,
            },
            "local_tip": day_tip,
        })

    # 8. Synthesize Rich Markdown Representation
    style_names = {"budget": "חסכוני / תרמילאי", "balanced": "מאוזן (איכות ומחיר)", "luxury": "יוקרתי ומפנק"}
    style_hebrew = style_names.get(travel_style, travel_style)
    status_badge = (
        "🟢 **אושר - במסגרת התקציב (APPROVED)**"
        if budget_report["audit_status"] == "APPROVED"
        else "🔴 **חריגה מהתקציב - נדרשת התאמה (OVER_BUDGET)**"
    )

    md_lines = [
        f"# 🌍 תוכנית מסע אוטונומית: {days} ימים ב{dest_clean}",
        f"**תאריך המראה:** {israeli_start_date} | **מוצא:** {orig_clean} | **סגנון נסיעה:** {style_hebrew}\n",
        f"### סטטוס ביקורת תקציב: {status_badge}",
        f"- **עלות כוללת צפויה:** ${budget_report['total_projected_expenses_usd']:,.2f} USD ({budget_report['total_projected_expenses_ils']:,.0f} ₪)",
        f"- **תקציב יעד מוגדר:** ${total_budget:,.2f} USD ({budget_report['total_budget_ils']:,.0f} ₪)",
        f"- **כרית ביטחון משוריינת (10%):** ${budget_report['itemized_breakdown']['contingency_buffer']['amount_usd']:,.2f} USD\n",
        "---",
        "## ✈️ טיסות ומקום לינה נבחר",
        f"- **טיסה מומלצת**: [{rec_flight['airline']} - טיסה {rec_flight['flight_number']}]({rec_flight['booking_url']})",
        f"  - **מסלול**: {orig_clean} ➔ {dest_clean} | משך טיסה: {rec_flight.get('duration', 'ישיר')} | עצירות: {rec_flight.get('stops', 0)}",
        f"  - **מחיר משוער**: **${rec_flight['price_usd']:,.2f} USD** | {rec_flight.get('benchmark_note', '')}",
        f"- **מקום לינה נבחר**: [**{selected_hotel['name']}**]({selected_hotel.get('google_maps_url', '#')}) ({selected_hotel.get('stars', 4)} כוכבים, דירוג {selected_hotel.get('rating', 4.8)}/5)",
        f"  - **אזור / שכונה**: {selected_hotel.get('neighborhood', 'מרכז העיר')}",
        f"  - **עלות לילה**: ${selected_hotel.get('nightly_rate_usd', 0):,.2f} (סך הכל ל-{days} לילות: **${hotel_cost:,.2f} USD**)",
        f"  - **מתקנים**: {', '.join(selected_hotel.get('amenities', []))}\n",
        "---",
        "## 📅 לוח זמנים מפורט יום-אחר-יום\n",
    ]

    for day in structured_days:
        m = day["morning"]
        a = day["afternoon"]
        e = day["evening"]
        md_lines.extend([
            f"### 📍 {day['title']} ({day['date_formatted']})",
            f"*{day['summary']}* ({day['pacing_note']})",
            f"- **🌅 בוקר ({m['time']})**: ביקור ב[{m['activity']}]({m['maps_url']}) ({m.get('category', '')}, כ-{m.get('recommended_hours', 2.5)} שעות, דמי כניסה: ${m['cost_usd']:.2f}, דירוג: {m['rating']}/5).",
            f"  - *הסבר מפורט*: {m.get('description') or m['highlight']}",
            f"  - *דגש מרכזי*: {m['highlight']}",
        ])
        if m.get("what_to_see"):
            md_lines.append(f"  - *מה לא לפספס*: {', '.join(m['what_to_see'])}")
        if m.get("visitor_tips"):
            md_lines.append(f"  - *טיפ למבקרים*: {m['visitor_tips']}")
        md_lines.extend([
            f"- **🍽️ ארוחת צהריים**: [{a['dining']}]({a['dining_maps_url']}) ({a['neighborhood']} • {a.get('dining_cuisine', '')}, רמת מחיר {a.get('dining_price_tier', '$$')}).",
            f"  - *על המסעדה*: {a.get('dining_description', '')} | *מנת דגל*: {a['signature_dish']}.",
        ])
        if a.get("dining_booking_tip"):
            md_lines.append(f"  - *טיפ הזמנה*: {a['dining_booking_tip']}")
        md_lines.extend([
            f"- **🏛️ אחר הצהריים ({a['time']})**: המשך סיור ב[{a['activity']}]({a['activity_maps_url']}) ({a.get('activity_category', '')}, דמי כניסה: ${a.get('activity_cost_usd', 0.0):.2f}).",
            f"  - *הסבר מפורט*: {a.get('activity_description') or a.get('activity_highlight', '')}",
        ])
        if a.get("activity_what_to_see"):
            md_lines.append(f"  - *נקודות מרכזיות*: {', '.join(a['activity_what_to_see'])}")
        md_lines.extend([
            f"- **🌙 ערב ({e['time']})**: {e['activity']} — {e.get('description') or e['highlight']}",
            f"  - *המלצת ערב / מסעדה*: {e.get('dining_name', '')} ({e.get('dining_dish', '')}). {e.get('evening_tip', '')}",
            f"- **💡 טיפ מקומי**: {day['local_tip']}\n",
        ])

    md_lines.extend([
        "---",
        "## 🌤️ אקלים, מזג אוויר וביגוד מומלץ",
        f"- **תנאי מזג אוויר צפויים**: {weather_data['metrics']['condition']}",
        f"- **טמפרטורה ממוצעת**: ביום {weather_data['metrics']['temp_high']}°C | בלילה {weather_data['metrics']['temp_low']}°C",
        f"- **סיכוי למשקעים**: {weather_data['metrics']['rain_chance']}% | **מדד UV**: {weather_data['metrics']['uv_index']}",
        f"- **שקע חשמל ומתח**: {weather_data['metrics']['plug_type']}",
        f"- **המלצת ביגוד**: {weather_data['metrics']['clothing_tip']}\n",
        "---",
        "## 🛡️ ביטחון, ויזות ומסמכים",
        f"- **דרישות ויזה וכניסה**: {safety_data['advisory']['visa_requirement']}",
        f"- **רמת בטיחות כללית**: {safety_data['advisory']['safety_level']}",
        f"- **מספרי חירום במקום**: משטרה: {safety_data['advisory']['emergency_numbers']['police']} | אמבולנס: {safety_data['advisory']['emergency_numbers']['ambulance']} | שגרירות: {safety_data['advisory']['emergency_numbers']['embassy_contact']}",
        f"- **הנחיות בריאות ומים**: {safety_data['advisory']['health_advice']}\n",
        "---",
        "## 🎭 פנינות נסתרות ואירועים מיוחדים",
    ])

    for gem in events_data.get("culture_and_events", {}).get("secret_gems", [])[:2]:
        md_lines.append(f"- 💎 **{gem['name']}** ({gem['location']}): {gem['why_special']}")

    for fest in events_data.get("culture_and_events", {}).get("festivals", [])[:2]:
        md_lines.append(f"- 🎪 **{fest['name']}** ({fest['frequency']}): {fest['description']}")

    fx_ils_rate = float((budget_report.get("exchange_rates") or {}).get("ILS", 3.70))
    md_lines.extend([
        "\n---",
        "## 💰 ביקורת תקציב ופירוט פיננסי מלא",
        "| קטגוריה | עלות (USD) | עלות (₪) | אחוז מהתקציב |",
        "| :--- | :--- | :--- | :--- |",
        f"| ✈️ טיסות | ${budget_report['itemized_breakdown']['flights']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['flights']['amount_usd'] * fx_ils_rate:,.0f} ₪ | {budget_report['itemized_breakdown']['flights']['percentage']}% |",
        f"| 🏨 לינה ומלון | ${budget_report['itemized_breakdown']['accommodation']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['accommodation']['amount_usd'] * fx_ils_rate:,.0f} ₪ | {budget_report['itemized_breakdown']['accommodation']['percentage']}% |",
        f"| 🍽️ אוכל והסעדה | ${budget_report['itemized_breakdown']['food_and_dining']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['food_and_dining']['amount_usd'] * fx_ils_rate:,.0f} ₪ | {budget_report['itemized_breakdown']['food_and_dining']['percentage']}% |",
        f"| 🎟️ אטרקציות וסיורים | ${budget_report['itemized_breakdown']['activities_and_tours']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['activities_and_tours']['amount_usd'] * fx_ils_rate:,.0f} ₪ | {budget_report['itemized_breakdown']['activities_and_tours']['percentage']}% |",
        f"| 🚇 תחבורה מקומית | ${budget_report['itemized_breakdown']['local_transit']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['local_transit']['amount_usd'] * fx_ils_rate:,.0f} ₪ | {budget_report['itemized_breakdown']['local_transit']['percentage']}% |",
        f"| 🛡️ כרית ביטחון (בלת\"ם 10%) | ${budget_report['itemized_breakdown']['contingency_buffer']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['contingency_buffer']['amount_usd'] * fx_ils_rate:,.0f} ₪ | {budget_report['itemized_breakdown']['contingency_buffer']['percentage']}% |",
        f"| **סך הכל עלות משוערת** | **${budget_report['total_projected_expenses_usd']:,.2f}** | **{budget_report['total_projected_expenses_ils']:,.0f} ₪** | **100%** |",
        f"| **תקציב יעד מוגדר** | **${total_budget:,.2f}** | **{budget_report['total_budget_ils']:,.0f} ₪** | - |",
        f"| **יתרה / עודף תקציבי** | **${budget_report['remaining_balance_usd']:,.2f}** | **{budget_report['remaining_balance_ils']:,.0f} ₪** | - |\n",
        "### המלצות מבקר התקציב:",
    ])

    for rec in budget_report.get("recommendations", []):
        md_lines.append(f"- {rec}")

    # 8. Specialized Calendar, Sentinel & Briefings Agents (using enriched structured_days)

    calendar_data = generate_trip_calendar_pack(
        dest_clean,
        start_date,
        days,
        structured_days=structured_days,
        flight_info=rec_flight,
        hotel_info=selected_hotel,
    )

    sentinel_raw = get_ground_sentinel_alerts(dest_clean)
    sentinel_data = json.loads(sentinel_raw)

    briefing_raw = generate_whatsapp_daily_briefings(
        dest_clean,
        days,
        structured_days,
        weather_metrics=weather_data.get("metrics"),
    )
    briefing_data = json.loads(briefing_raw)

    # RAG Retrieval Phase: pull top curated destination & Israeli traveler handbook insights (plus personal RAG)
    kb = get_knowledge_base()
    rag_query = f"{dest_clean} {' '.join(interests or [])} transit visa kosher tax-free tlv".strip()
    rag_hits = kb.retrieve(
        query=rag_query,
        destination=dest_clean,
        top_k=4,
        owner_user_id=user_id if user_id and user_id != "guest_user" else None,
    )

    # Sprint 8 & 9 Specialists: Memory, Shabbat/Halacha, Connectivity, Protection, Loyalty, Group Split
    traveler_mem = load_traveler_memory(user_id)
    effective_shabbat = bool(shabbat_safe_mode or traveler_mem.get("shabbat_observant"))
    effective_kosher = bool(kosher_only or traveler_mem.get("kosher_level", "none") != "none")
    shabbat_data = json.loads(
        get_shabbat_halacha_schedule(dest_clean, start_date, days, shabbat_safe_mode=effective_shabbat)
    )
    connectivity_data = json.loads(
        get_connectivity_and_mobility_guide(dest_clean, days, travelers=travelers, travel_style=travel_style)
    )
    protection_data = json.loads(
        get_protection_and_rerouting_plan(dest_clean, flight_info=rec_flight, interests=interests, travelers=travelers)
    )
    loyalty_data = json.loads(
        get_loyalty_and_vault_readiness(
            destination=dest_clean,
            start_date=start_date,
            duration_days=days,
            flight_cost_usd=flight_cost,
            airline=str(rec_flight.get("airline") or "EL AL"),
            passport_expiry=traveler_mem.get("passport_expiry"),
            loyalty_programs=traveler_mem.get("loyalty_programs"),
        )
    )
    group_data = json.loads(
        compute_group_cost_split(
            travelers=travelers,
            flight_cost_per_trip=flight_cost,
            hotel_cost_total=hotel_cost,
            activities_cost_total=activities_cost,
            duration_days=days,
            fx_ils_rate=fx_ils_rate,
            fx_eur_rate=float((budget_report.get("exchange_rates") or {}).get("EUR", 0.92)),
        )
    )

    # Reasoning Engine Audit: 4-step Chain-of-Thought consistency check
    reasoning_trace = run_reasoning_audit(
        origin=orig_clean,
        destination=dest_clean,
        start_date=start_date,
        duration_days=days,
        total_budget=total_budget,
        budget_report=budget_report,
        rag_hits=rag_hits,
        safety_info=safety_data.get("advisory"),
        structured_days=structured_days,
        travel_style=travel_style,
    )

    md_lines.extend([
        "\n---",
        "## 🚇 תחבורה והתניידות מקומית",
        f"- **כרטיס תחבורה מומלץ**: {transit_data['pass_name']} (עלות יומית משוערת: ${transit_data['estimated_daily_cost_usd']:.2f})",
        f"- **הגעה מנמל התעופה**: {transit_data['airport_transfer']}",
        f"- **ציון נגישות בהליכה**: {transit_data['walking_score']}/10 | **אפליקציות ניווט מומלצות**: {', '.join(transit_data['recommended_apps'])}",
        f"- **טיפ התניידות מקומי**: {transit_data['local_transit_tip']}\n",
        "---",
        "## 🍽️ קולינריה, כשרות וחיי לילה",
        f"- **מנות דגל שחובה לטעום**: {', '.join(culinary_data['specialties'])}",
        f"- **אפשרויות כשרות / חב\"ד**: {culinary_data['kosher_options'][0]['name']} ({culinary_data['kosher_options'][0]['specialty']})",
        f"- **מוסד גורמה נבחר**: {culinary_data['gourmet_dining'][0]['name']} ({culinary_data['gourmet_dining'][0]['neighborhood']})",
        f"- **בר וחיי לילה מומלצים**: {culinary_data['nightlife_spots'][0]['name']} — {culinary_data['nightlife_spots'][0]['vibe']}",
        f"- **מדיניות טיפים**: {culinary_data['tipping_etiquette']}\n",
        "---",
        "## 🛍️ שופינג ופטור ממס (Tax-Free)",
        f"- **שיעור מע\"מ (VAT)**: {shopping_data['vat_rate']} | **סף מינימום לחשבונית**: {shopping_data['min_spend_per_receipt']}",
        f"- **החזר מע\"מ צפוי לקנייה של $350**: ~${shopping_data['projected_vat_refund_usd']:.2f} USD ({shopping_data['projected_vat_refund_ils']:.0f} ₪)",
        f"- **מערכת אימות בשדה**: {shopping_data['kiosk_system']}",
        f"- **מתחמי שופינג מובילים**: {', '.join(shopping_data['shopping_districts'][:2])}\n",
        "---",
        "## 🚨 מודיעין שטח ובטיחות מקומית",
        f"- **מדד סיכון לשביתות**: {sentinel_data['strike_risk_index']}",
        f"- **סטטוס בטיחות כללי**: {sentinel_data['safety_badge']}",
        f"- **מוקד חירום קונסולרי**: {sentinel_data['embassy_emergency_contact']}",
        f"- **אזהרת כייסים/הונאות**: {sentinel_data['security_advisories'][0]}\n",
    ])

    if rag_hits:
        md_lines.extend(["---", "## 📚 תובנות מאגר הידע (RAG Vector Store)"])
        for hit in rag_hits[:3]:
            md_lines.append(f"- **{hit['title']}** *(התאמה: {int(hit['score'] * 100)}%)*: {hit['content'][:220]}...")
        md_lines.append("")

    md_lines.extend([
        "---",
        f"## 🧠 ביקורת חשיבה ובקרת איכות (Reasoning Engine • {reasoning_trace['reasoning_model']})",
        f"- **ציון ביטחון (Confidence)**: {int(reasoning_trace['confidence_score'] * 100)}%",
    ])
    for step in reasoning_trace["steps"]:
        md_lines.append(f"- **שלב {step['step_id']} ({step['verdict']}) — {step['title']}**: {step['thought']}")

    full_markdown = "\n".join(md_lines)

    plan_data: Dict[str, Any] = {
        "destination": dest_clean,
        "duration_days": days,
        "start_date": start_date,
        "total_budget": total_budget,
        "markdown_plan": full_markdown,
        "flight_cost": flight_cost,
        "hotel_cost": hotel_cost,
        "activities_cost": activities_cost,
        "total_estimated": budget_report["total_projected_expenses_usd"],
        "remaining_balance": budget_report["remaining_balance_usd"],
        "budget_status": budget_report["audit_status"],
        "itemized_breakdown": budget_report["itemized_breakdown"],
        "weather_metrics": weather_data.get("metrics"),
        "packing_checklist": packing_data.get("categories", []),
        "safety_info": safety_data.get("advisory"),
        "seasonal_events": events_data.get("culture_and_events"),
        "structured_days": structured_days,
        "recommended_flight": rec_flight,
        "selected_hotel": selected_hotel,
        "start_date_formatted": israeli_start_date,
        "transit_guide": transit_data,
        "culinary_guide": culinary_data,
        "shopping_taxfree": shopping_data,
        "calendar_events": calendar_data,
        "ground_alerts": sentinel_data,
        "whatsapp_briefings": briefing_data,
        "rag_knowledge": rag_hits,
        "reasoning_trace": reasoning_trace,
        "shabbat_halacha": shabbat_data,
        "connectivity_mobility": connectivity_data,
        "protection_rerouting": protection_data,
        "loyalty_vault": loyalty_data,
        "group_breakdown": group_data,
        "traveler_memory": {
            "user_id": traveler_mem.get("user_id"),
            "shabbat_observant": effective_shabbat,
            "kosher_only": effective_kosher,
            "accessibility_mode": bool(accessibility_mode or traveler_mem.get("accessibility_mode")),
            "passport_check": loyalty_data["readiness_vault"]["passport_check"],
        },
    }
    plan_data["critic_audit"] = run_trip_critic_audit(
        plan_data=plan_data,
        origin=orig_clean,
        destination=dest_clean,
        start_date=start_date,
        duration_days=days,
        total_budget=total_budget,
        shabbat_safe_mode=effective_shabbat,
    )
    try:
        from app.tools.pulse_negotiator_tools import negotiate_travel_bundle

        est_ils = round(float(plan_data.get("total_estimated", 0.0)) * float(fx_ils_rate or 3.7), 2)
        negotiation = negotiate_travel_bundle(
            destination=dest_clean,
            base_total_ils=max(500.0, est_ils),
            travelers=travelers,
            components=["FLIGHT", "BOUTIQUE_HOTEL", "TRANSFER_ESIM"],
            loyalty_tier="PLATINUM",
            target_discount_pct=12.0,
        )
        plan_data["track_h_insights"] = {
            "acp_ready": True,
            "price_guard_days": 30,
            "bundle_negotiation": negotiation,
        }
    except Exception:
        plan_data["track_h_insights"] = {"acp_ready": True, "price_guard_days": 30}
    return validate_trip_output(plan_data, total_budget)


async def stream_multi_agent_execution(
    origin: str,
    destination: str,
    start_date: str,
    duration_days: int,
    total_budget: float,
    interests: List[str],
    travel_style: str = "balanced",
    currency: str = "USD",
    session_id: str = "default_session",
    travelers: int = 2,
    return_date: Optional[str] = None,
    shabbat_safe_mode: bool = False,
    kosher_only: bool = False,
    accessibility_mode: bool = False,
    user_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Streams real-time Server-Sent Events (SSE) representing multi-agent deliberation.
    Runs live Agno Team orchestrator when GEMINI_API_KEY is configured, falling back
    seamlessly to synthesize_deterministic_plan if absent or on error.
    """
    def format_sse(event: str, data: Dict[str, Any]) -> str:
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

    validate_trip_input(
        origin=origin,
        destination=destination,
        start_date=start_date,
        duration_days=duration_days,
        total_budget=total_budget,
    )

    det_task = asyncio.create_task(
        asyncio.to_thread(
            synthesize_deterministic_plan,
            origin=origin,
            destination=destination,
            start_date=start_date,
            duration_days=duration_days,
            total_budget=total_budget,
            interests=interests,
            travel_style=travel_style,
            currency=currency,
            travelers=travelers,
            return_date=return_date,
            shabbat_safe_mode=shabbat_safe_mode,
            kosher_only=kosher_only,
            accessibility_mode=accessibility_mode,
            user_id=user_id,
        )
    )

    # Stage 1: Lead Orchestrator Initialization
    yield format_sse("step", {
        "agent": "travel_orchestrator",
        "stage": "ROUTING",
        "status": "active",
        "title": "[STAGE: ROUTING] סוכן התזמור הראשי אותחל",
        "message": (
            f"מנתח את העדפות הנסיעה עבור {destination} "
            f"({duration_days} ימים, {travelers} נוסעים, תקציב: ${total_budget:,.2f} {currency})..."
        ),
    })
    await asyncio.sleep(0.15)

    # Stage 1.5: Traveler Memory & Personal RAG
    yield format_sse("step", {
        "agent": "travel_memory_agent",
        "stage": "MEMORY",
        "status": "running",
        "title": "[STAGE: MEMORY] סוכן זיכרון מטייל והעדפות אישיות",
        "message": "טוען העדפות כשרות, שבת, נגישות ובודק חלון תוקף דרכון...",
    })
    await asyncio.sleep(0.15)

    # Stage 2: Flight & Lodging Specialist
    yield format_sse("step", {
        "agent": "flight_hotel_agent",
        "stage": "FLIGHTS",
        "status": "running",
        "title": "[STAGE: FLIGHTS] סוכן טיסות ומלונות",
        "message": f"סורק מסלולי טיסה מ-{origin.upper()} ל-{destination} ומאתר מלונות בדירוג 4.5+...",
    })
    await asyncio.sleep(0.3)

    search_flights(origin, destination, start_date)
    yield format_sse("tool_call", {
        "agent": "flight_hotel_agent",
        "tool": "search_flights",
        "summary": f"נמצאו טיסות מדורגות עם כבודה וקישור הזמנה ישיר ל-Google Flights.",
    })
    await asyncio.sleep(0.25)

    search_accommodations(destination, start_date, start_date, budget_tier=travel_style)
    yield format_sse("tool_call", {
        "agent": "flight_hotel_agent",
        "tool": "search_accommodations",
        "summary": f"אותרו מלונות בוטיק וריזורטים בדירוג גבוה עם קישורי Google Maps.",
    })
    await asyncio.sleep(0.25)

    # Stage 3: Itinerary Specialist
    yield format_sse("step", {
        "agent": "itinerary_agent",
        "stage": "PLACES",
        "status": "running",
        "title": "[STAGE: PLACES] סוכן מסלולים ואטרקציות",
        "message": f"בונה חלוקה מפורטת של בוקר, צהריים וערב בהתאם לתחומי העניין: {', '.join(interests or ['סיור כללי'])}...",
    })
    await asyncio.sleep(0.3)

    search_attractions(destination, interests)
    yield format_sse("tool_call", {
        "agent": "itinerary_agent",
        "tool": "search_attractions",
        "summary": f"נטענו אטרקציות מובילות, זמני שהות וקישורי מפות ישירים.",
    })
    await asyncio.sleep(0.25)

    search_restaurants(destination)
    yield format_sse("tool_call", {
        "agent": "itinerary_agent",
        "tool": "search_restaurants",
        "summary": f"נבחרו מסעדות שף מקומיות וחוויות קולינריות אזוריות.",
    })
    await asyncio.sleep(0.25)

    # Stage 4: Weather & Packing Specialist (NEW AGENT)
    yield format_sse("step", {
        "agent": "weather_packing_agent",
        "stage": "WEATHER",
        "status": "running",
        "title": "[STAGE: WEATHER] סוכן אקלים ואריזה חכמה",
        "message": f"מחשב ממוצעי טמפרטורה, לחות ומשקעים עבור {destination} ומייצר צ'קליסט אריזה אינטראקטיבי...",
    })
    await asyncio.sleep(0.3)

    get_destination_weather(destination, start_date, duration_days)
    yield format_sse("tool_call", {
        "agent": "weather_packing_agent",
        "tool": "get_destination_weather",
        "summary": "הופקו מדדי אקלים עונתיים, שקעי חשמל והמלצות ביגוד מותאמות.",
    })
    await asyncio.sleep(0.25)

    # Stage 5: Safety Advisory Specialist (NEW AGENT)
    yield format_sse("step", {
        "agent": "safety_advisory_agent",
        "stage": "SAFETY",
        "status": "running",
        "title": "[STAGE: SAFETY] סוכן ביטחון, ויזות ובריאות",
        "message": f"מוודא מדיניות ויזה, תוקף דרכון מנדטורי, הנחיות מים ומספרי חירום מקומיים...",
    })
    await asyncio.sleep(0.3)

    get_safety_and_visa_info(destination, nationality="IL")
    yield format_sse("tool_call", {
        "agent": "safety_advisory_agent",
        "tool": "get_safety_and_visa_info",
        "summary": "הופק תדריך ביטחון מלא: תוקף דרכון, מוקדי חירום מקומיים וטיפים למניעת הונאות.",
    })
    await asyncio.sleep(0.25)

    # Stage 6: Culture & Hidden Gems Specialist (NEW AGENT)
    yield format_sse("step", {
        "agent": "culture_events_agent",
        "stage": "CULTURE",
        "status": "running",
        "title": "[STAGE: CULTURE] סוכן אירועים עונתיים וספוטים סודיים",
        "message": f"מאתר פסטיבלים עונתיים, רופטופים לשקיעה ונקודות חבויות הרחק מההמונים...",
    })
    await asyncio.sleep(0.3)

    search_seasonal_events_and_gems(destination)
    yield format_sse("tool_call", {
        "agent": "culture_events_agent",
        "tool": "search_seasonal_events_and_gems",
        "summary": "נמצאו פנינות נסתרות (Hidden Gems), נקודות תצפית שקיעה ואירועים חיים.",
    })
    await asyncio.sleep(0.25)

    # Stage 7: Financial & Budget Auditor
    yield format_sse("step", {
        "agent": "budget_agent",
        "stage": "BUDGET",
        "status": "running",
        "title": "[STAGE: BUDGET] סוכן מבקר תקציב פיננסי",
        "message": f"מבצע ביקורת תקציב קפדנית, שריון 10% כרית ביטחון והמרת מטבעות (₪ / $)...",
    })
    await asyncio.sleep(0.3)

    # Synthesize complete plan data (live Agno Team when configured, deterministic fallback otherwise)
    plan_data: Optional[Dict[str, Any]] = None
    gemini_key = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY", "")
    if AGNO_AVAILABLE and travel_orchestrator is not None and gemini_key:
        try:
            live_prompt = (
                f"Plan a complete {duration_days}-day trip from {origin} to {destination} "
                f"starting on {start_date} with a total budget of ${total_budget:.2f} {currency}. "
                f"Travel style: {travel_style}. Interests: {', '.join(interests or ['general'])}. "
                f"Use Israeli date format DD/MM/YYYY and ensure all budget numbers are consistent."
            )
            run_output = await travel_orchestrator.arun(
                live_prompt,
                session_id=session_id,
                output_schema=TripPlanResponse,
            )
            content = getattr(run_output, "content", run_output)
            if isinstance(content, TripPlanResponse):
                candidate = content.model_dump()
            elif isinstance(content, dict):
                candidate = dict(content)
            elif isinstance(content, str):
                parsed = json.loads(content)
                candidate = parsed if isinstance(parsed, dict) else None
            else:
                candidate = None

            if candidate:
                plan_data = validate_trip_output(candidate, total_budget)
        except Exception as exc:
            logger.warning(f"Live Agno Team execution failed, falling back to deterministic plan: {exc}")
            plan_data = None

    det_plan = await det_task
    if plan_data is None:
        plan_data = det_plan
    else:
        for k in (
            "shabbat_halacha",
            "connectivity_mobility",
            "protection_rerouting",
            "loyalty_vault",
            "group_breakdown",
            "traveler_memory",
            "critic_audit",
        ):
            if not plan_data.get(k):
                plan_data[k] = det_plan.get(k)

    _SESSION_PLANS[session_id] = plan_data

    yield format_sse("tool_call", {
        "agent": "budget_agent",
        "tool": "calculate_trip_budget",
        "summary": (
            f"סטטוס: {plan_data['budget_status']} | "
            f"סך הכל: ${plan_data['total_estimated']:,.2f} (כרית ביטחון 10% כלולה)."
        ),
    })
    await asyncio.sleep(0.2)

    # Stage 8: Transit & Navigation Specialist
    transit_guide = plan_data.get("transit_guide") or json.loads(get_transit_guide(destination, duration_days))
    yield format_sse("step", {
        "agent": "transit_agent",
        "stage": "TRANSIT",
        "status": "running",
        "title": "[STAGE: TRANSIT] סוכן ניווט ותחבורה מקומית",
        "message": f"מנתח חיבורי שדה תעופה, קווי מטרו וכרטיסי מעבר יומיים מומלצים עבור {destination}...",
    })
    await asyncio.sleep(0.25)

    yield format_sse("tool_call", {
        "agent": "transit_agent",
        "tool": "get_transit_guide",
        "summary": (
            f"כרטיס מומלץ: {transit_guide['pass_name']} | "
            f"ציון הליכה: {transit_guide['walking_score']}/10."
        ),
    })
    await asyncio.sleep(0.2)

    # Stage 9: Culinary, Kosher & Nightlife Specialist
    culinary_guide = plan_data.get("culinary_guide") or json.loads(get_culinary_guide(destination, interests))
    yield format_sse("step", {
        "agent": "culinary_agent",
        "stage": "CULINARY",
        "status": "running",
        "title": "[STAGE: CULINARY] סוכן קולינריה, כשרות וחיי לילה",
        "message": f"סורק מסעדות שף אותנטיות, מוקדי כשרות / חב\"ד וברים מחתרתיים ב{destination}...",
    })
    await asyncio.sleep(0.25)

    yield format_sse("tool_call", {
        "agent": "culinary_agent",
        "tool": "get_culinary_guide",
        "summary": (
            f"נמצאו אפשרויות כשרות: {culinary_guide['kosher_options'][0]['name']} "
            "ומסעדות גורמה מובילות."
        ),
    })
    await asyncio.sleep(0.2)

    # Stage 10: Smart Shopper & Tax-Free Specialist
    shopping_taxfree = plan_data.get("shopping_taxfree") or json.loads(
        get_shopping_and_tax_free(destination, estimated_shopping_budget_usd=350.0)
    )
    yield format_sse("step", {
        "agent": "shopping_taxfree_agent",
        "stage": "SHOPPING",
        "status": "running",
        "title": "[STAGE: SHOPPING] סוכן שופינג ופטור ממס (Tax-Free)",
        "message": f"מחשב ספי החזר מע\"מ, שיעורי Tax-Free ואאוטלטים מובילים עבור {destination}...",
    })
    await asyncio.sleep(0.25)

    yield format_sse("tool_call", {
        "agent": "shopping_taxfree_agent",
        "tool": "get_shopping_and_tax_free",
        "summary": (
            f"שיעור מע\"מ: {shopping_taxfree['vat_rate']} | "
            f"החזר צפוי: ${shopping_taxfree['projected_vat_refund_usd']:.2f} USD."
        ),
    })
    await asyncio.sleep(0.2)

    # Stage 11: Calendar & Workspace Specialist
    calendar_events = plan_data.get("calendar_events") or generate_trip_calendar_pack(
        destination,
        start_date,
        duration_days,
        structured_days=plan_data.get("structured_days"),
        flight_info=plan_data.get("recommended_flight"),
        hotel_info=plan_data.get("selected_hotel"),
    )
    yield format_sse("step", {
        "agent": "calendar_sync_agent",
        "stage": "CALENDAR",
        "status": "running",
        "title": "[STAGE: CALENDAR] סוכן סנכרון יומנים ומסמכים",
        "message": "יוצר קישורי סנכרון ל-Google Calendar וקובץ iCalendar (.ics) מלא לכל ימי המסע...",
    })
    await asyncio.sleep(0.25)

    yield format_sse("tool_call", {
        "agent": "calendar_sync_agent",
        "tool": "generate_trip_calendar_pack",
        "summary": "הופק קובץ יומן מלא (.ics) עם התראות שעה לפני פעילויות וקישור Google Calendar.",
    })
    await asyncio.sleep(0.2)

    # Stage 12: Ground Sentinel & Realtime Alerts
    ground_alerts = plan_data.get("ground_alerts") or json.loads(get_ground_sentinel_alerts(destination))
    yield format_sse("step", {
        "agent": "ground_sentinel_agent",
        "stage": "SENTINEL",
        "status": "running",
        "title": "[STAGE: SENTINEL] סוכן מודיעין שטח והתרעות חיות",
        "message": f"מנטר סיכוני שביתות, עומסי תחבורה ופרוטוקול כייסים מקומי ב{destination}...",
    })
    await asyncio.sleep(0.25)

    yield format_sse("tool_call", {
        "agent": "ground_sentinel_agent",
        "tool": "get_ground_sentinel_alerts",
        "summary": (
            f"מדד שביתות: {ground_alerts['strike_risk_index']} | "
            f"סטטוס: {ground_alerts['safety_badge']}."
        ),
    })
    await asyncio.sleep(0.2)

    # Stage 13: WhatsApp Butler & Daily Briefings
    whatsapp_briefings = plan_data.get("whatsapp_briefings") or json.loads(
        generate_whatsapp_daily_briefings(
            destination,
            duration_days,
            plan_data.get("structured_days") or [],
            weather_metrics=plan_data.get("weather_metrics"),
        )
    )
    yield format_sse("step", {
        "agent": "whatsapp_butler_agent",
        "stage": "WHATSAPP",
        "status": "running",
        "title": "[STAGE: WHATSAPP] סוכן קונסיירז' יומי לוואטסאפ",
        "message": "מכין הודעות תדריך יומיות ערוכות לבוקר, צהריים וערב עם קישורי שיתוף בלחיצה אחת...",
    })
    await asyncio.sleep(0.25)

    yield format_sse("tool_call", {
        "agent": "whatsapp_butler_agent",
        "tool": "generate_whatsapp_daily_briefings",
        "summary": f"נוצרו {whatsapp_briefings['total_briefings']} תדריכי וואטסאפ מוכנים לשיתוף ישיר.",
    })
    await asyncio.sleep(0.2)

    # Stage 14: RAG Knowledgebase Vector Retrieval
    rag_knowledge = plan_data.get("rag_knowledge") or get_knowledge_base().retrieve(
        query=f"{destination} {' '.join(interests or [])} visa transit kosher tax-free",
        destination=destination,
        top_k=4,
    )
    yield format_sse("step", {
        "agent": "knowledge_rag_agent",
        "stage": "KNOWLEDGE_RAG",
        "status": "running",
        "title": "[STAGE: KNOWLEDGE_RAG] סוכן מאגר הידע (Vector Store RAG)",
        "message": f"מריץ חיפוש וקטורי ב-Vector Store ושולף מדריכי עומק והנחיות ישראלים עבור {destination}...",
    })
    await asyncio.sleep(0.25)

    yield format_sse("tool_call", {
        "agent": "knowledge_rag_agent",
        "tool": "search_travel_knowledge",
        "summary": (
            f"נשלפו {len(rag_knowledge)} מקטעי ידע רלוונטיים ממאגר ה-Vector Store "
            f"(התאמה עליונה: {int((rag_knowledge[0]['score'] if rag_knowledge else 0.85) * 100)}%)."
        ),
    })
    await asyncio.sleep(0.2)

    # Stage 15: Chain-of-Thought Reasoning Engine Audit
    reasoning_trace = plan_data.get("reasoning_trace") or run_reasoning_audit(
        origin=origin,
        destination=destination,
        start_date=start_date,
        duration_days=duration_days,
        total_budget=total_budget,
        budget_report={
            "total_projected_expenses_usd": plan_data["total_estimated"],
            "audit_status": plan_data["budget_status"],
            "remaining_balance_usd": plan_data["remaining_balance"],
        },
        rag_hits=rag_knowledge,
        safety_info=plan_data.get("safety_info"),
        structured_days=plan_data.get("structured_days"),
        travel_style=travel_style,
    )
    yield format_sse("step", {
        "agent": "reasoning_agent",
        "stage": "REASONING",
        "status": "running",
        "title": "[STAGE: REASONING] מנוע חשיבה ובקרת איכות (Chain-of-Thought)",
        "message": f"מבצע אימות חשיבה רב-שלבי ({reasoning_trace['reasoning_model']}) על לוחות זמנים, תקציב וויזות...",
    })
    await asyncio.sleep(0.25)

    yield format_sse("tool_call", {
        "agent": "reasoning_agent",
        "tool": "run_reasoning_audit",
        "summary": (
            f"הושלמו {len(reasoning_trace['steps'])} שלבי חשיבה • "
            f"ציון ביטחון: {int(reasoning_trace['confidence_score'] * 100)}%."
        ),
    })
    await asyncio.sleep(0.2)

    # Stage 15.5: Sprint 8 & 9 Specialists & Trip Critic Verification Gate
    yield format_sse("step", {
        "agent": "shabbat_halacha_agent",
        "stage": "SHABBAT_HALACHA",
        "status": "running",
        "title": "[STAGE: SHABBAT_HALACHA] סוכן שבת, הלכה והדלקת נרות",
        "message": f"מחשב זמני הדלקת נרות, הבדלה ומרחק הליכה לבית חב\"ד ב{destination}...",
    })
    await asyncio.sleep(0.12)

    yield format_sse("step", {
        "agent": "connectivity_mobility_agent",
        "stage": "CONNECTIVITY",
        "status": "running",
        "title": "[STAGE: CONNECTIVITY] סוכן eSIM, תקשורת ונהיגה",
        "message": "משווה חבילות eSIM מול נדידה מהארץ ובודק אזהרות ZTL/רישיון בינלאומי...",
    })
    await asyncio.sleep(0.12)

    yield format_sse("step", {
        "agent": "protection_rerouting_agent",
        "stage": "PROTECTION",
        "status": "running",
        "title": "[STAGE: PROTECTION] סוכן ביטוח, גיבוי וחוק טיבי",
        "message": "בודק הרחבות ביטוח נדרשות, סיכון קונקשן וזכאות פיצוי לפי חוק טיבי / EU261...",
    })
    await asyncio.sleep(0.12)

    yield format_sse("step", {
        "agent": "loyalty_vault_agent",
        "stage": "LOYALTY_VAULT",
        "status": "running",
        "title": "[STAGE: LOYALTY_VAULT] סוכן מועדוני תעופה וארנק טרום-טיסה",
        "message": "מחשב כדאיות מימוש נקודות, גישה לטרקלינים בנתב\"ג וטופסי כניסה דיגיטליים...",
    })
    await asyncio.sleep(0.12)

    yield format_sse("step", {
        "agent": "group_split_agent",
        "stage": "GROUP_SPLIT",
        "status": "running",
        "title": "[STAGE: GROUP_SPLIT] סוכן חלוקת עלויות קבוצתית",
        "message": f"מחשב חלוקה ל-{travelers} נוסעים, תאימות חדרים ופנקס התחשבנות ב-Bit...",
    })
    await asyncio.sleep(0.12)

    critic_audit = plan_data.get("critic_audit") or {}
    yield format_sse("step", {
        "agent": "trip_critic_agent",
        "stage": "CRITIC_AUDIT",
        "status": "running",
        "title": "[STAGE: CRITIC_AUDIT] סוכן ביקורת, אימות ותיקון עצמי",
        "message": f"מאמת תאימות נתב\"ג, שבת, גיאוגרפיה ותקציב (סטטוס: {critic_audit.get('status', 'VERIFIED')})...",
    })
    await asyncio.sleep(0.12)

    yield format_sse("step", {
        "agent": "bundle_deal_negotiator_agent",
        "stage": "TRACK_H_COMMERCE",
        "status": "running",
        "title": "[STAGE: TRACK_H_COMMERCE] סוכני ACP, Price Guard ומו\"מ באנדל",
        "message": "מכין חבילת הנחה אוטונומית (-10%/-12%), אסימון ACP והגנת מחיר ל-30 יום בשקלים...",
    })
    await asyncio.sleep(0.12)

    # Stage 16: Final Synthesis & Markdown Stream
    yield format_sse("step", {
        "agent": "travel_orchestrator",
        "stage": "SYNTHESIS",
        "status": "synthesizing",
        "title": "[STAGE: SYNTHESIS] סינתזה סופית ואיחוד דוחות",
        "message": "מרכיב דוח מסע אינטראקטיבי הכולל צ'קליסט אריזה, תחבורה, קולינריה, RAG, Reasoning וסנכרון יומן...",
    })
    await asyncio.sleep(0.2)

    # Stream markdown in readable chunks
    full_markdown = plan_data["markdown_plan"]
    words = full_markdown.split(" ")
    chunk_size = 14
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i : i + chunk_size]) + " "
        yield format_sse("chunk", {"text": chunk})
        await asyncio.sleep(0.02)

    # Stage 17: Completion
    yield format_sse("done", {
        "session_id": session_id,
        "stage": "COMPLETE",
        "budget_status": plan_data["budget_status"],
        "total_estimated": plan_data["total_estimated"],
        "remaining_balance": plan_data["remaining_balance"],
        "flight_cost": plan_data["flight_cost"],
        "hotel_cost": plan_data["hotel_cost"],
        "activities_cost": plan_data["activities_cost"],
        "breakdown": plan_data["itemized_breakdown"],
        "weather_metrics": plan_data.get("weather_metrics"),
        "packing_checklist": plan_data.get("packing_checklist"),
        "safety_info": plan_data.get("safety_info"),
        "seasonal_events": plan_data.get("seasonal_events"),
        "structured_days": plan_data.get("structured_days"),
        "recommended_flight": plan_data.get("recommended_flight"),
        "selected_hotel": plan_data.get("selected_hotel"),
        "start_date_formatted": plan_data.get("start_date_formatted"),
        "transit_guide": transit_guide,
        "culinary_guide": culinary_guide,
        "shopping_taxfree": shopping_taxfree,
        "calendar_events": calendar_events,
        "ground_alerts": ground_alerts,
        "whatsapp_briefings": whatsapp_briefings,
        "rag_knowledge": rag_knowledge,
        "reasoning_trace": reasoning_trace,
        "shabbat_halacha": plan_data.get("shabbat_halacha"),
        "connectivity_mobility": plan_data.get("connectivity_mobility"),
        "protection_rerouting": plan_data.get("protection_rerouting"),
        "loyalty_vault": plan_data.get("loyalty_vault"),
        "group_breakdown": plan_data.get("group_breakdown"),
        "traveler_memory": plan_data.get("traveler_memory"),
        "critic_audit": critic_audit,
        "track_h_insights": plan_data.get("track_h_insights"),
        "budget_overrun_flagged": plan_data.get("budget_overrun_flagged", False),
        "guardrail_warnings": plan_data.get("guardrail_warnings", []),
    })


async def run_trip_chat(session_id: str, message: str) -> Dict[str, Any]:
    """
    Execute multi-turn conversational travel planning using travel_orchestrator.arun
    backed by PostgresDb / PostgresAgentStorage memory, with deterministic session fallback.
    """
    history = _CHAT_HISTORY.setdefault(session_id, [])
    history.append({"role": "user", "content": message})

    gemini_key = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY", "")
    updated_plan: Optional[Dict[str, Any]] = None
    reply: Optional[str] = None

    if AGNO_AVAILABLE and travel_orchestrator is not None and gemini_key:
        try:
            run_output = await travel_orchestrator.arun(message, session_id=session_id)
            content = getattr(run_output, "content", run_output)
            if isinstance(content, TripPlanResponse):
                updated_plan = validate_trip_output(content.model_dump(), content.total_budget)
                _SESSION_PLANS[session_id] = updated_plan
                reply = updated_plan.get("markdown_plan", "תוכנית הנסיעה עודכנה בהצלחה.")
            elif isinstance(content, dict) and "markdown_plan" in content:
                updated_plan = content
                _SESSION_PLANS[session_id] = updated_plan
                reply = content["markdown_plan"]
            else:
                reply = str(content)
        except Exception as exc:
            logger.warning(f"Agno chat execution failed for session '{session_id}', using memory fallback: {exc}")

    if reply is None:
        cached_plan = _SESSION_PLANS.get(session_id)
        if cached_plan is None:
            try:
                from app.db.database import get_db_session
                from app.db.models import SavedTripModel

                with get_db_session() as db:
                    row = db.query(SavedTripModel).filter(SavedTripModel.session_id == session_id).first()
                    if row and row.plan_payload_json:
                        cached_plan = json.loads(row.plan_payload_json)
                        _SESSION_PLANS[session_id] = cached_plan
            except Exception:
                cached_plan = None

        turn_num = len([m for m in history if m["role"] == "user"])
        msg_lower = message.lower()
        if cached_plan and any(k in msg_lower for k in ("גשם", "rain", "מקורה", "שנה", "החלף", "תקציב", "budget", "כשר", "kosher", "swap")):
            trigger = "weather" if any(k in msg_lower for k in ("גשם", "rain", "מקורה")) else (
                "budget_cut" if any(k in msg_lower for k in ("תקציב", "budget", "זול")) else (
                    "kosher" if any(k in msg_lower for k in ("כשר", "kosher")) else "custom_edit"
                )
            )
            replan_res = apply_itinerary_swap(cached_plan, day_number=1, slot="morning", trigger_type=trigger, constraint_note=message)
            updated_plan = replan_res["updated_plan"]
            _SESSION_PLANS[session_id] = updated_plan
            diff = replan_res["diffs"][0]
            reply = (
                f"[שיחה #{turn_num} | Re-Planner פעיל] עדכנתי את יום {diff['day_number']} ({diff['slot']}): "
                f"הוחלף ל-\"{diff['after']}\". עלות מעודכנת: ${updated_plan.get('total_estimated', 0):,.2f}."
            )
        elif cached_plan:
            reply = (
                f"[שיחה #{turn_num} | זיכרון סשן {session_id}] "
                f"בהתבסס על התוכנית הפעילה שלך (תאריך יציאה {cached_plan.get('start_date_formatted', '')}, "
                f"עלות משוערת ${cached_plan.get('total_estimated', 0):,.2f}, "
                f"סטטוס תקציב: {cached_plan.get('budget_status', 'APPROVED')}): "
                f"קלטתי את בקשתך (\"{message}\") ואני זמין להתאמות נוספות של טיסות, מלונות, פעילויות ותקציב."
            )
        else:
            prior_context = history[-2]["content"] if len(history) >= 2 else ""
            context_note = f" (בהמשך להודעה הקודמת: \"{prior_context[:60]}\")" if prior_context else ""
            reply = (
                f"[שיחה #{turn_num} | סשן {session_id}] "
                f"קיבלתי את הודעתך: \"{message}\"{context_note}. "
                "ניתן לבקש תכנון טיול מלא עם יעד, תאריך יציאה ותקציב כדי שאפעיל את כל סוכני הנסיעות."
            )

    history.append({"role": "assistant", "content": reply})
    return {
        "session_id": session_id,
        "reply": reply,
        "updated_plan": updated_plan,
    }


def get_agent_storage(session_id: Optional[str] = None):
    """Initializes agent storage if Agno is available and PostgreSQL is configured."""
    if not AGNO_AVAILABLE:
        return None
    db_url = settings.database_url
    if not db_url.startswith("postgresql"):
        return None
    try:
        if PostgresDb is not None:
            return PostgresDb(session_table="travel_agent_sessions", db_url=db_url)
        elif PostgresAgentStorage is not None:
            return PostgresAgentStorage(table_name="travel_agent_sessions", db_url=db_url)
        return None
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL: {e}")
        return None


def create_specialist_agents(storage=None):
    """Instantiate specialist agents and orchestrator if model is available."""
    gemini_key = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY", "")
    model = None
    reasoning_model = None
    if AGNO_AVAILABLE and gemini_key:
        try:
            model = Gemini(id=settings.GEMINI_MODEL, api_key=gemini_key)
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini: {e}")
        try:
            reasoning_model = Gemini(id=settings.GEMINI_REASONING_MODEL, api_key=gemini_key)
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini reasoning model: {e}")
            reasoning_model = model

    if AGNO_AVAILABLE and model:
        reasoning_tools = get_agno_reasoning_tools()
        f_agent = Agent(
            name="Flight Specialist",
            role="Search flights and accommodations",
            model=model,
            tools=[search_flights, search_accommodations],
        )
        i_agent = Agent(
            name="Itinerary Specialist",
            role="Build itinerary and culinary guide grounded in RAG knowledge",
            model=model,
            tools=[
                search_attractions,
                search_restaurants,
                get_neighborhood_guide,
                search_travel_knowledge,
            ],
        )
        b_agent = Agent(
            name="Budget Specialist",
            role="Audit expenses and FX conversions",
            model=model,
            tools=[calculate_trip_budget],
        )
        w_agent = Agent(
            name="Weather Specialist",
            role="Weather & Packing",
            model=model,
            tools=[get_destination_weather, generate_packing_checklist],
        )
        s_agent = Agent(
            name="Safety Specialist",
            role="Visa, Safety & RAG Israeli Traveler Compliance",
            model=model,
            tools=[get_safety_and_visa_info, search_travel_knowledge],
        )
        c_agent = Agent(
            name="Culture Specialist",
            role="Festivals & Gems",
            model=model,
            tools=[search_seasonal_events_and_gems],
        )

        team_instructions = [
            "Coordinate specialist agents to produce complete, budget-audited travel plans.",
            "Always ground destination tips, visa rules, and transit advice using search_travel_knowledge (RAG VectorStore).",
            "Use ReasoningTools step-by-step verification for TLV Shabbat flight checks, 10% FX buffer math, and pacing.",
            "Always format Israeli dates as DD/MM/YYYY and support USD, EUR, ILS, and GBP.",
            "Preserve conversation history across turns for multi-turn trip refinement.",
        ]

        orchestrator_tools = [t for t in [search_travel_knowledge, reasoning_tools] if t is not None]

        if Team is not None:
            team_kwargs: Dict[str, Any] = {
                "name": "Travel Team Orchestrator",
                "model": model,
                "members": [f_agent, i_agent, b_agent, w_agent, s_agent, c_agent],
                "db": storage,
                "tools": orchestrator_tools,
                "instructions": team_instructions,
                "add_history_to_context": True,
                "num_history_runs": 5,
            }
            if reasoning_model is not None:
                team_kwargs["reasoning_model"] = reasoning_model
            try:
                orchestrator = Team(**team_kwargs)
            except TypeError:
                team_kwargs.pop("reasoning_model", None)
                orchestrator = Team(**team_kwargs)
        else:
            agent_kwargs: Dict[str, Any] = {
                "name": "Travel Team Orchestrator",
                "model": model,
                "db": storage,
                "tools": orchestrator_tools,
                "instructions": team_instructions,
                "add_history_to_context": True,
            }
            if reasoning_model is not None:
                agent_kwargs["reasoning_model"] = reasoning_model
            try:
                orchestrator = Agent(**agent_kwargs)
            except TypeError:
                agent_kwargs.pop("reasoning_model", None)
                orchestrator = Agent(**agent_kwargs)
        return orchestrator, f_agent, i_agent, b_agent, w_agent, s_agent, c_agent

    return None, None, None, None, None, None, None


def create_travel_system():
    """Factory helper to obtain orchestrator and specialists."""
    return create_specialist_agents(get_agent_storage())


# Global instances for export
storage_instance = get_agent_storage()
(
    travel_orchestrator,
    flight_hotel_agent,
    itinerary_agent,
    budget_agent,
    weather_packing_agent,
    safety_advisory_agent,
    culture_events_agent,
) = create_specialist_agents(storage_instance)

