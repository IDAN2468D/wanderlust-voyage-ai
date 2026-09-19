import os
import json
import logging
import asyncio
from typing import AsyncGenerator, Dict, Any, Optional, List
from datetime import datetime, timedelta

from app.core.config import settings
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

logger = logging.getLogger("travel_orchestrator")

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
) -> Dict[str, Any]:
    """
    Executes the 7-agent coordinated travel pipeline deterministically.
    Synthesizes flights, hotels, attractions, weather, safety, culture, and budget.
    """
    dest_clean = destination.strip()
    orig_clean = origin.strip().upper()
    days = max(1, duration_days)

    # 1. Flights & Lodging (Flight Specialist)
    flight_data_raw = search_flights(orig_clean, dest_clean, start_date)
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

    # 7. Construct Day-by-Day Itinerary Schedule
    structured_days: List[Dict[str, Any]] = []
    israeli_start_date = format_israeli_date(start_date)

    for day_num in range(1, days + 1):
        idx1 = ((day_num - 1) * 2) % max(1, len(attractions_list))
        idx2 = ((day_num - 1) * 2 + 1) % max(1, len(attractions_list))
        rest_idx = (day_num - 1) % max(1, len(restaurants_list))

        att1 = attractions_list[idx1] if attractions_list else {
            "name": f"סיור אתרי מורשת ב{dest_clean}",
            "highlight": "חקירת הסמטאות העתיקות והמבנים השמורים",
            "entry_fee_usd": 0.0,
            "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={dest_clean}",
        }
        att2 = attractions_list[idx2] if len(attractions_list) > 1 else {
            "name": f"תצפית שקיעה פנורמית ב{dest_clean}",
            "highlight": "מראה עוצר נשימה על קו הרקיע",
            "entry_fee_usd": 5.0,
            "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={dest_clean}",
        }
        dining = restaurants_list[rest_idx] if restaurants_list else {
            "name": f"מסעדת ביסטרו מקומית ב{dest_clean}",
            "signature_dish": "מנת השף המסורתית",
            "neighborhood": "מרכז העיר",
            "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={dest_clean}",
        }

        # Calculate calendar date for this day
        try:
            current_day_dt = dt_start + timedelta(days=day_num - 1)
            current_day_formatted = current_day_dt.strftime("%d/%m/%Y")
        except Exception:
            current_day_formatted = f"יום {day_num}"

        day_tip = neighborhood_data.get("local_tips", ["הקפידו לשתות מים מרובים"])[(day_num - 1) % max(1, len(neighborhood_data.get("local_tips", [1])))]

        structured_days.append({
            "day_number": day_num,
            "date_formatted": current_day_formatted,
            "title": f"יום {day_num}: {att1.get('category', 'תרבות וסיורים')} וקולינריה מקומית",
            "morning": {
                "time": "09:00 - 12:30",
                "activity": att1["name"],
                "highlight": att1.get("highlight", att1.get("description", "")),
                "cost_usd": att1.get("entry_fee_usd", 0.0),
                "maps_url": att1.get("google_maps_url"),
                "rating": att1.get("rating", 4.7),
            },
            "afternoon": {
                "time": "13:00 - 16:30",
                "dining": dining["name"],
                "signature_dish": dining.get("signature_dish", "מנות אותנטיות מומלצות"),
                "neighborhood": dining.get("neighborhood", "מרכז העיר"),
                "dining_maps_url": dining.get("google_maps_url"),
                "activity": att2["name"],
                "activity_maps_url": att2.get("google_maps_url"),
            },
            "evening": {
                "time": "18:00 - 21:30",
                "activity": f"סיור ערב רגוע ושקיעה ב{dest_clean}",
                "highlight": "שקיעה מרהיבה, קוקטייל או קינוח מקומי, וספיגת אווירת הלילה",
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
        md_lines.extend([
            f"### 📍 {day['title']} ({day['date_formatted']})",
            f"- **🌅 בוקר ({day['morning']['time']})**: ביקור ב[{day['morning']['activity']}]({day['morning']['maps_url']}) (דמי כניסה: ${day['morning']['cost_usd']:.2f}, דירוג: {day['morning']['rating']}/5).",
            f"  - *דגש מרכזי*: {day['morning']['highlight']}",
            f"- **☀️ צהריים ({day['afternoon']['time']})**: ארוחת צהריים במסעדת [{day['afternoon']['dining']}]({day['afternoon']['dining_maps_url']}) ({day['afternoon']['neighborhood']}) - *מנת הדגל: {day['afternoon']['signature_dish']}*. המשך סיור ב[{day['afternoon']['activity']}]({day['afternoon']['activity_maps_url']}).",
            f"- **🌙 ערב ({day['evening']['time']})**: {day['evening']['activity']} — {day['evening']['highlight']}.",
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

    md_lines.extend([
        "\n---",
        "## 💰 ביקורת תקציב ופירוט פיננסי מלא",
        "| קטגוריה | עלות (USD) | עלות (₪) | אחוז מהתקציב |",
        "| :--- | :--- | :--- | :--- |",
        f"| ✈️ טיסות | ${budget_report['itemized_breakdown']['flights']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['flights']['amount_usd'] * 3.7:,.0f} ₪ | {budget_report['itemized_breakdown']['flights']['percentage']}% |",
        f"| 🏨 לינה ומלון | ${budget_report['itemized_breakdown']['accommodation']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['accommodation']['amount_usd'] * 3.7:,.0f} ₪ | {budget_report['itemized_breakdown']['accommodation']['percentage']}% |",
        f"| 🍽️ אוכל והסעדה | ${budget_report['itemized_breakdown']['food_and_dining']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['food_and_dining']['amount_usd'] * 3.7:,.0f} ₪ | {budget_report['itemized_breakdown']['food_and_dining']['percentage']}% |",
        f"| 🎟️ אטרקציות וסיורים | ${budget_report['itemized_breakdown']['activities_and_tours']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['activities_and_tours']['amount_usd'] * 3.7:,.0f} ₪ | {budget_report['itemized_breakdown']['activities_and_tours']['percentage']}% |",
        f"| 🚇 תחבורה מקומית | ${budget_report['itemized_breakdown']['local_transit']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['local_transit']['amount_usd'] * 3.7:,.0f} ₪ | {budget_report['itemized_breakdown']['local_transit']['percentage']}% |",
        f"| 🛡️ כרית ביטחון (בלת\"ם 10%) | ${budget_report['itemized_breakdown']['contingency_buffer']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['contingency_buffer']['amount_usd'] * 3.7:,.0f} ₪ | {budget_report['itemized_breakdown']['contingency_buffer']['percentage']}% |",
        f"| **סך הכל עלות משוערת** | **${budget_report['total_projected_expenses_usd']:,.2f}** | **{budget_report['total_projected_expenses_ils']:,.0f} ₪** | **100%** |",
        f"| **תקציב יעד מוגדר** | **${total_budget:,.2f}** | **{budget_report['total_budget_ils']:,.0f} ₪** | - |",
        f"| **יתרה / עודף תקציבי** | **${budget_report['remaining_balance_usd']:,.2f}** | **{budget_report['remaining_balance_ils']:,.0f} ₪** | - |\n",
        "### המלצות מבקר התקציב:",
    ])

    for rec in budget_report.get("recommendations", []):
        md_lines.append(f"- {rec}")

    # 8. Specialized Agents: Transit, Culinary/Kosher, Shopping/Tax-Free, Calendar, Sentinel, Briefings
    transit_raw = get_transit_guide(dest_clean, days)
    transit_data = json.loads(transit_raw)

    culinary_raw = get_culinary_guide(dest_clean, interests)
    culinary_data = json.loads(culinary_raw)

    shopping_raw = get_shopping_and_tax_free(dest_clean, estimated_shopping_budget_usd=350.0)
    shopping_data = json.loads(shopping_raw)

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

    full_markdown = "\n".join(md_lines)

    return {
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
    }


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
) -> AsyncGenerator[str, None]:
    """
    Streams real-time Server-Sent Events (SSE) representing multi-agent deliberation.
    Emits stage markers [STAGE: ...] and live thought pulses across all 7 specialized agents.
    """
    def format_sse(event: str, data: Dict[str, Any]) -> str:
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

    # Stage 1: Lead Orchestrator Initialization
    yield format_sse("step", {
        "agent": "travel_orchestrator",
        "stage": "ROUTING",
        "status": "active",
        "title": "[STAGE: ROUTING] סוכן התזמור הראשי אותחל",
        "message": f"מנתח את העדפות הנסיעה עבור {destination} ({duration_days} ימים, תקציב: ${total_budget:,.2f} {currency})...",
    })
    await asyncio.sleep(0.25)

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

    # Synthesize complete plan data
    plan_data = synthesize_deterministic_plan(
        origin=origin,
        destination=destination,
        start_date=start_date,
        duration_days=duration_days,
        total_budget=total_budget,
        interests=interests,
        travel_style=travel_style,
        currency=currency,
    )

    yield format_sse("tool_call", {
        "agent": "budget_agent",
        "tool": "calculate_trip_budget",
        "summary": f"סטטוס: {plan_data['budget_status']} | סך הכל: ${plan_data['total_estimated']:,.2f} (כרית ביטחון 10% כלולה).",
    })
    await asyncio.sleep(0.2)

    # Stage 8: Transit & Navigation Specialist (NEW AGENT)
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
        "summary": f"כרטיס מומלץ: {plan_data['transit_guide']['pass_name']} | ציון הליכה: {plan_data['transit_guide']['walking_score']}/10.",
    })
    await asyncio.sleep(0.2)

    # Stage 9: Culinary, Kosher & Nightlife Specialist (NEW AGENT)
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
        "summary": f"נמצאו אפשרויות כשרות: {plan_data['culinary_guide']['kosher_options'][0]['name']} ומסעדות גורמה מובילות.",
    })
    await asyncio.sleep(0.2)

    # Stage 10: Smart Shopper & Tax-Free Specialist (NEW AGENT)
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
        "summary": f"שיעור מע\"מ: {plan_data['shopping_taxfree']['vat_rate']} | החזר צפוי: ${plan_data['shopping_taxfree']['projected_vat_refund_usd']:.2f} USD.",
    })
    await asyncio.sleep(0.2)

    # Stage 11: Calendar & Workspace Specialist (NEW AGENT)
    yield format_sse("step", {
        "agent": "calendar_sync_agent",
        "stage": "CALENDAR",
        "status": "running",
        "title": "[STAGE: CALENDAR] סוכן סנכרון יומנים ומסמכים",
        "message": f"יוצר קישורי סנכרון ל-Google Calendar וקובץ iCalendar (.ics) מלא לכל ימי המסע...",
    })
    await asyncio.sleep(0.25)

    yield format_sse("tool_call", {
        "agent": "calendar_sync_agent",
        "tool": "generate_trip_calendar_pack",
        "summary": "הופק קובץ יומן מלא (.ics) עם התראות שעה לפני פעילויות וקישור Google Calendar.",
    })
    await asyncio.sleep(0.2)

    # Stage 12: Ground Sentinel & Realtime Alerts (NEW AGENT)
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
        "summary": f"מדד שביתות: {plan_data['ground_alerts']['strike_risk_index']} | סטטוס: {plan_data['ground_alerts']['safety_badge']}.",
    })
    await asyncio.sleep(0.2)

    # Stage 13: WhatsApp Butler & Daily Briefings (NEW AGENT)
    yield format_sse("step", {
        "agent": "whatsapp_butler_agent",
        "stage": "WHATSAPP",
        "status": "running",
        "title": "[STAGE: WHATSAPP] סוכן קונסיירז' יומי לוואטסאפ",
        "message": f"מכין הודעות תדריך יומיות ערוכות לבוקר, צהריים וערב עם קישורי שיתוף בלחיצה אחת...",
    })
    await asyncio.sleep(0.25)

    yield format_sse("tool_call", {
        "agent": "whatsapp_butler_agent",
        "tool": "generate_whatsapp_daily_briefings",
        "summary": f"נוצרו {plan_data['whatsapp_briefings']['total_briefings']} תדריכי וואטסאפ מוכנים לשיתוף ישיר.",
    })
    await asyncio.sleep(0.2)

    # Stage 14: Final Synthesis & Markdown Stream
    yield format_sse("step", {
        "agent": "travel_orchestrator",
        "stage": "SYNTHESIS",
        "status": "synthesizing",
        "title": "[STAGE: SYNTHESIS] סינתזה סופית ואיחוד דוחות",
        "message": "מרכיב דוח מסע אינטראקטיבי הכולל צ'קליסט אריזה, תחבורה, קולינריה, Tax-Free וסנכרון יומן...",
    })
    await asyncio.sleep(0.25)

    # Stream markdown in readable chunks
    full_markdown = plan_data["markdown_plan"]
    words = full_markdown.split(" ")
    chunk_size = 14
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i : i + chunk_size]) + " "
        yield format_sse("chunk", {"text": chunk})
        await asyncio.sleep(0.02)

    # Stage 15: Completion
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
        "weather_metrics": plan_data["weather_metrics"],
        "packing_checklist": plan_data["packing_checklist"],
        "safety_info": plan_data["safety_info"],
        "seasonal_events": plan_data["seasonal_events"],
        "structured_days": plan_data["structured_days"],
        "recommended_flight": plan_data["recommended_flight"],
        "selected_hotel": plan_data["selected_hotel"],
        "start_date_formatted": plan_data["start_date_formatted"],
        "transit_guide": plan_data["transit_guide"],
        "culinary_guide": plan_data["culinary_guide"],
        "shopping_taxfree": plan_data["shopping_taxfree"],
        "calendar_events": plan_data["calendar_events"],
        "ground_alerts": plan_data["ground_alerts"],
        "whatsapp_briefings": plan_data["whatsapp_briefings"],
    })


def get_agent_storage(session_id: Optional[str] = None):
    """Initializes agent storage if Agno is available and configured."""
    if not AGNO_AVAILABLE:
        return None
    try:
        if PostgresDb is not None:
            return PostgresDb(session_table="travel_agent_sessions", db_url=settings.database_url)
        elif PostgresAgentStorage is not None:
            return PostgresAgentStorage(table_name="travel_agent_sessions", db_url=settings.database_url)
        return None
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL: {e}")
        return None


def create_specialist_agents(storage=None):
    """Instantiate specialist agents and orchestrator if model is available."""
    gemini_key = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY", "")
    model = None
    if AGNO_AVAILABLE and gemini_key:
        try:
            model = Gemini(id=settings.GEMINI_MODEL, api_key=gemini_key)
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini: {e}")

    if AGNO_AVAILABLE and model:
        f_agent = Agent(name="Flight Specialist", role="Search flights", model=model, tools=[search_flights, search_accommodations])
        i_agent = Agent(name="Itinerary Specialist", role="Build itinerary", model=model, tools=[search_attractions, search_restaurants, get_neighborhood_guide])
        b_agent = Agent(name="Budget Specialist", role="Audit expenses", model=model, tools=[calculate_trip_budget])
        w_agent = Agent(name="Weather Specialist", role="Weather & Packing", model=model, tools=[get_destination_weather, generate_packing_checklist])
        s_agent = Agent(name="Safety Specialist", role="Visa & Safety", model=model, tools=[get_safety_and_visa_info])
        c_agent = Agent(name="Culture Specialist", role="Festivals & Gems", model=model, tools=[search_seasonal_events_and_gems])

        if Team is not None:
            orchestrator = Team(
                name="Travel Team Orchestrator",
                model=model,
                members=[f_agent, i_agent, b_agent, w_agent, s_agent, c_agent],
                db=storage,
            )
        else:
            orchestrator = Agent(name="Travel Team Orchestrator", model=model, db=storage)
        return orchestrator, f_agent, i_agent, b_agent, w_agent, s_agent, c_agent

    return None, None, None, None, None, None, None


def create_travel_system():
    """Factory helper to obtain orchestrator and specialists."""
    return create_specialist_agents(get_agent_storage())


# Global instances for export
storage_instance = get_agent_storage()
travel_orchestrator, flight_hotel_agent, itinerary_agent, budget_agent, weather_packing_agent, safety_advisory_agent, culture_events_agent = create_specialist_agents(storage_instance)

