"""Tests for the Wanderlust Travel MCP Server tool registration and invocation."""
import json
from datetime import date, timedelta

import pytest

from app.mcp.travel_mcp_server import mcp


@pytest.mark.asyncio
async def test_mcp_tools_registered():
    """Verify all required travel tools are registered on the MCP server."""
    tools = await mcp.list_tools()
    tool_names = {tool.name for tool in tools}
    assert "search_flights" in tool_names
    assert "get_destination_weather" in tool_names
    assert "calculate_trip_budget" in tool_names


@pytest.mark.asyncio
async def test_mcp_tool_invocations():
    """Verify invoking MCP tools returns valid structured JSON results."""
    future_start = (date.today() + timedelta(days=30)).strftime("%Y-%m-%d")

    flights_res = await mcp.call_tool(
        "search_flights",
        {"origin": "TLV", "destination": "Rome", "departure_date": future_start},
    )
    assert flights_res.is_error is False
    flights_payload = json.loads(flights_res.content[0].text)
    assert flights_payload["origin"] == "TLV"
    assert len(flights_payload["flights"]) > 0

    weather_res = await mcp.call_tool(
        "get_destination_weather",
        {"destination": "Bali", "start_date": future_start, "duration_days": 5},
    )
    assert weather_res.is_error is False
    weather_payload = json.loads(weather_res.content[0].text)
    assert weather_payload["destination"] == "Bali"
    assert "metrics" in weather_payload

    budget_res = await mcp.call_tool(
        "calculate_trip_budget",
        {
            "total_budget": 3000.0,
            "flight_cost": 550.0,
            "accommodation_cost": 800.0,
            "daily_food_estimate": 60.0,
            "activities_cost": 150.0,
            "duration_days": 5,
        },
    )
    assert budget_res.is_error is False
    budget_payload = json.loads(budget_res.content[0].text)
    assert budget_payload["audit_status"] == "APPROVED"
    assert "itemized_breakdown" in budget_payload
