"""
Proactive Travel Interests & Fare Radar (`interests_watchdog_agent`).
Inspired by Amazon Interests AI: monitors natural-language Hebrew/English wishes
against semantic VectorStore guides + TLV flight/hotel deals with VIP 15-min Auto-Reserve.
"""
import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.db.database import get_db_session
from app.db.models import InterestWatcherModel
from app.rag.retriever import get_knowledge_base

PROACTIVE_DEAL_CATALOG: List[Dict[str, Any]] = [
    {
        "sku_code": "DEAL-TLV-TYO-OCT",
        "title": "טוקיו ישיר/עצירה קצרה + מלון בוטיק בשינג'וקו (מזוודה כלולה)",
        "destination": "Tokyo",
        "category": "FLIGHTS",
        "current_price_ils": 3290.0,
        "shabbat_compliant": True,
        "tags": ["טוקיו", "tokyo", "יפן", "ישיר", "טיסות", "מזוודה", "אוקטובר", "tlv"],
    },
    {
        "sku_code": "DEAL-TLV-JTR-CLIFF",
        "title": "סנטוריני אויה — טיסת אל על + סוויטת צוק עם בריכה פרטית",
        "destination": "Santorini",
        "category": "PACKAGES",
        "current_price_ils": 3890.0,
        "shabbat_compliant": True,
        "tags": ["סנטוריני", "santorini", "יוון", "וילה", "בריכה", "זוגי", "קיץ", "יוקרה"],
    },
    {
        "sku_code": "DEAL-TLV-ZRH-ALP",
        "title": "האלפים השוויצריים — ציריך + צרמט + Swiss Travel Pass",
        "destination": "Swiss Alps",
        "category": "PACKAGES",
        "current_price_ils": 4650.0,
        "shabbat_compliant": True,
        "tags": ["שוויץ", "אלפים", "רכבות", "טבע", "משפחה", "swiss", "alps"],
    },
    {
        "sku_code": "DEAL-TLV-FCO-KOSHER",
        "title": "רומא סופ\"ש שומר שבת וכשר — טיסה + מלון ליד הגטו היהודי",
        "destination": "Rome",
        "category": "SHABBAT_FRIENDLY",
        "current_price_ils": 2480.0,
        "shabbat_compliant": True,
        "tags": ["רומא", "rome", "כשר", "שבת", "סוף שבוע", "איטליה", "קולינריה"],
    },
    {
        "sku_code": "DEAL-TLV-DPS-VILLA",
        "title": "באלי אובוד — וילת ג'ונגל פרטית + ספא באלינזי (7 לילות)",
        "destination": "Bali",
        "category": "LUXURY",
        "current_price_ils": 4190.0,
        "shabbat_compliant": False,
        "tags": ["באלי", "bali", "וילה", "ספא", "ירח דבש", "ג'ונגל", "יוקרה"],
    },
]


def _extract_keywords(prompt: str) -> List[str]:
    tokens = re.findall(r"[A-Za-z0-9\u0590-\u05FF\"']{2,}", prompt.lower())
    stop = {"עם", "של", "על", "מתחת", "ל", "ב", "או", "את", "the", "and", "under", "for", "with"}
    seen: List[str] = []
    for tok in tokens:
        if tok not in stop and tok not in seen:
            seen.append(tok)
    return seen[:12]


def _score_deals_for_watcher(
    *,
    prompt_text: str,
    keywords: List[str],
    target_category: str,
    max_price_ils: float,
    auto_reserve_vip: bool,
) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = []
    prompt_lower = prompt_text.lower()
    cat_upper = (target_category or "ALL").upper()

    # Optional RAG grounding boost
    rag_destinations: set[str] = set()
    try:
        kb = get_knowledge_base()
        rag_hits = kb.search(query=prompt_text, top_k=3)
        for h in rag_hits:
            if h.get("destination"):
                rag_destinations.add(str(h["destination"]).lower())
    except Exception:
        pass

    for deal in PROACTIVE_DEAL_CATALOG:
        price = float(deal["current_price_ils"])
        if price > float(max_price_ils) * 1.12:
            continue

        score = 0.52
        if cat_upper == "ALL" or deal["category"] == cat_upper:
            score += 0.14
        tag_hits = sum(1 for tag in deal["tags"] if tag in prompt_lower or any(tag in kw or kw in tag for kw in keywords))
        score += min(0.28, tag_hits * 0.10)
        if deal["destination"].lower() in rag_destinations:
            score += 0.08
        if price <= float(max_price_ils):
            score += 0.07

        score = round(min(0.99, score), 2)
        if score >= 0.72:
            hold_until = (
                (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
                if (auto_reserve_vip and price <= float(max_price_ils) and score >= 0.80)
                else None
            )
            alerts.append({
                "sku_code": deal["sku_code"],
                "title": deal["title"],
                "destination": deal["destination"],
                "current_price_ils": price,
                "semantic_match_score": score,
                "auto_reserved_vip_until": hold_until,
                "match_reason_he": (
                    f"התאמה סמנטית של {int(score * 100)}% לתקציב ₪{max_price_ils:,.0f}"
                    + (" • שוריין אוטומטית ל-15 דק' (VIP)" if hold_until else "")
                ),
                "matched_at": datetime.now(timezone.utc).isoformat(),
            })

    alerts.sort(key=lambda x: x["semantic_match_score"], reverse=True)
    return alerts[:3]


def _serialize_watcher(row: InterestWatcherModel) -> Dict[str, Any]:
    return {
        "interest_id": row.interest_id,
        "user_id": row.user_id,
        "raw_prompt_hebrew": row.raw_prompt_hebrew,
        "extracted_keywords": json.loads(row.extracted_keywords_json or "[]"),
        "target_category": row.target_category,
        "max_price_ils": row.max_price_ils,
        "auto_reserve_vip": bool(row.auto_reserve_vip),
        "matched_alerts": json.loads(row.matched_alerts_json or "[]"),
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "last_evaluated_at": row.last_evaluated_at.isoformat() if row.last_evaluated_at else None,
    }


def create_interest_watcher(
    *,
    user_id: str,
    raw_prompt_hebrew: str,
    target_category: str = "ALL",
    max_price_ils: float = 4500.0,
    auto_reserve_vip: bool = False,
) -> Dict[str, Any]:
    interest_id = f"int_{uuid.uuid4().hex[:10]}"
    keywords = _extract_keywords(raw_prompt_hebrew)
    alerts = _score_deals_for_watcher(
        prompt_text=raw_prompt_hebrew,
        keywords=keywords,
        target_category=target_category,
        max_price_ils=max_price_ils,
        auto_reserve_vip=auto_reserve_vip,
    )
    now = datetime.now(timezone.utc)
    status = "VIP_HOLD_ACTIVE" if any(a.get("auto_reserved_vip_until") for a in alerts) else "ACTIVE"

    with get_db_session() as db:
        row = InterestWatcherModel(
            interest_id=interest_id,
            user_id=user_id,
            raw_prompt_hebrew=raw_prompt_hebrew.strip(),
            extracted_keywords_json=json.dumps(keywords, ensure_ascii=False),
            target_category=target_category.upper(),
            max_price_ils=float(max_price_ils),
            auto_reserve_vip=bool(auto_reserve_vip),
            matched_alerts_json=json.dumps(alerts, ensure_ascii=False),
            status=status,
            created_at=now,
            last_evaluated_at=now,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return _serialize_watcher(row)


def list_interest_watchers(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_db_session() as db:
        q = db.query(InterestWatcherModel)
        if user_id:
            q = q.filter(InterestWatcherModel.user_id == user_id)
        rows = q.order_by(InterestWatcherModel.created_at.desc()).limit(30).all()
        return [_serialize_watcher(r) for r in rows]


def evaluate_interest_watcher(interest_id: str) -> Optional[Dict[str, Any]]:
    with get_db_session() as db:
        row = db.query(InterestWatcherModel).filter(InterestWatcherModel.interest_id == interest_id).first()
        if not row:
            return None
        keywords = json.loads(row.extracted_keywords_json or "[]")
        alerts = _score_deals_for_watcher(
            prompt_text=row.raw_prompt_hebrew,
            keywords=keywords,
            target_category=row.target_category,
            max_price_ils=row.max_price_ils,
            auto_reserve_vip=bool(row.auto_reserve_vip),
        )
        row.matched_alerts_json = json.dumps(alerts, ensure_ascii=False)
        row.last_evaluated_at = datetime.now(timezone.utc)
        row.status = "VIP_HOLD_ACTIVE" if any(a.get("auto_reserved_vip_until") for a in alerts) else "ACTIVE"
        db.commit()
        db.refresh(row)
        return _serialize_watcher(row)


def delete_interest_watcher(interest_id: str) -> bool:
    with get_db_session() as db:
        row = db.query(InterestWatcherModel).filter(InterestWatcherModel.interest_id == interest_id).first()
        if not row:
            return False
        db.delete(row)
        db.commit()
        return True
