import json
import pytest
from app.tools.transit_tools import get_transit_guide
from app.tools.culinary_tools import get_culinary_guide
from app.tools.shopping_tools import get_shopping_and_tax_free
from app.tools.calendar_tools import generate_trip_calendar_pack
from app.tools.sentinel_tools import get_ground_sentinel_alerts
from app.tools.briefing_tools import generate_whatsapp_daily_briefings
from app.agents.orchestrator import synthesize_deterministic_plan


def test_transit_guide_curated_and_fallback():
    # Curated city
    rome_raw = get_transit_guide("רומא", duration_days=5)
    rome_data = json.loads(rome_raw)
    assert rome_data["destination"] == "רומא"
    assert "Roma" in rome_data["pass_name"] or "ATAC" in rome_data["pass_name"]
    assert rome_data["walking_score"] >= 8
    assert rome_data["total_transit_cost_usd"] > 0

    # Fallback city
    generic_raw = get_transit_guide("Kyoto", duration_days=3)
    generic_data = json.loads(generic_raw)
    assert generic_data["destination"] == "Kyoto"
    assert generic_data["is_curated"] is False
    assert len(generic_data["recommended_apps"]) > 0


def test_culinary_guide_kosher_and_gourmet():
    paris_raw = get_culinary_guide("פריז", dietary_preferences=["כשר"])
    paris_data = json.loads(paris_raw)
    assert paris_data["destination"] == "פריז"
    assert len(paris_data["specialties"]) > 0
    assert len(paris_data["kosher_options"]) > 0
    assert "Marianne" in paris_data["kosher_options"][0]["name"] or "Rosiers" in paris_data["kosher_options"][0]["address"]
    assert len(paris_data["nightlife_spots"]) > 0
    assert len(paris_data["tipping_etiquette"]) > 0


def test_shopping_and_tax_free_calculation():
    italy_raw = get_shopping_and_tax_free("רומא", estimated_shopping_budget_usd=400.0)
    italy_data = json.loads(italy_raw)
    assert italy_data["country"] == "איטליה"
    assert italy_data["vat_rate"] == "22.0%"
    assert italy_data["projected_vat_refund_usd"] > 0
    assert len(italy_data["outlets"]) > 0
    assert "Otello" in italy_data["kiosk_system"]


def test_calendar_pack_generation():
    sample_days = [
        {
            "day_number": 1,
            "title": "יום 1: קולוסיאום",
            "morning": {"activity": "קולוסיאום", "highlight": "סיור היסטורי"},
            "afternoon": {"dining": "טרטוריה", "activity": "פורום"},
            "evening": {"activity": "טרסטוורה"},
            "local_tip": "נעלי הליכה",
        }
    ]
    pack = generate_trip_calendar_pack("רומא", "2026-10-15", 3, structured_days=sample_days)
    assert "calendar.google.com" in pack["google_calendar_url"]
    assert "BEGIN:VCALENDAR" in pack["ical_data"]
    assert "END:VCALENDAR" in pack["ical_data"]
    assert "קולוסיאום" in pack["ical_data"]


def test_ground_sentinel_alerts():
    sentinel_raw = get_ground_sentinel_alerts("לונדון")
    sentinel_data = json.loads(sentinel_raw)
    assert sentinel_data["destination"] == "לונדון"
    assert "strike_risk_index" in sentinel_data
    assert len(sentinel_data["security_advisories"]) > 0
    assert "שגרירות ישראל" in sentinel_data["embassy_emergency_contact"]


def test_whatsapp_daily_briefings():
    sample_days = [
        {
            "day_number": 1,
            "date_formatted": "15/10/2026",
            "title": "יום 1: ברצלונה",
            "morning": {"time": "09:30", "activity": "סגרדה פמיליה", "highlight": "בזיליקה מרשימה"},
            "afternoon": {"time": "13:30", "dining": "סרווסריה קטלאנה", "neighborhood": "מרכז", "signature_dish": "טאפאס"},
            "evening": {"activity": "רובע גותי"},
            "local_tip": "היזהרו מכייסים",
        }
    ]
    briefing_raw = generate_whatsapp_daily_briefings("ברצלונה", 1, sample_days)
    briefing_data = json.loads(briefing_raw)
    assert briefing_data["total_briefings"] == 1
    first_b = briefing_data["briefings"][0]
    assert "סגרדה פמיליה" in first_b["whatsapp_text"]
    assert "api.whatsapp.com" in first_b["whatsapp_share_url"]


def test_full_orchestrator_synthesis():
    plan = synthesize_deterministic_plan(
        origin="TLV",
        destination="רומא",
        start_date="2026-10-15",
        duration_days=4,
        total_budget=2000.0,
        interests=["היסטוריה", "אוכל"],
    )
    assert "transit_guide" in plan
    assert "culinary_guide" in plan
    assert "shopping_taxfree" in plan
    assert "calendar_events" in plan
    assert "ground_alerts" in plan
    assert "whatsapp_briefings" in plan
    assert "תחבורה והתניידות" in plan["markdown_plan"]
    assert "שופינג ופטור ממס" in plan["markdown_plan"]
