"""
Standard MCP Server for Wanderlust Voyage AI Travel Tools.
Exposes flight search, destination weather forecast, and trip budget calculator
for external MCP clients (Cursor, Claude Desktop, Antigravity) and Agno agents.
"""
from typing import Optional

try:
    from mcp.server.fastmcp import FastMCP
except (ImportError, ModuleNotFoundError):
    from mcp.server.mcpserver import MCPServer as FastMCP

from app.tools.budget_tools import calculate_trip_budget as _calculate_trip_budget
from app.tools.flight_tools import search_flights as _search_flights
from app.tools.weather_tools import get_destination_weather as _get_destination_weather
from app.rag.retriever import search_travel_knowledge as _search_travel_knowledge

mcp = FastMCP("wanderlust-travel-mcp")


@mcp.tool()
def search_flights(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str] = None,
    max_stops: int = 1,
) -> str:
    """Search for commercial flights between origin and destination on given dates."""
    return _search_flights(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        return_date=return_date,
        max_stops=max_stops,
    )


@mcp.tool()
def get_destination_weather(
    destination: str,
    start_date: str,
    duration_days: int = 7,
) -> str:
    """Retrieve live or fallback weather forecast, climate metrics, and plug info."""
    return _get_destination_weather(
        destination=destination,
        start_date=start_date,
        duration_days=duration_days,
    )


@mcp.tool()
def calculate_trip_budget(
    total_budget: float,
    flight_cost: float,
    accommodation_cost: float,
    daily_food_estimate: float,
    activities_cost: float,
    duration_days: int,
    local_transit_estimate: float = 15.0,
    emergency_buffer_percentage: float = 10.0,
    currency: str = "USD",
) -> str:
    """Calculate and audit trip expenses with live FX rates and 10% contingency buffer."""
    return _calculate_trip_budget(
        total_budget=total_budget,
        flight_cost=flight_cost,
        accommodation_cost=accommodation_cost,
        daily_food_estimate=daily_food_estimate,
        activities_cost=activities_cost,
        duration_days=duration_days,
        local_transit_estimate=local_transit_estimate,
        emergency_buffer_percentage=emergency_buffer_percentage,
        currency=currency,
    )


@mcp.tool()
def search_travel_knowledge(
    query: str,
    destination: Optional[str] = None,
    top_k: int = 4,
) -> str:
    """Search the Wanderlust RAG VectorStore for destination guides, TLV tips, visas, and Tax-Free rules."""
    return _search_travel_knowledge(
        query=query,
        destination=destination,
        top_k=top_k,
    )


@mcp.tool()
def replan_trip_day(
    destination: str,
    day_number: int = 1,
    slot: str = "morning",
    trigger_type: str = "weather",
    constraint_note: str = "",
) -> str:
    """Re-plan a specific trip day/slot due to weather, strike, or budget constraints."""
    import json
    from app.tools.replan_tools import apply_itinerary_swap

    seed_plan = {
        "destination": destination,
        "duration_days": max(1, day_number),
        "total_budget": 2400.0,
        "flight_cost": 550.0,
        "hotel_cost": 700.0,
        "activities_cost": 120.0,
        "structured_days": [{"day_number": day_number, "morning": {"activity": f"סיור בוקר ב{destination}"}}],
    }
    return json.dumps(apply_itinerary_swap(seed_plan, day_number, slot, trigger_type, constraint_note), ensure_ascii=False)


@mcp.tool()
def get_booking_readiness_timeline(
    booking_ref: str,
    destination: str,
    start_date: str = "2026-10-15",
    duration_days: int = 7,
) -> str:
    """Build T-30d/T-7d/T-24h pre-departure readiness milestones for a confirmed booking."""
    import json
    from app.tools.concierge_tools import build_pre_departure_timeline

    return json.dumps(
        build_pre_departure_timeline(booking_ref=booking_ref, destination=destination, start_date=start_date, duration_days=duration_days),
        ensure_ascii=False,
    )


if __name__ == "__main__":
    mcp.run()

