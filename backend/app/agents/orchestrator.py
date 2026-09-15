import os
import json
import logging
import asyncio
from typing import AsyncGenerator, Dict, Any, Optional, List

from app.core.config import settings
from app.tools.flight_tools import search_flights, search_accommodations
from app.tools.places_tools import search_attractions, search_restaurants, get_neighborhood_guide
from app.tools.budget_tools import calculate_trip_budget

logger = logging.getLogger("travel_orchestrator")

# Optional Agno imports with graceful fallback across Agno versions (v1 - v3+)
AGNO_AVAILABLE = False
Team = None
PostgresDb = None
PostgresAgentStorage = None

try:
    from agno.agent import Agent
    from agno.models.google import Gemini

    # In Agno v3+, storage was unified into agno.db and PostgresDb
    try:
        from agno.db.postgres import PostgresDb
    except ImportError:
        PostgresDb = None

    # In legacy Agno / Phidata, storage was in agno.storage.agent.postgres
    try:
        import importlib
        _legacy_storage = importlib.import_module("agno.storage.agent.postgres")
        PostgresAgentStorage = getattr(_legacy_storage, "PostgresAgentStorage", None)
    except Exception:
        PostgresAgentStorage = None

    # In Agno v3+, multi-agent teams are managed via agno.team.Team
    try:
        from agno.team import Team
    except ImportError:
        Team = None

    AGNO_AVAILABLE = True
except Exception as e:
    logger.warning(f"Agno framework not fully loaded in current python environment: {e}. Standalone runner enabled.")


def get_agent_storage(session_id: Optional[str] = None):
    """
    Initialize Postgres database/storage if database is reachable and Agno is available.
    Supports Agno v3 (PostgresDb) and legacy versions (PostgresAgentStorage).
    Returns None if PostgreSQL is not yet accessible.
    """
    if not AGNO_AVAILABLE:
        return None
    try:
        if PostgresDb is not None:
            return PostgresDb(
                session_table="travel_agent_sessions",
                db_url=settings.database_url,
            )
        elif PostgresAgentStorage is not None:
            return PostgresAgentStorage(
                table_name="travel_agent_sessions",
                db_url=settings.database_url,
            )
        return None
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL for agent storage: {e}")
        return None


def create_specialist_agents(storage=None):
    """
    Instantiate the three specialized agents and the team lead orchestrator.
    """
    gemini_key = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY", "")
    model = None
    if AGNO_AVAILABLE and gemini_key:
        try:
            model = Gemini(id=settings.GEMINI_MODEL, api_key=gemini_key)
        except Exception as e:
            logger.warning(f"Failed to initialize Agno Gemini model: {e}")

    # 1. Flight & Hotel Specialist Agent
    flight_agent_instructions = [
        "You are an elite Travel Logistics & Accommodation Concierge.",
        "Your task is to search for flights using search_flights and lodging using search_accommodations.",
        "Always evaluate both direct flights and budget-friendly options.",
        "Select lodging that matches the traveler's preferences, budget tier, and location walkability.",
        "Provide explicit cost breakdowns for round-trip flights and total accommodation costs.",
    ]

    # 2. Daily Itinerary Specialist Agent
    itinerary_agent_instructions = [
        "You are a World-Renowned Local Tour Guide and Itinerary Specialist.",
        "Your goal is to build an unforgettable, logical day-by-day travel schedule.",
        "Use search_attractions to select high-rated cultural landmarks matching user interests.",
        "Use search_restaurants for authentic regional cuisine spots (breakfast, lunch, dinner).",
        "Use get_neighborhood_guide to ensure smooth transit and realistic travel pacing.",
        "Structure each day clearly with: Morning, Afternoon, Evening, and Local Pro-Tip.",
    ]

    # 3. Financial & Budget Auditor Agent
    budget_agent_instructions = [
        "You are the Chief Travel Financial Auditor.",
        "Your mission is to enforce budget limits and ensure complete financial transparency.",
        "You MUST invoke calculate_trip_budget with the estimated flight, hotel, food, and activity costs.",
        "Explicitly flag whether the proposed trip is APPROVED or OVER_BUDGET.",
        "Highlight remaining surplus balance or provide concrete recommendations to trim costs if over budget.",
    ]

    if AGNO_AVAILABLE and model:
        f_agent = Agent(
            name="Flight & Hotel Specialist",
            role="Find optimal flight routes and top lodging tailored to user dates and budget",
            model=model,
            tools=[search_flights, search_accommodations],
            instructions=flight_agent_instructions,
            markdown=True,
        )

        i_agent = Agent(
            name="Itinerary Specialist",
            role="Build vibrant, structured day-by-day schedules with attractions, dining, and transit",
            model=model,
            tools=[search_attractions, search_restaurants, get_neighborhood_guide],
            instructions=itinerary_agent_instructions,
            markdown=True,
        )

        b_agent = Agent(
            name="Financial & Budget Auditor",
            role="Audit trip expenses against user limits, compute grand total and balance, enforce budget limits",
            model=model,
            tools=[calculate_trip_budget],
            instructions=budget_agent_instructions,
            markdown=True,
        )

        team_instructions = [
            "You are the Lead Travel Planner orchestrating an expert team of 3 specialists.",
            "1. Direct the Flight & Hotel Specialist to secure transit and accommodation.",
            "2. Direct the Itinerary Specialist to build an engaging daily itinerary.",
            "3. Direct the Financial Auditor to review all costs and issue budget approval.",
            "CRITICAL: You must write the entire synthesized travel plan and output in fluent, professional Hebrew (עברית).",
            "Synthesize everything into a stunning, cohesive Markdown itinerary with distinct sections in Hebrew:",
            "  # 🌍 סקירת הטיול ודגשים מרכזיים",
            "  ## ✈️ טיסות ומקומות לינה",
            "  ## 📅 לוח זמנים מפורט יום-אחר-יום",
            "  ## 💰 ביקורת תקציב ופירוט פיננסי (מאושר / חריגה מהתקציב)",
            "  ## 🎒 המלצות מעשיות וטיפים חיוניים למטייל",
        ]

        if Team is not None:
            orchestrator = Team(
                name="Travel Team Orchestrator Lead",
                role="Lead Multi-Agent Travel Planner coordinating logistics, daily itinerary, and budget audit",
                model=model,
                members=[f_agent, i_agent, b_agent],
                db=storage,
                add_history_to_context=True,
                instructions=team_instructions,
                markdown=True,
            )
        else:
            orchestrator = Agent(
                name="Travel Team Orchestrator Lead",
                role="Lead Multi-Agent Travel Planner coordinating logistics, daily itinerary, and budget audit",
                model=model,
                tools=[
                    search_flights,
                    search_accommodations,
                    search_attractions,
                    search_restaurants,
                    get_neighborhood_guide,
                    calculate_trip_budget,
                ],
                db=storage,
                instructions=team_instructions,
                markdown=True,
                add_history_to_context=True,
            )

        return orchestrator, f_agent, i_agent, b_agent

    return None, None, None, None


def synthesize_deterministic_plan(
    origin: str,
    destination: str,
    start_date: str,
    duration_days: int,
    total_budget: float,
    interests: List[str],
    travel_style: str = "balanced",
) -> Dict[str, Any]:
    """
    Executes the deterministic tool pipeline and synthesizes a production-grade plan.
    Used for standalone mode, offline validation, and guaranteed fast responses.
    """
    # Step 1: Run Flight & Accommodation Tools
    flight_data_raw = search_flights(origin, destination, start_date)
    flight_data = json.loads(flight_data_raw)
    rec_flight = flight_data["flights"][0] if flight_data.get("flights") else {
        "airline": "Standard Air", "flight_number": "ST-101", "price_usd": 450.0, "duration": "4h 30m"
    }
    flight_cost = rec_flight["price_usd"]

    # Compute check-out
    try:
        from datetime import datetime, timedelta
        dt = datetime.strptime(start_date, "%Y-%m-%d")
        checkout = (dt + timedelta(days=duration_days)).strftime("%Y-%m-%d")
    except Exception:
        checkout = start_date

    hotel_data_raw = search_accommodations(destination, start_date, checkout, budget_tier=travel_style)
    hotel_data = json.loads(hotel_data_raw)
    selected_hotel = hotel_data["options"][0] if hotel_data.get("options") else {
        "name": f"Hotel {destination}", "nightly_rate_usd": 150.0, "total_estimated_usd": 150.0 * duration_days
    }
    hotel_cost = selected_hotel["total_estimated_usd"]

    # Step 2: Run Places & Attractions Tools
    attractions_raw = search_attractions(destination, interests, max_results=max(3, duration_days * 2))
    attractions_data = json.loads(attractions_raw)
    attractions_list = attractions_data.get("attractions", [])

    restaurants_raw = search_restaurants(destination)
    restaurants_data = json.loads(restaurants_raw)
    restaurants_list = restaurants_data.get("recommendations", [])

    neighborhood_raw = get_neighborhood_guide(destination)
    neighborhood_data = json.loads(neighborhood_raw)

    # Calculate activities cost
    activities_cost = sum(a.get("entry_fee_usd", 0.0) for a in attractions_list[:duration_days * 2])
    daily_food = 50.0 if travel_style == "budget" else (85.0 if travel_style == "luxury" else 65.0)

    # Step 3: Run Budget Audit Tool
    budget_report_raw = calculate_trip_budget(
        total_budget=total_budget,
        flight_cost=flight_cost,
        accommodation_cost=hotel_cost,
        daily_food_estimate=daily_food,
        activities_cost=activities_cost,
        duration_days=duration_days,
    )
    budget_report = json.loads(budget_report_raw)

    # Step 4: Synthesize Markdown Output in Hebrew
    status_badge = (
        "🟢 **אושר - במסגרת התקציב (APPROVED)**"
        if budget_report["audit_status"] == "APPROVED"
        else "🔴 **חריגה מהתקציב - נדרשת התאמה (OVER BUDGET)**"
    )

    style_names = {"budget": "חסכוני / תרמילאי", "balanced": "מאוזן", "luxury": "יוקרתי"}
    style_hebrew = style_names.get(travel_style, travel_style)

    markdown_parts = [
        f"# 🌍 תוכנית נסיעה מבוססת בינה מלאכותית: {duration_days} ימים ב{destination}",
        f"*מותאם לסגנון נסיעה: **{style_hebrew}** | יציאה מ: **{origin.upper()}** | תאריך המראה: **{start_date}***\n",
        f"### סטטוס תקציבי: {status_badge}\n",
        "---",
        "## ✈️ טיסות ומקומות לינה (סוכן טיסות ומלונות)",
        f"- **טיסה מומלצת**: חברת {rec_flight['airline']} (מספר טיסה: {rec_flight['flight_number']})",
        f"  - **מסלול**: {origin.upper()} ➔ {destination} | משך טיסה: {rec_flight.get('duration', 'ישיר')}",
        f"  - **מחלקה**: {rec_flight.get('cabin', 'תיירים סטנדרט')} | מחיר משוער: **${rec_flight['price_usd']:,.2f} USD**",
        f"- **מקום לינה נבחר**: **{selected_hotel['name']}** ({selected_hotel.get('stars', 4)} כוכבים, דירוג {selected_hotel.get('rating', 4.7)}/5)",
        f"  - **אזור / שכונה**: {selected_hotel.get('neighborhood', 'מרכז העיר')}",
        f"  - **מחיר ללילה**: ${selected_hotel.get('nightly_rate_usd', 0):,.2f} (סך הכל ל-{duration_days} לילות: **${hotel_cost:,.2f} USD**)",
        f"  - **שירותים ומתקנים**: {', '.join(selected_hotel.get('amenities', ['אינטרנט אלחוטי', 'ארוחת בוקר']))}\n",
        "---",
        "## 📅 לוח זמנים מפורט יום-אחר-יום (סוכן מסלולים ואטרקציות)\n",
    ]

    # Generate daily schedule
    for day_num in range(1, duration_days + 1):
        idx1 = ((day_num - 1) * 2) % max(1, len(attractions_list))
        idx2 = ((day_num - 1) * 2 + 1) % max(1, len(attractions_list))
        rest_idx = (day_num - 1) % max(1, len(restaurants_list))

        att1 = attractions_list[idx1] if attractions_list else {"name": "סיור רגלי היסטורי", "highlight": "חקירת הסמטאות העתיקות"}
        att2 = attractions_list[idx2] if len(attractions_list) > 1 else {"name": "תצפית פנורמית על העיר", "highlight": "מראה שקיעה מרהיב"}
        dining = restaurants_list[rest_idx] if restaurants_list else {"name": "ביסטרו מקומי אותנטי", "signature_dish": "מנת השף המסורתית"}

        markdown_parts.extend([
            f"### 📍 יום {day_num}: {att1.get('category', 'תרבות ואמנות')} וקולינריה מקומית",
            f"- **🌅 בוקר (09:00 - 12:30)**: ביקור ב**{att1['name']}** (משך מומלץ: {att1.get('recommended_hours', 2.5)} שעות, דמי כניסה: ${att1.get('entry_fee_usd', 0):.2f}).",
            f"  - *דגש מרכזי*: {att1.get('highlight', att1.get('description', ''))}",
            f"- **☀️ צהריים (13:00 - 16:30)**: ארוחת צהריים במסעדת **{dining['name']}** ({dining.get('neighborhood', 'מרכז העיר')}) עם מנת הבית: *{dining.get('signature_dish', 'מנות מסורתיות מומלצות')}*. לאחר מכן המשך ביקור ב**{att2['name']}**.",
            f"- **🌙 ערב (18:30 - 21:30)**: סיור שקיעה נעים בשדרותיה התוססות של {destination}, קינוח מקומי / גלידה וקפה.",
            f"- **💡 טיפ מקומי מנצח**: {neighborhood_data['local_tips'][day_num % len(neighborhood_data['local_tips'])]}\n",
        ])

    # Add Budget Section
    markdown_parts.extend([
        "---",
        "## 💰 ביקורת תקציב ופירוט פיננסי (סוכן בקרת תקציב)",
        f"| קטגוריה | עלות משוערת (USD) | אחוז מהתקציב |",
        f"| :--- | :--- | :--- |",
        f"| ✈️ טיסות | ${budget_report['itemized_breakdown']['flights']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['flights']['percentage']}% |",
        f"| 🏨 מקומות לינה ומלון | ${budget_report['itemized_breakdown']['accommodation']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['accommodation']['percentage']}% |",
        f"| 🍽️ אוכל והסעדה | ${budget_report['itemized_breakdown']['food_and_dining']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['food_and_dining']['percentage']}% |",
        f"| 🎟️ אטרקציות וכניסות לאתרים | ${budget_report['itemized_breakdown']['activities_and_tours']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['activities_and_tours']['percentage']}% |",
        f"| 🚇 תחבורה מקומית | ${budget_report['itemized_breakdown']['local_transit']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['local_transit']['percentage']}% |",
        f"| 🛡️ כרית ביטחון (בלת״ם) | ${budget_report['itemized_breakdown']['contingency_buffer']['amount_usd']:,.2f} | {budget_report['itemized_breakdown']['contingency_buffer']['percentage']}% |",
        f"| **סך הכל עלות משוערת** | **${budget_report['total_projected_expenses_usd']:,.2f}** | **100%** |",
        f"| **תקציב יעד מוגדר** | **${total_budget:,.2f}** | - |",
        f"| **יתרה / עודף תקציבי** | **${budget_report['remaining_balance_usd']:,.2f}** | - |\n",
        f"### המלצות מבקר התקציב:",
    ])

    for rec in budget_report.get("recommendations", []):
        markdown_parts.append(f"- {rec}")

    markdown_parts.extend([
        "\n---",
        "## 🎒 המלצות מעשיות למטייל",
        f"- **הליכתיות רגלית**: {neighborhood_data.get('walkability_rating', 'גבוהה מאוד')}",
        f"- **תחבורה מומלצת**: {neighborhood_data.get('recommended_transit', 'מטרו והליכה רגלית')}",
        f"- **שכונה מומלצת כבסיס ללינה**: {neighborhood_data['neighborhood_breakdown'][0]['area']} (מתאימה במיוחד עבור: {neighborhood_data['neighborhood_breakdown'][0]['best_for']})",
    ])

    full_markdown = "\n".join(markdown_parts)

    return {
        "markdown_plan": full_markdown,
        "flight_cost": flight_cost,
        "hotel_cost": hotel_cost,
        "activities_cost": activities_cost,
        "total_estimated": budget_report["total_projected_expenses_usd"],
        "remaining_balance": budget_report["remaining_balance_usd"],
        "budget_status": budget_report["audit_status"],
        "itemized_breakdown": budget_report["itemized_breakdown"],
    }


async def stream_multi_agent_execution(
    origin: str,
    destination: str,
    start_date: str,
    duration_days: int,
    total_budget: float,
    interests: List[str],
    travel_style: str = "balanced",
    session_id: str = "default_session",
) -> AsyncGenerator[str, None]:
    """
    Asynchronous generator streaming real-time Server-Sent Events (SSE).
    Emits agent activation, tool calls, reasoning updates, and markdown tokens.
    """
    def format_sse(event: str, data: Dict[str, Any]) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    # 1. Lead Orchestrator Event
    yield format_sse("step", {
        "agent": "travel_orchestrator",
        "status": "active",
        "title": "סוכן התזמור הראשי אותחל",
        "message": f"מנתח את בקשת הנסיעה עבור {destination} ({duration_days} ימים, תקציב: ${total_budget:,.2f} USD)...",
    })
    await asyncio.sleep(0.3)

    # 2. Flight & Hotel Specialist Event
    yield format_sse("step", {
        "agent": "flight_hotel_agent",
        "status": "running",
        "title": "סוכן טיסות ומלונות הופעל",
        "message": f"סורק לוחות זמנים ומחירים עבור טיסות מ-{origin.upper()} אל {destination}...",
    })
    await asyncio.sleep(0.4)

    flight_result = search_flights(origin, destination, start_date)
    yield format_sse("tool_call", {
        "agent": "flight_hotel_agent",
        "tool": "search_flights",
        "summary": f"נמצאו טיסות אופטימליות במסלול {origin} -> {destination}. המחיר הטוב ביותר אותר.",
    })
    await asyncio.sleep(0.3)

    hotel_result = search_accommodations(destination, start_date, start_date, budget_tier=travel_style)
    yield format_sse("tool_call", {
        "agent": "flight_hotel_agent",
        "tool": "search_accommodations",
        "summary": f"אותרו מקומות לינה ומלונות מובילים ב-{destination} המותאמים לסגנון הנסיעה הנבחר.",
    })
    await asyncio.sleep(0.3)

    # 3. Itinerary Specialist Event
    yield format_sse("step", {
        "agent": "itinerary_agent",
        "status": "running",
        "title": "סוכן מסלולים ואטרקציות",
        "message": f"בונה מסלול מותאם אישית ל-{duration_days} ימים עם דגש על {', '.join(interests or ['סיור כללי'])}...",
    })
    await asyncio.sleep(0.4)

    search_attractions(destination, interests)
    yield format_sse("tool_call", {
        "agent": "itinerary_agent",
        "tool": "search_attractions",
        "summary": f"נטענו אטרקציות מומלצות, זמני שהות ועלויות כניסה משוערות.",
    })
    await asyncio.sleep(0.3)

    search_restaurants(destination)
    yield format_sse("tool_call", {
        "agent": "itinerary_agent",
        "tool": "search_restaurants",
        "summary": f"נבחרו מסעדות אותנטיות, בתי קפה וחוויות קולינריות אזוריות.",
    })
    await asyncio.sleep(0.3)

    # 4. Financial & Budget Auditor Event
    yield format_sse("step", {
        "agent": "budget_agent",
        "status": "running",
        "title": "סוכן מבקר תקציב פיננסי",
        "message": f"מבצע ביקורת של כלל העלויות מול מסגרת התקציב הכוללת של ${total_budget:,.2f} USD...",
    })
    await asyncio.sleep(0.4)

    # Generate full plan
    plan_data = synthesize_deterministic_plan(
        origin=origin,
        destination=destination,
        start_date=start_date,
        duration_days=duration_days,
        total_budget=total_budget,
        interests=interests,
        travel_style=travel_style,
    )

    yield format_sse("tool_call", {
        "agent": "budget_agent",
        "tool": "calculate_trip_budget",
        "summary": f"תוצאת ביקורת: {plan_data['budget_status']} (סך הכל צפוי: ${plan_data['total_estimated']:,.2f}, יתרה: ${plan_data['remaining_balance']:,.2f}).",
    })
    await asyncio.sleep(0.3)

    yield format_sse("step", {
        "agent": "travel_orchestrator",
        "status": "synthesizing",
        "title": "מאחד ומסכם את תוכנית המסע הכוללת",
        "message": "מרכיב דוח מפורט עם כרטיסיות אינטראקטיביות...",
    })
    await asyncio.sleep(0.3)

    # 5. Stream Markdown Tokens in chunks
    full_markdown = plan_data["markdown_plan"]
    words = full_markdown.split(" ")
    chunk_size = 12
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i : i + chunk_size]) + " "
        yield format_sse("chunk", {"text": chunk})
        await asyncio.sleep(0.04)

    # 6. Final Completion Event
    yield format_sse("done", {
        "session_id": session_id,
        "budget_status": plan_data["budget_status"],
        "total_estimated": plan_data["total_estimated"],
        "remaining_balance": plan_data["remaining_balance"],
        "flight_cost": plan_data["flight_cost"],
        "hotel_cost": plan_data["hotel_cost"],
        "breakdown": plan_data["itemized_breakdown"],
    })


# Global singleton instances for import
storage_instance = get_agent_storage()
travel_orchestrator, flight_hotel_agent, itinerary_agent, budget_agent = create_specialist_agents(storage_instance)


def create_travel_system():
    """Factory helper to obtain orchestrator and specialists."""
    return create_specialist_agents(get_agent_storage())
