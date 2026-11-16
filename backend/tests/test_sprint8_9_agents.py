import json
from datetime import date, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.tools.replan_tools import (
    detect_itinerary_conflicts,
    apply_itinerary_swap,
    compute_plan_diff,
)
from app.tools.group_split_tools import (
    compute_group_cost_split,
    generate_split_track_options,
    build_group_settlement_ledger,
)
from app.tools.memory_tools import (
    check_passport_validity_window,
    load_traveler_memory,
    update_traveler_memory,
)
from app.tools.shabbat_halacha_tools import get_shabbat_halacha_schedule
from app.tools.connectivity_mobility_tools import get_connectivity_and_mobility_guide
from app.tools.protection_rerouting_tools import get_protection_and_rerouting_plan
from app.tools.loyalty_vault_tools import get_loyalty_and_vault_readiness
from app.tools.concierge_tools import build_pre_departure_timeline, run_watchdog_scan
from app.tools.flight_tools import search_flights
from app.agents.critic import run_trip_critic_audit
from app.rag.vector_store import VectorStore, VectorRecord
from app.mcp.travel_mcp_server import replan_trip_day, get_booking_readiness_timeline

client = TestClient(app)


def test_tlv_carrier_filter_excludes_blocked_airlines():
    future_date = (date.today() + timedelta(days=30)).isoformat()
    flights_raw = search_flights(origin="TLV", destination="Rome", departure_date=future_date)
    flights_data = json.loads(flights_raw) if isinstance(flights_raw, str) else flights_raw
    flights = flights_data.get("flights", flights_data) if isinstance(flights_data, dict) else flights_data
    assert len(flights) > 0
    for f in flights:
        code = str(f.get("airline_code", "")).upper()
        flight_num = str(f.get("flight_number", "")).upper()
        assert code not in {"EK", "TK", "QR"}
        assert not flight_num.startswith(("EK", "TK", "QR"))


def test_replan_tools_and_diff():
    plan_payload = {
        "destination": "Rome",
        "total_budget": 2400.0,
        "flight_cost": 500.0,
        "hotel_cost": 700.0,
        "activities_cost": 150.0,
        "duration_days": 3,
        "structured_days": [
            {
                "day_number": 1,
                "date_formatted": "01/06/2026",
                "title": "יום 1: רומא העתיקה",
                "morning": {"time": "09:30", "activity": "קולוסיאום", "highlight": "סיור מודרך", "cost_usd": 35},
                "afternoon": {"time": "13:00", "dining": "La Taverna", "signature_dish": "פסטה", "neighborhood": "מרכז", "activity": "פיאצה נאבונה"},
                "evening": {"time": "19:30", "activity": "טרסטוורה", "highlight": "טיול ערב"},
                "local_tip": "להגיע מוקדם",
            }
        ],
    }
    conflicts = detect_itinerary_conflicts(plan_payload)
    assert isinstance(conflicts, list)

    res = apply_itinerary_swap(
        plan_payload=plan_payload,
        day_number=1,
        slot="morning",
        trigger_type="weather",
        constraint_note="החלף למוזיאון מקורה בגלל גשם",
    )
    assert len(res["diffs"]) == 1
    assert res["updated_plan"]["structured_days"][0]["morning"]["activity"] != "קולוסיאום"

    diffs = compute_plan_diff(plan_payload, res["updated_plan"])
    assert len(diffs) >= 1


def test_group_split_tools_and_endpoints():
    split_raw = compute_group_cost_split(travelers=4, flight_cost_per_trip=300.0, hotel_cost_total=800.0, activities_cost_total=200.0, duration_days=4)
    split = json.loads(split_raw)
    assert split["travelers_count"] == 4
    assert len(split["per_person"]) == 4

    tracks = generate_split_track_options([{"name": "A", "role": "adult"}, {"name": "B", "role": "child"}])
    assert len(tracks) >= 2

    ledger = build_group_settlement_ledger(per_person=split["per_person"], organizer_name=split["per_person"][0]["name"])
    assert len(ledger) >= 1

    sid = "session_sprint8_group"
    resp = client.post(
        f"/api/v1/trips/{sid}/group-split",
        json={"travelers_count": 3, "split_mode": "equal", "total_cost_usd": 1800.0},
    )
    assert resp.status_code == 200

    vote_resp = client.post(
        f"/api/v1/trips/{sid}/vote",
        json={"item_id": "day_1_colosseum", "item_type": "activity", "vote": 1, "voter_name": "Idan"},
    )
    assert vote_resp.status_code in {200, 201}

    votes_get = client.get(f"/api/v1/trips/{sid}/votes")
    assert votes_get.status_code == 200
    assert votes_get.json()["total_votes"] >= 1


def test_shabbat_connectivity_protection_loyalty_concierge_tools():
    shabbat = json.loads(get_shabbat_halacha_schedule("Rome", "2026-06-12", duration_days=7, shabbat_safe_mode=True))
    assert shabbat["shabbat_safe_mode"] is True
    assert "candle_lighting_estimate" in shabbat
    assert "walk_minutes_to_chabad" in shabbat

    conn = json.loads(get_connectivity_and_mobility_guide("Rome", duration_days=7, travelers=2))
    assert "esim_recommendation" in conn

    prot = json.loads(get_protection_and_rerouting_plan("Rome", travelers=2))
    assert "passenger_rights" in prot and "tibi_law_max_compensation_nis" in prot["passenger_rights"]
    assert "insurance_audit" in prot and "required_riders" in prot["insurance_audit"]

    loyalty = json.loads(get_loyalty_and_vault_readiness(destination="Rome", start_date="2026-06-12", airline="EL AL", flight_cost_usd=450.0))
    assert "miles_vs_cash" in loyalty and "readiness_vault" in loyalty

    timeline = build_pre_departure_timeline("BK-TEST-99", "Rome", 7, 2400.0)
    assert len(timeline["milestones"]) >= 3
    watchdog = run_watchdog_scan([{"booking_ref": "BK-TEST-99", "destination": "Rome", "start_date": "2026-06-15"}])
    assert "alerts" in watchdog or "status" in watchdog


def test_critic_audit_and_memory_tools():
    start_d = (date.today() + timedelta(days=20)).isoformat()
    future_expiry = (date.today() + timedelta(days=365)).isoformat()
    check = check_passport_validity_window(future_expiry, start_d, 7, "Rome")
    assert check["status"] == "VALID"

    mem = update_traveler_memory("test_mem_user", {"kosher_level": "kosher", "shabbat_observant": True})
    assert mem["kosher_level"] == "kosher"
    loaded = load_traveler_memory("test_mem_user")
    assert loaded["shabbat_observant"] is True

    audit = run_trip_critic_audit(
        plan_data={
            "flight_cost": 500.0,
            "hotel_cost": 700.0,
            "activities_cost": 150.0,
            "total_estimated": 1700.0,
            "selected_hotel": {"google_maps_url": "https://maps.google.com/?q=Rome"},
            "structured_days": [
                {
                    "day_number": 1,
                    "morning": {"activity": "Museum"},
                    "afternoon": {"dining": "Bistro", "activity": "Plaza"},
                    "evening": {"activity": "Walk"},
                }
            ],
        },
        origin="TLV",
        destination="Rome",
        start_date=start_d,
        duration_days=3,
        total_budget=2400.0,
        shabbat_safe_mode=True,
    )
    assert audit["status"] in {"VERIFIED", "REPAIRED"}
    assert audit["checks_passed"] >= 2


def test_personal_rag_owner_isolation():
    store = VectorStore()
    store.records = [
        VectorRecord(
            chunk_id="pub_1",
            doc_id="doc_pub",
            destination="rome",
            category="general",
            title="Public Rome",
            content="Rome public travel tips and Vatican hours.",
            source="guide.md",
            tags=["rome"],
            aliases=["roma"],
            embedding=[1.0, 0.0, 0.0],
            owner_user_id=None,
        ),
        VectorRecord(
            chunk_id="priv_user_a",
            doc_id="doc_priv_a",
            destination="rome",
            category="personal",
            title="User A Secret Hotel",
            content="User A private booking code XYZ123 in Rome.",
            source="user_note.txt",
            tags=["rome"],
            aliases=[],
            embedding=[1.0, 0.0, 0.0],
            owner_user_id="user_a",
        ),
    ]

    res_b = store.search([1.0, 0.0, 0.0], top_k=5, owner_user_id="user_b")
    ids_b = [r["chunk_id"] for r in res_b]
    assert "pub_1" in ids_b
    assert "priv_user_a" not in ids_b

    res_a = store.search([1.0, 0.0, 0.0], top_k=5, owner_user_id="user_a")
    ids_a = [r["chunk_id"] for r in res_a]
    assert "priv_user_a" in ids_a


def test_api_replan_preferences_readiness_ops_and_mcp():
    future_date = (date.today() + timedelta(days=25)).isoformat()
    plan_resp = client.post(
        "/api/v1/trips/plan",
        json={
            "origin": "TLV",
            "destination": "Rome",
            "start_date": future_date,
            "duration_days": 3,
            "total_budget": 2400,
            "shabbat_safe_mode": True,
            "kosher_only": True,
            "accessibility_mode": True,
            "travelers": 3,
        },
    )
    assert plan_resp.status_code == 200
    pdata = plan_resp.json()
    sid = pdata["session_id"]
    assert pdata.get("shabbat_halacha") is not None
    assert pdata.get("connectivity_mobility") is not None
    assert pdata.get("protection_rerouting") is not None
    assert pdata.get("loyalty_vault") is not None
    assert pdata.get("critic_audit") is not None

    replan_resp = client.post(
        f"/api/v1/trips/{sid}/replan",
        json={"day_number": 1, "slot": "morning", "instruction": "שנה למוזיאון"},
    )
    assert replan_resp.status_code == 200
    assert len(replan_resp.json()["diffs"]) >= 1

    prefs_put = client.put(
        "/api/v1/profile/preferences",
        json={"seating_preference": "window", "dietary": "kosher"},
    )
    assert prefs_put.status_code == 200

    prefs_get = client.get("/api/v1/profile/preferences")
    assert prefs_get.status_code == 200

    ingest_resp = client.post(
        "/api/v1/knowledge/ingest-personal",
        json={"title": "My Flight Note", "content": "Always bring neck pillow on TLV-FCO."},
    )
    assert ingest_resp.status_code in {200, 201}

    booking_resp = client.post(
        "/api/v1/workspace/booking-confirmation",
        json={
            "booking_ref": "BK-READY-1",
            "destination": "Rome",
            "duration_days": 3,
            "total_amount": 1800,
            "currency": "USD",
            "recipient_email": "traveler@example.com",
            "customer_name": "Idan",
            "payment_method": "card",
        },
    )
    assert booking_resp.status_code == 200

    readiness_resp = client.get("/api/v1/bookings/BK-READY-1/readiness")
    assert readiness_resp.status_code == 200
    assert "milestones" in readiness_resp.json()

    pulse_resp = client.get("/api/v1/ops/live-pulse")
    assert pulse_resp.status_code == 200
    assert "fx_rates" in pulse_resp.json()

    metrics_resp = client.get("/api/v1/ops/metrics")
    assert metrics_resp.status_code == 200
    assert metrics_resp.json()["agents_registered"] >= 25

    mcp_replan = json.loads(replan_trip_day(destination="Rome", day_number=1, slot="morning", constraint_note="Art gallery"))
    assert len(mcp_replan["diffs"]) >= 1

    mcp_readiness = json.loads(get_booking_readiness_timeline("BK-MCP-1", "Rome", 3, 1800.0))
    assert "milestones" in mcp_readiness


def test_production_oauth_rejects_email_only_login():
    original_env = settings.APP_ENV
    try:
        settings.APP_ENV = "production"
        resp = client.post("/api/auth/google", json={"email": "attacker@example.com"})
        assert resp.status_code in {400, 401}
    finally:
        settings.APP_ENV = original_env
