"""
Stateful Traveler Memory, Passport Validity Checker & Personal Document-RAG (`travel_memory_agent`).
"""
import json
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from app.db.database import get_db_session
from app.db.models import TravelerProfileModel
from app.rag.retriever import get_knowledge_base


def load_traveler_memory(user_id: Optional[str]) -> Dict[str, Any]:
    """Load persisted traveler preferences from DB, or return sensible defaults."""
    default_profile = {
        "user_id": user_id or "guest_user",
        "kosher_level": "none",
        "shabbat_observant": False,
        "accessibility_mode": False,
        "passport_expiry": None,
        "home_airport": "TLV",
        "preferred_currency": "ILS",
        "preferred_pace": "balanced",
        "loyalty_programs": [],
        "preferences": {},
    }
    if not user_id or user_id == "guest_user":
        return default_profile
    try:
        with get_db_session() as db:
            row = db.query(TravelerProfileModel).filter(TravelerProfileModel.user_id == str(user_id)).first()
            if not row:
                return default_profile
            return {
                "user_id": row.user_id,
                "kosher_level": row.kosher_level,
                "shabbat_observant": bool(row.shabbat_observant),
                "accessibility_mode": bool(row.accessibility_mode),
                "passport_expiry": row.passport_expiry,
                "home_airport": row.home_airport,
                "preferred_currency": row.preferred_currency,
                "preferred_pace": row.preferred_pace,
                "loyalty_programs": json.loads(row.loyalty_programs_json or "[]"),
                "preferences": json.loads(row.preferences_json or "{}"),
            }
    except Exception:
        return default_profile


def update_traveler_memory(user_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    """Upsert traveler preferences in TravelerProfileModel."""
    with get_db_session() as db:
        row = db.query(TravelerProfileModel).filter(TravelerProfileModel.user_id == str(user_id)).first()
        if not row:
            row = TravelerProfileModel(user_id=str(user_id))
            db.add(row)
        if "kosher_level" in patch and patch["kosher_level"] is not None:
            row.kosher_level = str(patch["kosher_level"])
        if "shabbat_observant" in patch and patch["shabbat_observant"] is not None:
            row.shabbat_observant = bool(patch["shabbat_observant"])
        if "accessibility_mode" in patch and patch["accessibility_mode"] is not None:
            row.accessibility_mode = bool(patch["accessibility_mode"])
        if "passport_expiry" in patch:
            row.passport_expiry = patch["passport_expiry"]
        if "home_airport" in patch and patch["home_airport"]:
            row.home_airport = str(patch["home_airport"]).upper()
        if "preferred_currency" in patch and patch["preferred_currency"]:
            row.preferred_currency = str(patch["preferred_currency"]).upper()
        if "preferred_pace" in patch and patch["preferred_pace"]:
            row.preferred_pace = str(patch["preferred_pace"])
        if "loyalty_programs" in patch and patch["loyalty_programs"] is not None:
            row.loyalty_programs_json = json.dumps(patch["loyalty_programs"], ensure_ascii=False)
        if "preferences" in patch and patch["preferences"] is not None:
            row.preferences_json = json.dumps(patch["preferences"], ensure_ascii=False)
        db.commit()
    return load_traveler_memory(user_id)


def check_passport_validity_window(
    passport_expiry: Optional[str],
    start_date: str,
    duration_days: int,
    destination: str,
) -> Dict[str, Any]:
    """Validate whether passport satisfies 6-month (or 3-month Schengen) rule past return date."""
    if not passport_expiry:
        return {
            "checked": False,
            "status": "UNKNOWN",
            "message": "לא הוזן תאריך תפוגה לדרכון בפרופיל — מומלץ לוודא תוקף של 6 חודשים מעבר לתאריך החזרה.",
        }
    try:
        exp_dt = datetime.strptime(passport_expiry.strip(), "%Y-%m-%d").date()
        ret_dt = datetime.strptime(start_date.strip(), "%Y-%m-%d").date() + timedelta(days=duration_days)
        days_after_return = (exp_dt - ret_dt).days
        required_days = 180
        dest_lower = destination.lower()
        if any(k in dest_lower for k in ("rome", "paris", "barcelona", "athens", "zurich", "italy", "france", "spain", "greece")):
            required_days = 90
        if days_after_return < required_days:
            return {
                "checked": True,
                "status": "WARNING",
                "days_after_return": days_after_return,
                "required_days": required_days,
                "message": (
                    f"אזהרת דרכון: תוקף הדרכון ({exp_dt.strftime('%d/%m/%Y')}) קצר מ-{required_days} יום "
                    f"לאחר מועד החזרה ({ret_dt.strftime('%d/%m/%Y')}). יש לחדש דרכון בדחיפות!"
                ),
            }
        return {
            "checked": True,
            "status": "VALID",
            "days_after_return": days_after_return,
            "required_days": required_days,
            "message": f"תוקף הדרכון תקין ({days_after_return} ימים מעבר לתאריך החזרה).",
        }
    except Exception:
        return {
            "checked": False,
            "status": "INVALID_FORMAT",
            "message": "פורמט תאריך תוקף דרכון לא תקין (נדרש YYYY-MM-DD).",
        }


def ingest_user_travel_document(
    user_id: str,
    title: str,
    content: str,
    destination: str = "Global",
    doc_type: str = "personal_note",
) -> Dict[str, Any]:
    """Ingest a user-scoped document into the RAG VectorStore."""
    kb = get_knowledge_base()
    return kb.ingest_personal_document(
        user_id=user_id,
        title=title,
        content=content,
        destination=destination,
        doc_type=doc_type,
    )
