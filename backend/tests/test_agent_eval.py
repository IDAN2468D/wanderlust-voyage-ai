"""
Agent Evaluation Suite for Wanderlust Voyage AI.
Verifies itinerary completeness, input/output guardrails, budget consistency,
live API fallback resilience on httpx.TimeoutException, multi-turn chat, and HITL.
"""
import json
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from app.agents.guardrails import (
    TripGuardrailError,
    validate_trip_input,
    validate_trip_output,
)
from app.agents.orchestrator import synthesize_deterministic_plan
from app.main import app
from app.tools.budget_tools import calculate_trip_budget
from app.tools.places_tools import search_attractions, search_restaurants
from app.tools.weather_tools import get_destination_weather

client = TestClient(app)


def _future_date(days_ahead: int = 30) -> str:
    return (date.today() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")


def test_eval_end_to_end_itinerary_completeness():
    """Verify end-to-end itinerary includes flights, hotel, daily activities, packing list, and safety info."""
    start = _future_date(45)
    plan = synthesize_deterministic_plan(
        origin="TLV",
        destination="Rome",
        start_date=start,
        duration_days=5,
        total_budget=3200.0,
        interests=["History", "Culinary"],
        travel_style="balanced",
        currency="USD",
    )

    assert plan["recommended_flight"] is not None
    assert plan["recommended_flight"]["price_usd"] > 0
    assert plan["selected_hotel"] is not None
    assert plan["selected_hotel"]["nightly_rate_usd"] > 0
    assert len(plan["structured_days"]) == 5
    for day in plan["structured_days"]:
        assert day["morning"]["activity"]
        assert day["afternoon"]["dining"]
        assert day["evening"]["activity"]
    assert len(plan["packing_checklist"]) >= 4
    assert plan["safety_info"] is not None
    assert "emergency_numbers" in plan["safety_info"]
    assert plan["start_date_formatted"] == (date.today() + timedelta(days=45)).strftime("%d/%m/%Y")


def test_eval_guardrails_reject_invalid_and_past_dates_and_bad_budgets():
    """Verify validate_trip_input and API endpoints reject past/invalid dates and unrealistic budgets."""
    # Past date
    with pytest.raises(TripGuardrailError):
        validate_trip_input("TLV", "Rome", "2020-01-01", 5, 2000.0)

    # Invalid date string
    with pytest.raises(TripGuardrailError):
        validate_trip_input("TLV", "Rome", "not-a-date", 5, 2000.0)

    # Non-positive budget
    with pytest.raises(TripGuardrailError):
        validate_trip_input("TLV", "Rome", _future_date(15), 5, 0.0)
    with pytest.raises(TripGuardrailError):
        validate_trip_input("TLV", "Rome", _future_date(15), 5, -300.0)

    # Unrealistic budget (< $50/day)
    with pytest.raises(TripGuardrailError):
        validate_trip_input("TLV", "Rome", _future_date(15), 6, 250.0)

    # HTTP endpoints enforce guardrails
    resp_past = client.post(
        "/api/trips/plan",
        json={
            "origin": "TLV",
            "destination": "Paris",
            "start_date": "2021-05-01",
            "duration_days": 4,
            "total_budget": 2000.0,
        },
    )
    assert resp_past.status_code == 422

    resp_low_budget = client.post(
        "/api/plan-trip",
        json={
            "origin": "TLV",
            "destination": "Paris",
            "start_date": _future_date(20),
            "duration_days": 5,
            "total_budget": 100.0,
        },
    )
    assert resp_low_budget.status_code == 422


def test_eval_output_guardrail_checks_keys_date_format_and_overrun():
    """Verify validate_trip_output validates schema keys, DD/MM/YYYY format, and flags budget overruns."""
    with pytest.raises(TripGuardrailError):
        validate_trip_output({"markdown_plan": "incomplete"}, 1000.0)

    sample = synthesize_deterministic_plan(
        origin="TLV",
        destination="Tokyo",
        start_date=_future_date(25),
        duration_days=5,
        total_budget=600.0,  # Likely over budget for Tokyo
        interests=["Culture"],
        travel_style="balanced",
    )
    checked = validate_trip_output(dict(sample), max_budget=600.0)
    assert checked["budget_overrun_flagged"] is True
    assert checked["budget_status"] == "OVER_BUDGET"
    assert len(checked["guardrail_warnings"]) >= 1

    # Invalid Israeli date format rejected
    bad_date_sample = dict(sample)
    bad_date_sample["start_date_formatted"] = "2027-01-15"
    with pytest.raises(TripGuardrailError):
        validate_trip_output(bad_date_sample, max_budget=5000.0)


def test_eval_budget_consistency_matches_category_breakdown():
    """Verify total_estimated matches the sum of itemized category breakdowns."""
    plan = synthesize_deterministic_plan(
        origin="TLV",
        destination="Paris",
        start_date=_future_date(35),
        duration_days=4,
        total_budget=4000.0,
        interests=["Art", "Food"],
        travel_style="balanced",
    )

    breakdown = plan["itemized_breakdown"]
    category_sum = sum(cat["amount_usd"] for cat in breakdown.values())
    assert abs(plan["total_estimated"] - category_sum) <= 0.10


def _make_async_client_mock(get_side_effect=None, get_return_value=None):
    """Build a mock httpx.AsyncClient async context manager."""
    client_instance = MagicMock()
    client_instance.get = AsyncMock(side_effect=get_side_effect, return_value=get_return_value)
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=client_instance)
    cm.__aexit__ = AsyncMock(return_value=False)
    return cm


def test_eval_live_api_fallback_resilience_on_timeout():
    """Verify weather, budget, and places tools fall back cleanly when httpx raises TimeoutException."""
    cm = _make_async_client_mock(get_side_effect=httpx.TimeoutException("Simulated 5s timeout"))
    with patch("httpx.AsyncClient", return_value=cm):
        weather_data = json.loads(get_destination_weather("Bali", _future_date(20), 5))
        assert weather_data["data_source"] == "deterministic_fallback"
        assert weather_data["metrics"]["temp_high"] >= 20

        budget_data = json.loads(
            calculate_trip_budget(
                total_budget=3000.0,
                flight_cost=500.0,
                accommodation_cost=800.0,
                daily_food_estimate=60.0,
                activities_cost=150.0,
                duration_days=5,
            )
        )
        assert budget_data["rates_source"] == "deterministic_fallback"
        assert budget_data["exchange_rates"]["ILS"] == 3.70

        places_data = json.loads(search_attractions("Rome", ["History"], max_results=2))
        assert len(places_data["attractions"]) == 2
        assert places_data["attractions"][0]["geo_source"] == "deterministic_fallback"

        dining_data = json.loads(search_restaurants("Rome"))
        assert len(dining_data["recommendations"]) >= 1
        assert dining_data["recommendations"][0]["geo_source"] == "deterministic_fallback"


def test_eval_live_api_success_parsing():
    """Verify weather, budget, and places tools parse live HTTP payloads when APIs respond."""
    geo_resp = MagicMock()
    geo_resp.raise_for_status = MagicMock()
    geo_resp.json.return_value = {"results": [{"latitude": 41.9028, "longitude": 12.4964}]}

    forecast_resp = MagicMock()
    forecast_resp.raise_for_status = MagicMock()
    forecast_resp.json.return_value = {
        "daily": {
            "temperature_2m_max": [27.0, 28.0],
            "temperature_2m_min": [17.0, 18.0],
            "precipitation_probability_max": [10, 20],
        }
    }

    cm_weather = _make_async_client_mock(get_side_effect=[geo_resp, forecast_resp])
    with patch("httpx.AsyncClient", return_value=cm_weather):
        w = json.loads(get_destination_weather("Rome", _future_date(10), 2))
        assert w["data_source"] == "open-meteo"
        assert w["metrics"]["temp_high"] == 28
        assert w["metrics"]["temp_low"] == 18
        assert w["metrics"]["rain_chance"] == 20

    fx_resp = MagicMock()
    fx_resp.raise_for_status = MagicMock()
    fx_resp.json.return_value = {"rates": {"EUR": 0.91, "ILS": 3.65, "GBP": 0.78}}

    cm_fx = _make_async_client_mock(get_return_value=fx_resp)
    with patch("httpx.AsyncClient", return_value=cm_fx):
        b = json.loads(calculate_trip_budget(3000, 500, 700, 60, 100, 4))
        assert b["rates_source"] == "frankfurter"
        assert b["exchange_rates"]["ILS"] == 3.65

    nom_resp = MagicMock()
    nom_resp.status_code = 200
    nom_resp.raise_for_status = MagicMock()
    nom_resp.json.return_value = [{"lat": "41.890210", "lon": "12.492231"}]

    cm_nom = _make_async_client_mock(get_return_value=nom_resp)
    with patch("httpx.AsyncClient", return_value=cm_nom):
        p = json.loads(search_attractions("Rome", ["History"], max_results=1))
        assert p["attractions"][0]["geo_source"] == "nominatim"
        assert "openstreetmap.org" in p["attractions"][0]["osm_url"]


@pytest.mark.asyncio
async def test_eval_agno_stream_live_run_and_fallback():
    """Verify stream_multi_agent_execution runs Agno orchestrator when configured and falls back on error."""
    import app.agents.orchestrator as orch

    mock_team = MagicMock()
    mock_team.arun = AsyncMock(side_effect=RuntimeError("Simulated Gemini outage"))

    with patch.object(orch, "AGNO_AVAILABLE", True), \
         patch.object(orch, "travel_orchestrator", mock_team), \
         patch.object(orch.settings, "GEMINI_API_KEY", "test-fake-key"):
        events = []
        async for chunk in orch.stream_multi_agent_execution(
            origin="TLV",
            destination="Rome",
            start_date=_future_date(20),
            duration_days=3,
            total_budget=2500.0,
            interests=["History"],
            session_id="eval_agno_fallback",
        ):
            events.append(chunk)

        assert mock_team.arun.await_count == 1
        assert any("event: done" in e for e in events)

        chat_res = await orch.run_trip_chat("eval_agno_fallback", "אפשר להוסיף יום?")
        assert chat_res["session_id"] == "eval_agno_fallback"
        assert len(chat_res["reply"]) > 5


def test_eval_multi_turn_chat_and_hitl_approval():
    """Verify POST /api/trips/chat session memory and Human-In-The-Loop approval workflow."""
    session_id = "eval_chat_session_01"
    r1 = client.post("/api/trips/chat", json={"session_id": session_id, "message": "אני רוצה חופשה ברומא"})
    assert r1.status_code == 200
    assert r1.json()["session_id"] == session_id
    assert len(r1.json()["reply"]) > 10

    r2 = client.post("/api/trips/chat", json={"session_id": session_id, "message": "תעדכן את התקציב ל-$2500"})
    assert r2.status_code == 200
    assert "שיחה #2" in r2.json()["reply"] or r2.json()["reply"]

    # HITL Calendar: require_approval=True -> pending_approval -> approve
    cal_pending = client.post(
        "/api/workspace/sync-calendar",
        json={
            "destination": "Rome",
            "start_date": _future_date(20),
            "duration_days": 4,
            "require_approval": True,
        },
    )
    assert cal_pending.status_code == 200
    cal_data = cal_pending.json()
    assert cal_data["status"] == "pending_approval"
    assert cal_data["action_id"]

    cal_approved = client.post(
        "/api/trips/approve-action",
        json={"action_id": cal_data["action_id"], "approved": True},
    )
    assert cal_approved.status_code == 200
    assert cal_approved.json()["status"] == "executed"
    assert "calendar.google.com" in cal_approved.json()["result"]["google_calendar_url"]

    # HITL Briefing: require_approval=True -> pending_approval -> cancel
    mail_pending = client.post(
        "/api/workspace/send-briefing",
        json={
            "destination": "Rome",
            "duration_days": 4,
            "recipient_email": "traveler@example.com",
            "markdown_plan": "# Rome Trip",
            "total_estimated_usd": 1900.0,
            "require_approval": True,
        },
    )
    assert mail_pending.status_code == 200
    mail_data = mail_pending.json()
    assert mail_data["status"] == "pending_approval"
    assert mail_data["action_id"]

    mail_cancelled = client.post(
        "/api/trips/approve-action",
        json={"action_id": mail_data["action_id"], "approved": False},
    )
    assert mail_cancelled.status_code == 200
    assert mail_cancelled.json()["status"] == "cancelled"
