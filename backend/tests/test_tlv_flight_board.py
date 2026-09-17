import pytest
import json
from fastapi.testclient import TestClient
from app.main import app
from app.tools.tlv_flight_board_tools import (
    parse_israeli_holiday_dates,
    check_shabbat_and_holiday_conflict,
    calculate_baggage_and_true_cost,
    generate_tlv_holiday_flight_board,
    ISRAELI_HOLIDAYS_2026,
    BOI_USD_ILS_RATE,
)

client = TestClient(app)


def test_parse_israeli_holiday_dates():
    """Verify Israeli holiday parsing for Pesach 2026 and Sukkot 2026."""
    pesach = parse_israeli_holiday_dates("pesach")
    assert pesach["is_mapped_holiday"] is True
    assert pesach["depart_date"] == "2026-04-01"
    assert pesach["return_date"] == "2026-04-16"
    assert "01/04/2026" in pesach["school_break"]
    assert pesach["peak_season"] is True

    sukkot = parse_israeli_holiday_dates("סוכות 2026")
    assert sukkot["is_mapped_holiday"] is True
    assert sukkot["depart_date"] == "2026-10-04"
    assert sukkot["return_date"] == "2026-10-13"

    custom = parse_israeli_holiday_dates(depart_date="2026-11-05", return_date="2026-11-12")
    assert custom["is_mapped_holiday"] is False
    assert custom["depart_date"] == "2026-11-05"


def test_shabbat_and_holiday_conflict_detection():
    """Verify detection of Shabbat and Jewish holiday no-fly constraints for El Al / Israir."""
    # 2026-10-03 is Saturday (Shabbat & Erev Sukkot)
    conflict = check_shabbat_and_holiday_conflict(
        depart_date_str="2026-10-03",
        return_date_str="2026-10-10",
        holiday_key="sukkot",
    )
    assert conflict["has_shabbat_or_holiday_conflict"] is True
    assert len(conflict["conflicts"]) >= 1
    dep_conflict = conflict["conflicts"][0]
    assert dep_conflict["el_al_operates"] is False
    assert dep_conflict["israir_operates"] is False
    assert dep_conflict["arkia_foreign_operates"] is True
    assert "alternatives" in dep_conflict

    # Clean midweek date without conflict (e.g. Wednesday 2026-06-10 to Wednesday 2026-06-17)
    no_conflict = check_shabbat_and_holiday_conflict(
        depart_date_str="2026-06-10",
        return_date_str="2026-06-17",
    )
    assert no_conflict["has_shabbat_or_holiday_conflict"] is False


def test_calculate_baggage_and_true_cost_math():
    """Verify baggage fee rules and 3% FX math across carriers."""
    # 1. El Al Classic (Bag included)
    classic = calculate_baggage_and_true_cost(
        carrier_name="אל על Classic",
        base_fare_usd=500.0,
        checked_bag_needed=True,
        adults=1,
    )
    assert classic["bag_included"] is True
    assert classic["bag_fee_roundtrip_usd"] == 0.0
    assert classic["fx_fee_usd"] == round(500.0 * 0.03, 2)
    assert classic["true_total_per_person_usd"] == 515.0
    assert classic["true_total_per_person_nis"] == round(515.0 * BOI_USD_ILS_RATE)

    # 2. Israir ($65 per direction -> $130 roundtrip)
    israir = calculate_baggage_and_true_cost(
        carrier_name="ישראייר",
        base_fare_usd=300.0,
        checked_bag_needed=True,
        adults=2,
    )
    assert israir["bag_included"] is False
    assert israir["bag_fee_roundtrip_usd"] == 130.0
    subtotal = 300.0 + 130.0  # 430.0
    fx = round(430.0 * 0.03, 2)
    assert israir["true_total_per_person_usd"] == round(subtotal + fx, 2)
    assert israir["total_family_usd"] == round((subtotal + fx) * 2, 2)

    # 3. Arkia ($50 per direction -> $100 roundtrip)
    arkia = calculate_baggage_and_true_cost(
        carrier_name="ארקיע",
        base_fare_usd=300.0,
        checked_bag_needed=True,
        adults=1,
    )
    assert arkia["bag_fee_roundtrip_usd"] == 100.0


def test_generate_tlv_holiday_flight_board():
    """Verify full board synthesis, ranking, top picks, and search links."""
    board = generate_tlv_holiday_flight_board(
        holiday_name_or_key="pesach",
        destination="אתונה",
        adults=2,
        children=2,
        checked_bag_needed=True,
    )
    assert "holiday" in board
    assert "search_links" in board
    assert "google_flights" in board["search_links"]
    assert "curr=ILS&gl=IL&hl=he" in board["search_links"]["google_flights"]
    assert "skyscanner" in board["search_links"]
    assert "kayak" in board["search_links"]

    assert len(board["board_flights"]) > 0
    # Ensure flights are ranked ascending by true total NIS
    totals = [f["true_total_nis"] for f in board["board_flights"]]
    assert totals == sorted(totals)

    assert board["top_picks"]["best_value"] is not None
    assert board["top_picks"]["best_for_families"] is not None
    assert len(board["holiday_warnings"]) >= 3


def test_api_get_holidays():
    """Verify GET /api/v1/flights/holidays returns canonical list."""
    res = client.get("/api/v1/flights/holidays")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert len(data["holidays"]) >= 5
    keys = [h["key"] for h in data["holidays"]]
    assert "pesach" in keys
    assert "sukkot" in keys
    assert "summer" in keys


def test_api_tlv_holiday_board_sync():
    """Verify POST /api/v1/flights/tlv-holiday-board returns valid JSON."""
    payload = {
        "holiday_name_or_key": "sukkot",
        "destination": "anywhere",
        "adults": 2,
        "children": 1,
        "checked_bag_needed": True,
        "nonstop_only": False,
    }
    res = client.post("/api/v1/flights/tlv-holiday-board", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "holiday" in data
    assert "board_flights" in data
    assert len(data["board_flights"]) > 0
    assert "search_links" in data
    assert "top_picks" in data


def test_api_tlv_holiday_board_stream():
    """Verify POST /api/v1/flights/tlv-holiday-board/stream returns SSE stream."""
    payload = {
        "holiday_name_or_key": "summer",
        "destination": "לרנקה",
        "adults": 1,
        "checked_bag_needed": False,
    }
    res = client.post("/api/v1/flights/tlv-holiday-board/stream", json=payload)
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]
    text = res.text
    assert "event_start" in text or "step_start" in text or "data:" in text
    assert "complete" in text
