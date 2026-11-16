"""
Sidekick TravelOps Pulse Autopilot (`travel_pulse_autopilot_agent`) &
Bundle Deal Negotiator (`bundle_deal_negotiator_agent`).
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.database import get_db_session
from app.db.models import PulseActionExecutionModel

PULSE_ACTIONS_CATALOG: List[Dict[str, Any]] = [
    {
        "action_id": "pulse_fx_lock_ils",
        "skill_name": "fx_rate_shield",
        "severity": "OPPORTUNITY",
        "title_he": "שער האירו/דולר נסוג ב-1.4% — נעל תשלום בשקלים",
        "summary_he": "סוכן ה-FX זיהה חלון הזדמנות לנעילת עלות מלונות באירופה ללא עמלת המרה.",
        "cta_label_he": "נעל שער חליפין כעת",
        "estimated_savings_ils": 340.0,
    },
    {
        "action_id": "pulse_price_guard_sweep",
        "skill_name": "price_drop_sweep",
        "severity": "ACTION_REQUIRED",
        "title_he": "סריקת Price Guard יזומה להזמנות TLV פתוחות",
        "summary_he": "מחיר הטיסות והמלונות ברומא וסנטוריני ירד ב-8% השבוע — הפעל זיכוי ארנק מיידי.",
        "cta_label_he": "סרוק וזכה ארנק",
        "estimated_savings_ils": 420.0,
    },
    {
        "action_id": "pulse_shabbat_bundle_opt",
        "skill_name": "shabbat_bundle_optimizer",
        "severity": "PROACTIVE_TIP",
        "title_he": "שדרוג חבילת שבת + העברת VIP במרכז העיר",
        "summary_he": "זמינות מלונות סמוכי חב\"ד עם צ'ק-אאוט מוצ\"ש ירדה מתחת ל-15%.",
        "cta_label_he": "שריין חבילה חכמה",
        "estimated_savings_ils": 260.0,
    },
]


def get_proactive_pulse_actions() -> Dict[str, Any]:
    with get_db_session() as db:
        executed_rows = (
            db.query(PulseActionExecutionModel)
            .order_by(PulseActionExecutionModel.created_at.desc())
            .limit(10)
            .all()
        )
        executed_ids = {r.action_id for r in executed_rows}
        cards = [
            {
                **card,
                "executed": card["action_id"] in executed_ids,
            }
            for card in PULSE_ACTIONS_CATALOG
        ]
        return {
            "status": "LIVE",
            "cards": cards,
            "recent_executions": [
                {
                    "execution_id": r.execution_id,
                    "action_id": r.action_id,
                    "skill_name": r.skill_name,
                    "outcome_summary_he": r.outcome_summary_he,
                    "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in executed_rows
            ],
        }


def execute_pulse_action(action_id: str, user_id: str = "usr_demo123", context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    card = next((c for c in PULSE_ACTIONS_CATALOG if c["action_id"] == action_id), None)
    if not card:
        card = {
            "action_id": action_id,
            "skill_name": "custom_pulse_skill",
            "title_he": "אוטומציית TravelOps מותאמת",
            "estimated_savings_ils": 180.0,
        }

    execution_id = f"px_{uuid.uuid4().hex[:10]}"
    summary = (
        f"הופעל '{card['title_he']}' (חיסכון מוערך: ₪{card['estimated_savings_ils']:,.0f})."
    )
    with get_db_session() as db:
        db.add(
            PulseActionExecutionModel(
                execution_id=execution_id,
                action_id=action_id,
                user_id=user_id,
                skill_name=card["skill_name"],
                outcome_summary_he=summary,
                status="EXECUTED",
            )
        )
        db.commit()

    return {
        "execution_id": execution_id,
        "action_id": action_id,
        "skill_name": card["skill_name"],
        "status": "EXECUTED",
        "estimated_savings_ils": card["estimated_savings_ils"],
        "outcome_summary_he": summary,
        "executed_at": datetime.now(timezone.utc).isoformat(),
    }


def negotiate_travel_bundle(
    *,
    destination: str,
    base_total_ils: float,
    travelers: int = 2,
    components: Optional[List[str]] = None,
    loyalty_tier: str = "PLATINUM",
    target_discount_pct: float = 12.0,
) -> Dict[str, Any]:
    comps = components or ["FLIGHT", "BOUTIQUE_HOTEL", "TRANSFER_ESIM"]
    tier_bonus = {"STANDARD": 2.0, "GOLD": 4.0, "PLATINUM": 6.0}.get((loyalty_tier or "PLATINUM").upper(), 4.0)
    multi_component_bonus = min(8.0, len(comps) * 2.5)
    approved_pct = round(min(float(target_discount_pct), tier_bonus + multi_component_bonus, 18.0), 1)
    savings_ils = round(float(base_total_ils) * (approved_pct / 100.0), 2)
    final_total_ils = round(float(base_total_ils) - savings_ils, 2)

    return {
        "status": "OFFER_ACCEPTED" if approved_pct >= float(target_discount_pct) else "COUNTER_OFFER",
        "destination": destination,
        "travelers": travelers,
        "components": comps,
        "loyalty_tier": loyalty_tier.upper(),
        "requested_discount_pct": round(float(target_discount_pct), 1),
        "approved_discount_pct": approved_pct,
        "base_total_ils": round(float(base_total_ils), 2),
        "savings_ils": savings_ils,
        "final_total_ils": final_total_ils,
        "perks_included_he": [
            "הגנת ירידת מחיר אוטומטית ל-30 יום (₪)",
            "העברת VIP משדה התעופה + eSIM 10GB",
            "גמישות שינוי תאריכים עד 72 שעות לפני ההמראה",
        ],
        "rationale_he": (
            f"סוכן המו\"מ השיג הנחת באנדל של {approved_pct}% "
            f"(חיסכון של ₪{savings_ils:,.0f}) עבור {len(comps)} רכיבים ב{destination}."
        ),
    }
