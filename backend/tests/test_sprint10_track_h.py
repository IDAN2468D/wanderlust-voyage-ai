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


def test_screenshot_decompose_dynamic_paris_url_overrides_preset():
    paris_url = "https://www.skideal.co.il/app/uploads/2020/06/PARIS-e1591107821840.jpg"
    dec_resp = client.post(
        "/api/v1/vision-trip/decompose-screenshot",
        json={
            "scene_type": "SANTORINI_CLIFFSIDE",
            "scene_key": "SANTORINI_CLIFFSIDE",
            "image_source_url": paris_url,
            "travelers": 2,
            "budget_ceiling_ils": 8500.0,
        },
    )
    assert dec_resp.status_code == 200
    dec = dec_resp.json()
    assert dec["destination"] == "Paris"
    assert dec["is_dynamic_detection"] is True
    assert dec["image_url"] == paris_url
    assert dec["iata_code"] == "CDG"
    sku_codes = {hs["sku_code"] for hs in dec["hotspots"]}
    assert "FLT-TLV-CDG" in sku_codes
    assert "HTL-PAR-EIFFEL" in sku_codes
    assert "EXP-PAR-SEINE" in sku_codes
    assert "FLT-TLV-JTR" not in sku_codes
    assert dec["bundle_total_ils"] == round(dec["subtotal_ils"] * 0.90, 2)

    fit_resp = client.post(
        "/api/v1/vision-trip/fit-assessment",
        json={
            "scene_type": "SANTORINI_CLIFFSIDE",
            "image_source_url": paris_url,
            "travelers": 2,
            "budget_ceiling_ils": 8500.0,
            "shabbat_observant": True,
            "max_flight_hours": 6.0,
        },
    )
    assert fit_resp.status_code == 200
    fit = fit_resp.json()
    assert fit["destination"] == "Paris"
    assert 45 <= fit["fit_accuracy_pct"] <= 99

    upload_resp = client.post(
        "/api/v1/vision-trip/decompose-screenshot",
        json={
            "scene_type": "SANTORINI_CLIFFSIDE",
            "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            "file_name": "london-bigben-weekend.png",
            "travelers": 2,
            "budget_ceiling_ils": 9000.0,
        },
    )
    assert upload_resp.status_code == 200
    uploaded = upload_resp.json()
    assert uploaded["destination"] == "London"
    assert uploaded["is_dynamic_detection"] is True
    assert uploaded["image_url"].startswith("data:image/png;base64,")


def _build_minimal_jpeg_with_gps(lat_deg: int, lat_min: int, lon_deg: int, lon_min: int) -> bytes:
    import struct

    # Build a minimal little-endian TIFF header + IFD0 (tag 0x8825 -> GPS IFD) + GPS IFD (Rome by default)
    ifd0_offset = 8
    gps_ifd_offset = ifd0_offset + 2 + 12 + 4
    gps_data_offset = gps_ifd_offset + 2 + 4 * 12 + 4
    # 3 rationals (24 bytes) for lat + 3 rationals (24 bytes) for lon
    lat_data_off = gps_data_offset
    lon_data_off = gps_data_offset + 24

    tiff = bytearray()
    tiff += b"II" + struct.pack("<HI", 42, ifd0_offset)
    # IFD0: 1 entry -> tag 0x8825 (LONG, count 1, offset gps_ifd_offset)
    tiff += struct.pack("<H", 1)
    tiff += struct.pack("<HHII", 0x8825, 4, 1, gps_ifd_offset)
    tiff += struct.pack("<I", 0)
    # GPS IFD: 4 entries (LatRef, Lat, LonRef, Lon)
    tiff += struct.pack("<H", 4)
    tiff += struct.pack("<HHII", 1, 2, 2, int.from_bytes(b"N\x00\x00\x00", "little"))
    tiff += struct.pack("<HHII", 2, 5, 3, lat_data_off)
    tiff += struct.pack("<HHII", 3, 2, 2, int.from_bytes(b"E\x00\x00\x00", "little"))
    tiff += struct.pack("<HHII", 4, 5, 3, lon_data_off)
    tiff += struct.pack("<I", 0)
    # Lat rationals & Lon rationals
    tiff += struct.pack("<IIIIII", lat_deg, 1, lat_min, 1, 0, 1)
    tiff += struct.pack("<IIIIII", lon_deg, 1, lon_min, 1, 0, 1)

    exif_payload = b"Exif\x00\x00" + bytes(tiff)
    app1 = b"\xff\xe1" + struct.pack(">H", len(exif_payload) + 2) + exif_payload
    return b"\xff\xd8" + app1 + b"\xff\xd9"


def test_vision_unidentified_upload_exif_gps_and_url_pixel_fetch(monkeypatch):
    import base64
    from types import SimpleNamespace
    from app.tools import vision_image_utils, vision_trip_tools

    # 1. Generic pasted screenshot without Gemini key must ask for hint instead of faking Paris
    monkeypatch.setattr(vision_trip_tools.settings, "GEMINI_API_KEY", "")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    tiny_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    unid_resp = client.post(
        "/api/v1/vision-trip/decompose-screenshot",
        json={"scene_type": "SANTORINI_CLIFFSIDE", "image_base64": tiny_png, "file_name": "pasted-screenshot.png"},
    )
    assert unid_resp.status_code == 200
    unid = unid_resp.json()
    assert unid["needs_visual_hint"] is True
    assert unid["detection_source"] == "unidentified_upload"
    assert "pasted" not in unid["destination"].lower()

    # 2. JPEG photo with Rome GPS EXIF coordinates detects Rome automatically even offline
    rome_jpeg = _build_minimal_jpeg_with_gps(41, 54, 12, 29)
    rome_b64 = "data:image/jpeg;base64," + base64.b64encode(rome_jpeg).decode()
    gps_resp = client.post(
        "/api/v1/vision-trip/decompose-screenshot",
        json={"scene_type": "SANTORINI_CLIFFSIDE", "image_base64": rome_b64, "file_name": "IMG_4022.jpg"},
    )
    assert gps_resp.status_code == 200
    gps_data = gps_resp.json()
    assert gps_data["destination"] == "Rome"
    assert gps_data["detection_source"] == "exif_gps"
    assert gps_data["needs_visual_hint"] is False

    # 3. Opaque external URL without city keywords fetches image bytes & sends them to Gemini Vision
    captured_parts = {}

    class _FakeModels:
        def generate_content(self, *, model, contents, config=None):
            captured_parts["contents"] = contents
            return SimpleNamespace(
                text=json.dumps({
                    "recognized": True,
                    "confidence": 0.96,
                    "destination": "Amsterdam",
                    "destination_label_he": "אמסטרדם — תעלות יורדאן",
                    "landmark_detected_he": "תעלות אמסטרדם ובתים היסטוריים צרים",
                    "country": "הולנד",
                    "iata_code": "AMS",
                    "vibe_title": "אמסטרדם הקלאסית מול התעלות",
                })
            )

    class _FakeClient:
        def __init__(self, api_key=None):
            self.models = _FakeModels()

    monkeypatch.setenv("ALLOW_PYTEST_GEMINI_VISION", "1")
    monkeypatch.setenv("ALLOW_PYTEST_IMAGE_FETCH", "1")
    monkeypatch.setattr(vision_trip_tools.settings, "GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setattr(
        vision_trip_tools,
        "fetch_image_from_url",
        lambda url: (b"\x89PNG\r\n\x1a\n" + b"0" * 64, "image/png", None),
    )
    import google.genai as real_genai
    monkeypatch.setattr(real_genai, "Client", _FakeClient)
    vision_trip_tools._VISION_CACHE.clear()

    opaque_url = "https://cdn.example.com/uploads/img_9948271.png"
    ai_resp = client.post(
        "/api/v1/vision-trip/decompose-screenshot",
        json={"scene_type": "SANTORINI_CLIFFSIDE", "image_source_url": opaque_url},
    )
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()
    assert ai_data["destination"] == "Amsterdam"
    assert ai_data["detection_source"] == "gemini_vision"
    assert ai_data["landmark_detected_he"] == "תעלות אמסטרדם ובתים היסטוריים צרים"
    assert ai_data["iata_code"] == "AMS"
    assert len(captured_parts["contents"]) >= 2
    assert vision_image_utils.clean_upload_filename_hint("WhatsApp Image 2026-11-16 at 10.12.00.jpeg") is None
