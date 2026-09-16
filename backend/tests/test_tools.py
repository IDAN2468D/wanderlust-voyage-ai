import json
import unittest

try:
    import pytest
except ImportError:
    pytest = None

from app.tools.flight_tools import search_flights, search_accommodations
from app.tools.places_tools import search_attractions, search_restaurants, get_neighborhood_guide
from app.tools.budget_tools import calculate_trip_budget


def test_search_flights_returns_valid_options():
    """Verify flight tool returns structured JSON with flight options and pricing."""
    result_raw = search_flights(origin="TLV", destination="Rome", departure_date="2026-05-10")
    data = json.loads(result_raw)

    assert data["origin"] == "TLV"
    assert data["destination"] == "Rome"
    assert data["total_results"] > 0
    assert len(data["flights"]) > 0

    first_flight = data["flights"][0]
    assert "airline" in first_flight
    assert "price_usd" in first_flight
    assert first_flight["price_usd"] > 0
    assert "flight_number" in first_flight
    assert "duration" in first_flight


def test_search_accommodations_calculates_nights_and_totals():
    """Verify accommodation search returns options with ratings and estimated totals."""
    result_raw = search_accommodations(
        destination="Tokyo",
        check_in="2026-06-01",
        check_out="2026-06-06",
        budget_tier="moderate",
    )
    data = json.loads(result_raw)

    assert data["destination"] == "Tokyo"
    assert data["total_nights"] == 5
    assert len(data["options"]) > 0

    option = data["options"][0]
    assert option["nightly_rate_usd"] > 0
    assert option["total_estimated_usd"] == round(option["nightly_rate_usd"] * 5, 2)
    assert len(option["amenities"]) > 0


def test_search_attractions_matches_categories():
    """Verify attraction tool returns landmark details, durations, and entry costs."""
    result_raw = search_attractions(destination="Paris", interests=["Art", "History"], max_results=4)
    data = json.loads(result_raw)

    assert data["destination"] == "Paris"
    assert len(data["attractions"]) <= 4
    for att in data["attractions"]:
        assert "name" in att
        assert "entry_fee_usd" in att
        assert "recommended_hours" in att
        assert att["recommended_hours"] > 0


def test_search_restaurants_and_neighborhood():
    """Verify dining and neighborhood guides provide cultural and safety recommendations."""
    rest_data = json.loads(search_restaurants(destination="Rome"))
    assert len(rest_data["recommendations"]) > 0
    assert rest_data["recommendations"][0]["avg_cost_person_usd"] > 0

    guide_data = json.loads(get_neighborhood_guide(destination="Tokyo"))
    assert "walkability_rating" in guide_data
    assert len(guide_data["neighborhood_breakdown"]) > 0
    assert len(guide_data["local_tips"]) > 0


def test_calculate_trip_budget_approved_case():
    """Verify budget auditor approves when total projected costs are within budget."""
    result_raw = calculate_trip_budget(
        total_budget=3000.0,
        flight_cost=600.0,
        accommodation_cost=800.0,
        daily_food_estimate=60.0,
        activities_cost=200.0,
        duration_days=5,
        local_transit_estimate=15.0,
    )
    data = json.loads(result_raw)

    assert data["audit_status"] == "APPROVED"
    assert data["is_within_budget"] is True
    assert data["remaining_balance_usd"] > 0
    assert data["total_projected_expenses_usd"] < 3000.0
    assert "flights" in data["itemized_breakdown"]
    assert "accommodation" in data["itemized_breakdown"]
    assert any("Budget Approved" in rec for rec in data["recommendations"])


def test_calculate_trip_budget_over_budget_case():
    """Verify budget auditor flags OVER_BUDGET when expenses exceed user budget limit."""
    result_raw = calculate_trip_budget(
        total_budget=1000.0,  # Tight budget
        flight_cost=700.0,
        accommodation_cost=600.0,
        daily_food_estimate=80.0,
        activities_cost=250.0,
        duration_days=4,
    )
    data = json.loads(result_raw)

    assert data["audit_status"] == "OVER_BUDGET"
    assert data["is_within_budget"] is False
    assert data["remaining_balance_usd"] < 0  # Deficit
    assert data["total_projected_expenses_usd"] > 1000.0
    assert any("Over Budget Warning" in rec for rec in data["recommendations"])


def test_weather_and_packing_tools():
    """Verify weather specialist returns temperature metrics and categorized checklist."""
    from app.tools.weather_tools import get_destination_weather, generate_packing_checklist

    weather_raw = get_destination_weather("Bali", "2026-10-15", 7)
    weather_data = json.loads(weather_raw)
    assert weather_data["destination"] == "Bali"
    assert "metrics" in weather_data
    assert weather_data["metrics"]["temp_high"] >= 20
    assert "plug_type" in weather_data["metrics"]

    packing_raw = generate_packing_checklist("Bali", travel_style="balanced", interests=["חופים ורוגע", "טבע"])
    packing_data = json.loads(packing_raw)
    assert len(packing_data["categories"]) >= 4
    for cat in packing_data["categories"]:
        assert "category" in cat
        assert len(cat["items"]) > 0


def test_safety_and_visa_tools():
    """Verify safety specialist returns visa requirements, emergency numbers, and etiquette."""
    from app.tools.safety_tools import get_safety_and_visa_info

    safety_raw = get_safety_and_visa_info("Santorini", nationality="IL")
    safety_data = json.loads(safety_raw)
    advisory = safety_data["advisory"]
    assert "visa_requirement" in advisory
    assert "emergency_numbers" in advisory
    assert "police" in advisory["emergency_numbers"]
    assert "ambulance" in advisory["emergency_numbers"]
    assert len(advisory["scam_alerts"]) > 0


def test_culture_and_events_tools():
    """Verify culture specialist returns secret gems and seasonal festivals."""
    from app.tools.events_tools import search_seasonal_events_and_gems

    events_raw = search_seasonal_events_and_gems("Bali")
    events_data = json.loads(events_raw)
    ce = events_data["culture_and_events"]
    assert len(ce["festivals"]) > 0
    assert len(ce["secret_gems"]) > 0
    assert len(ce["sunset_nightlife_spots"]) > 0
    assert "maps_query" in ce["secret_gems"][0]


def test_orchestrator_7_agents_synthesis():
    """Verify orchestrator synthesizes a complete plan combining all 7 specialists."""
    from app.agents.orchestrator import synthesize_deterministic_plan

    plan = synthesize_deterministic_plan(
        origin="TLV",
        destination="באלי, אינדונזיה",
        start_date="2026-10-15",
        duration_days=7,
        total_budget=3500.0,
        interests=["חופים ורוגע", "קולינריה ויין"],
        travel_style="luxury",
    )

    assert plan["budget_status"] in ["APPROVED", "OVER_BUDGET"]
    assert plan["total_estimated"] > 0
    assert plan["weather_metrics"] is not None
    assert len(plan["packing_checklist"]) >= 4
    assert plan["safety_info"] is not None
    assert plan["seasonal_events"] is not None
    assert len(plan["structured_days"]) == 7
    assert plan["recommended_flight"]["booking_url"].startswith("http")
    assert plan["selected_hotel"]["google_maps_url"].startswith("http")
    assert plan["start_date_formatted"] == "15/10/2026"  # Israeli format DD/MM/YYYY

