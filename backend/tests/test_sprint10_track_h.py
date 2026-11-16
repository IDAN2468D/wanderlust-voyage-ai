import json
from datetime import date, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.mcp.travel_mcp_server import (
    create_travel_interest_watcher,
    decompose_travel_screenshot,
    get_acp_commerce_manifest,
    scan_booking_price_drops,
)

client = TestClient(app)


def test_acp_manifest_delegate_and_atomic_checkout():
    well_known = client.get("/.well-known/agent-commerce.json")
    assert well_known.status_code == 200
    manifest = well_known.json()
    assert manifest["protocol"] == "ACP-UCP/2026.1"
    assert "merchant_signature_hmac_sha256" in manifest
    assert "ILS" in manifest["supported_currencies"]

    api_manifest = client.get("/api/v1/acp/manifest")
    assert api_manifest.status_code == 200

    token_resp = client.post(
        "/api/v1/acp/tokens/delegate",
        json={
            "external_agent_provider": "OPENAI_ACP",
            "user_id": "usr_track_h_test",
            "max_authorized_ils": 5000.0,
            "allowed_categories": ["FLIGHT", "HOTEL"],
            "ttl_minutes": 60,
        },
    )
    assert token_resp.status_code == 201
    token_data = token_resp.json()
    assert token_data["status"] == "AUTHORIZED"
    assert token_data["delegated_token"].startswith("dst_")

    # Within ceiling -> COMPLETED + auto Price Guard
    ok_checkout = client.post(
        "/api/v1/acp/checkout",
        json={
            "external_agent_provider": "PERPLEXITY_PRO",
            "user_id": "usr_track_h_test",
            "delegated_token": token_data["delegated_token"],
            "max_authorized_ils": 5000.0,
            "destination": "Santorini",
            "origin": "TLV",
            "duration_days": 5,
            "sku_codes": ["FLT-TLV-JTR", "HTL-OIA-CLIFF"],
            "shabbat_safe_mode": True,
        },
    )
    assert ok_checkout.status_code == 200
    ok_data = ok_checkout.json()
    assert ok_data["status"] == "COMPLETED"
    assert ok_data["booking_ref"].startswith("WL-ACP-")
    assert ok_data["executed_total_ils"] == 4480.0
    assert ok_data["price_guard_policy"]["coverage_days"] == 30

    # Exceeding ceiling -> REJECTED_BUDGET_EXCEEDED
    rejected = client.post(
        "/api/v1/acp/checkout",
        json={
            "external_agent_provider": "GOOGLE_UCP",
            "user_id": "usr_track_h_test",
            "max_authorized_ils": 2000.0,
            "destination": "Santorini",
            "sku_codes": ["FLT-TLV-JTR", "HTL-OIA-CLIFF"],
        },
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "REJECTED_BUDGET_EXCEEDED"

    sessions = client.get("/api/v1/acp/sessions")
    assert sessions.status_code == 200
    assert len(sessions.json()["sessions"]) >= 2


def test_proactive_interests_scout_lifecycle():
    create_resp = client.post(
        "/api/v1/interests",
        json={
            "user_id": "usr_interest_test",
            "raw_prompt_hebrew": "טיסות לטוקיו עם מזוודה מתחת ל-3500 ש\"ח",
            "target_category": "FLIGHTS",
            "max_price_ils": 3500.0,
            "auto_reserve_vip": True,
        },
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    iid = created["interest_id"]
    assert len(created["extracted_keywords"]) >= 2
    assert len(created["matched_alerts"]) >= 1
    assert created["matched_alerts"][0]["destination"] == "Tokyo"
    assert created["matched_alerts"][0]["auto_reserved_vip_until"] is not None

    list_resp = client.get("/api/v1/interests?user_id=usr_interest_test")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

    eval_resp = client.post(f"/api/v1/interests/{iid}/evaluate")
    assert eval_resp.status_code == 200
    assert eval_resp.json()["interest_id"] == iid

    del_resp = client.delete(f"/api/v1/interests/{iid}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "DELETED"


def test_vision_screenshot_decompose_and_fit_assessment():
    presets_resp = client.get("/api/v1/vision-trip/presets")
    assert presets_resp.status_code == 200
    assert len(presets_resp.json()["presets"]) == 5

    dec_resp = client.post(
        "/api/v1/vision-trip/decompose-screenshot",
        json={
            "scene_type": "SANTORINI_CLIFFSIDE",
            "travelers": 2,
            "budget_ceiling_ils": 8500.0,
        },
    )
    assert dec_resp.status_code == 200
    dec = dec_resp.json()
    assert len(dec["hotspots"]) == 3
    assert dec["bundle_discount_pct"] == 10
    assert dec["bundle_total_ils"] == round(dec["subtotal_ils"] * 0.90, 2)
    assert dec["within_budget"] is True

    fit_resp = client.post(
        "/api/v1/vision-trip/fit-assessment",
        json={
            "scene_type": "SANTORINI_CLIFFSIDE",
            "travelers": 2,
            "budget_ceiling_ils": 8500.0,
            "shabbat_observant": True,
            "max_flight_hours": 5.0,
        },
    )
    assert fit_resp.status_code == 200
    fit = fit_resp.json()
    assert 45 <= fit["fit_accuracy_pct"] <= 99


def test_price_guard_scan_and_booking_auto_register():
    reg_resp = client.post(
        "/api/v1/price-guard/register",
        json={
            "user_id": "usr_pg_test",
            "booking_ref": "WL-PG-1001",
            "destination": "Rome",
            "sku_code": "PKG-TLV-ROM-5D",
            "paid_amount_ils": 4000.0,
            "vip_tier": "PLATINUM",
        },
    )
    assert reg_resp.status_code == 201
    assert reg_resp.json()["coverage_days"] == 30

    scan_resp = client.post(
        "/api/v1/price-guard/scan-drops",
        json={
            "user_id": "usr_pg_test",
            "booking_ref": "WL-PG-1001",
            "destination": "Rome",
            "paid_amount_ils": 4000.0,
            "sku_code": "PKG-TLV-ROM-5D",
            "vip_tier": "PLATINUM",
            "simulated_market_drop_pct": 10.0,
        },
    )
    assert scan_resp.status_code == 200
    scan = scan_resp.json()
    assert scan["price_drop_detected"] is True
    assert scan["refund_issued_ils"] == 400.0
    assert scan["wallet_balance_ils"] >= 400.0

    overview = client.get("/api/v1/price-guard?user_id=usr_pg_test")
    assert overview.status_code == 200
    assert overview.json()["active_policies_count"] >= 1


def test_pulse_negotiator_ops_metrics_plan_and_mcp():
    pulse_list = client.get("/api/v1/pulse/actions")
    assert pulse_list.status_code == 200
    cards = pulse_list.json()["cards"]
    assert len(cards) == 3

    exec_resp = client.post(
        f"/api/v1/pulse/actions/{cards[0]['action_id']}/execute",
        json={"user_id": "usr_pulse_test"},
    )
    assert exec_resp.status_code == 200
    assert exec_resp.json()["status"] == "EXECUTED"

    neg_resp = client.post(
        "/api/v1/trips/negotiate-bundle",
        json={
            "destination": "Santorini",
            "base_total_ils": 6000.0,
            "travelers": 2,
            "components": ["FLIGHT", "BOUTIQUE_HOTEL", "TRANSFER_ESIM"],
            "loyalty_tier": "PLATINUM",
            "target_discount_pct": 12.0,
        },
    )
    assert neg_resp.status_code == 200
    neg = neg_resp.json()
    assert neg["approved_discount_pct"] == 12.0
    assert neg["final_total_ils"] == 5280.0

    metrics = client.get("/api/v1/ops/metrics")
    assert metrics.status_code == 200
    assert metrics.json()["agents_registered"] == 31

    future_date = (date.today() + timedelta(days=25)).isoformat()
    plan_resp = client.post(
        "/api/v1/trips/plan",
        json={
            "origin": "TLV",
            "destination": "Santorini",
            "start_date": future_date,
            "duration_days": 4,
            "total_budget": 2500,
        },
    )
    assert plan_resp.status_code == 200
    assert plan_resp.json().get("track_h_insights", {}).get("acp_ready") is True

    # MCP Tools
    assert json.loads(get_acp_commerce_manifest())["protocol"] == "ACP-UCP/2026.1"
    assert json.loads(create_travel_interest_watcher("usr_mcp", "סנטוריני ירח דבש", "PACKAGES", 5000.0))["interest_id"].startswith("int_")
    assert json.loads(decompose_travel_screenshot("TOKYO_NEON_FOOD", 2, 9500.0))["bundle_discount_pct"] == 10
    assert json.loads(scan_booking_price_drops("usr_mcp", "WL-MCP-1", 4000.0, "Rome"))["price_drop_detected"] is True
