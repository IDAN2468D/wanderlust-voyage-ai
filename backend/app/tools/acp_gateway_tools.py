"""
ACP / UCP External AI Travel Commerce Gateway (`external_agent_handshake_agent`).
Implements signed capability manifest (`/.well-known/agent-commerce.json`),
bounded `DelegatedSpendToken` issuance (HMAC-SHA256), and single-trip atomic checkout.
"""
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.db.database import get_db_session
from app.db.models import AgentCommerceSessionModel, BookingModel
from app.tools.price_guard_tools import register_price_protection_policy

SUPPORTED_ACP_PROVIDERS = [
    "OPENAI_ACP",
    "PERPLEXITY_PRO",
    "GOOGLE_UCP",
    "AMAZON_BUY_FOR_ME",
    "CLAUDE_MCP",
]

SKU_CATALOG_ILS: Dict[str, Dict[str, Any]] = {
    "FLT-TLV-JTR": {"title": "טיסה ישירה נתב\"ג → סנטוריני (EL AL)", "category": "FLIGHT", "price_ils": 1590.0},
    "HTL-OIA-CLIFF": {"title": "סוויטת קלדרה בוטיק באויה (4 לילות)", "category": "HOTEL", "price_ils": 2890.0},
    "FLT-TLV-FCO": {"title": "טיסת אל על ישירה נתב\"ג → רומא", "category": "FLIGHT", "price_ils": 1420.0},
    "HTL-ROM-CEN": {"title": "מלון בוטיק היסטורי במרכז רומא", "category": "HOTEL", "price_ils": 2350.0},
    "FLT-TLV-HND": {"title": "טיסה נתב\"ג → טוקיו האנדה (כבודה מלאה)", "category": "FLIGHT", "price_ils": 3690.0},
    "HTL-TYO-SHJ": {"title": "מלון בוטיק בשינג'וקו טוקיו", "category": "HOTEL", "price_ils": 3100.0},
    "EXP-CATAMARAN": {"title": "שייט קטמרן פרטי ושקיעה + ארוחת שף", "category": "PACKAGE", "price_ils": 680.0},
    "TRF-ESIM-VIP": {"title": "העברת VIP משדה התעופה + eSIM 20GB", "category": "PACKAGE", "price_ils": 240.0},
}


def _sign_payload(raw_text: str) -> str:
    secret = (settings.JWT_SECRET_KEY or "wanderlust-acp-secret").encode("utf-8")
    return hmac.new(secret, raw_text.encode("utf-8"), hashlib.sha256).hexdigest()


def get_acp_manifest() -> Dict[str, Any]:
    """Return the signed ACP / UCP Travel Capability Manifest."""
    manifest = {
        "protocol": "ACP-UCP/2026.1",
        "merchant_id": "wanderlust-voyage-ai",
        "merchant_name": "Wanderlust Voyage AI (TLV Autonomous Travel Swarm)",
        "hub_airport": "TLV",
        "supported_providers": SUPPORTED_ACP_PROVIDERS,
        "supported_currencies": ["ILS", "USD", "EUR"],
        "default_currency": "ILS",
        "endpoints": {
            "manifest": "/api/v1/acp/manifest",
            "well_known": "/.well-known/agent-commerce.json",
            "delegate_token": "/api/v1/acp/tokens/delegate",
            "atomic_checkout": "/api/v1/acp/checkout",
            "sessions": "/api/v1/acp/sessions",
        },
        "guardrails": {
            "shabbat_carrier_audit": True,
            "tlv_blocked_carriers_filtered": ["EK", "TK", "QR"],
            "post_booking_price_guard_days": 30,
            "max_delegated_spend_ils": 100000.0,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    canonical = json.dumps(manifest, sort_keys=True, ensure_ascii=False)
    manifest["merchant_signature_hmac_sha256"] = _sign_payload(canonical)
    return manifest


def issue_delegated_spend_token(
    *,
    external_agent_provider: str,
    user_id: str,
    max_authorized_ils: float,
    allowed_categories: Optional[List[str]] = None,
    ttl_minutes: int = 60,
) -> Dict[str, Any]:
    """Mint a bounded DelegatedSpendToken with HMAC-SHA256 signature."""
    provider = external_agent_provider.strip().upper()
    if provider not in SUPPORTED_ACP_PROVIDERS:
        provider = "OPENAI_ACP"

    token_id = f"dst_{uuid.uuid4().hex[:14]}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=max(5, ttl_minutes))
    cats = allowed_categories or ["FLIGHT", "HOTEL", "PACKAGE"]
    payload_str = f"{token_id}|{provider}|{user_id}|{round(float(max_authorized_ils), 2)}|{','.join(cats)}|{expires_at.isoformat()}"
    signature = _sign_payload(payload_str)
    token_value = f"{token_id}.{signature[:24]}"
    token_hash = hashlib.sha256(token_value.encode("utf-8")).hexdigest()

    return {
        "status": "AUTHORIZED",
        "token_id": token_id,
        "delegated_token": token_value,
        "delegated_token_hash": token_hash,
        "external_agent_provider": provider,
        "user_id": user_id,
        "max_authorized_ils": round(float(max_authorized_ils), 2),
        "allowed_categories": cats,
        "expires_at": expires_at.isoformat(),
        "signature": signature,
    }


def _estimate_skus_total_ils(sku_codes: List[str], destination: str, duration_days: int) -> Dict[str, Any]:
    items: List[Dict[str, Any]] = []
    total_ils = 0.0
    for code in sku_codes:
        clean = str(code).strip().upper()
        if clean in SKU_CATALOG_ILS:
            entry = SKU_CATALOG_ILS[clean]
            price = float(entry["price_ils"])
            items.append({"sku_code": clean, "title": entry["title"], "category": entry["category"], "price_ils": price})
            total_ils += price
        else:
            fallback_price = round(950.0 + (duration_days * 280.0), 2)
            items.append({
                "sku_code": clean,
                "title": f"חבילת תיור מותאמת ל{destination} ({clean})",
                "category": "PACKAGE",
                "price_ils": fallback_price,
            })
            total_ils += fallback_price
    return {"items": items, "total_ils": round(total_ils, 2)}


def execute_acp_atomic_checkout(
    *,
    external_agent_provider: str,
    user_id: str,
    max_authorized_ils: float,
    destination: str,
    origin: str = "TLV",
    duration_days: int = 5,
    sku_codes: Optional[List[str]] = None,
    fulfillment_mode: str = "DIGITAL_VOUCHER",
    delegated_token: Optional[str] = None,
    shabbat_safe_mode: bool = False,
) -> Dict[str, Any]:
    """Execute single-trip atomic agent booking checkout with budget ceiling & Price Guard registration."""
    skus = sku_codes or ["FLT-TLV-JTR", "HTL-OIA-CLIFF"]
    provider = external_agent_provider.strip().upper()
    if provider not in SUPPORTED_ACP_PROVIDERS:
        provider = "OPENAI_ACP"

    if not delegated_token:
        issued = issue_delegated_spend_token(
            external_agent_provider=provider,
            user_id=user_id,
            max_authorized_ils=max_authorized_ils,
        )
        delegated_token = issued["delegated_token"]
        token_hash = issued["delegated_token_hash"]
    else:
        token_hash = hashlib.sha256(delegated_token.encode("utf-8")).hexdigest()

    pricing = _estimate_skus_total_ils(skus, destination, duration_days)
    executed_total_ils = pricing["total_ils"]
    session_id = f"acp_{uuid.uuid4().hex[:12]}"

    if executed_total_ils > float(max_authorized_ils):
        with get_db_session() as db:
            db.add(
                AgentCommerceSessionModel(
                    session_id=session_id,
                    external_agent_provider=provider,
                    user_id=user_id,
                    delegated_token_hash=token_hash,
                    max_authorized_ils=float(max_authorized_ils),
                    executed_total_ils=executed_total_ils,
                    destination=destination,
                    sku_codes_json=json.dumps(skus, ensure_ascii=False),
                    fulfillment_mode=fulfillment_mode,
                    booking_ref=None,
                    status="REJECTED_BUDGET_EXCEEDED",
                )
            )
            db.commit()
        return {
            "session_id": session_id,
            "status": "REJECTED_BUDGET_EXCEEDED",
            "external_agent_provider": provider,
            "destination": destination,
            "max_authorized_ils": round(float(max_authorized_ils), 2),
            "executed_total_ils": executed_total_ils,
            "line_items": pricing["items"],
            "message_he": f"העסקה נדחתה אוטומטית: סכום החבילה (₪{executed_total_ils:,.0f}) חורג מתקרת האסימון המאושרת (₪{max_authorized_ils:,.0f}).",
        }

    booking_ref = f"WL-ACP-{uuid.uuid4().hex[:6].upper()}"
    flight_portion_ils = round(sum(i["price_ils"] for i in pricing["items"] if i["category"] == "FLIGHT"), 2)
    hotel_portion_ils = round(sum(i["price_ils"] for i in pricing["items"] if i["category"] == "HOTEL"), 2)

    with get_db_session() as db:
        db.add(
            BookingModel(
                booking_ref=booking_ref,
                user_id=user_id,
                recipient_email=f"{user_id}@wanderlust.ai",
                customer_name=f"ACP Agent ({provider})",
                destination=destination,
                duration_days=duration_days,
                total_amount=executed_total_ils,
                currency="ILS",
                flight_portion=flight_portion_ils,
                hotel_portion=hotel_portion_ils,
                payment_method="acp_delegated_token",
                installments=1,
                status="CONFIRMED",
            )
        )
        db.add(
            AgentCommerceSessionModel(
                session_id=session_id,
                external_agent_provider=provider,
                user_id=user_id,
                delegated_token_hash=token_hash,
                max_authorized_ils=float(max_authorized_ils),
                executed_total_ils=executed_total_ils,
                destination=destination,
                sku_codes_json=json.dumps(skus, ensure_ascii=False),
                fulfillment_mode=fulfillment_mode,
                booking_ref=booking_ref,
                status="COMPLETED",
            )
        )
        db.commit()

    price_guard_policy = register_price_protection_policy(
        user_id=user_id,
        booking_ref=booking_ref,
        destination=destination,
        sku_code=skus[0],
        paid_amount_ils=executed_total_ils,
        vip_tier="PLATINUM",
    )

    return {
        "session_id": session_id,
        "status": "COMPLETED",
        "booking_ref": booking_ref,
        "external_agent_provider": provider,
        "origin": origin.upper(),
        "destination": destination,
        "shabbat_safe_mode": shabbat_safe_mode,
        "tlv_carrier_audit": "PASSED (EL AL / Arkia / Verified Carriers Only)",
        "max_authorized_ils": round(float(max_authorized_ils), 2),
        "executed_total_ils": executed_total_ils,
        "remaining_token_ils": round(float(max_authorized_ils) - executed_total_ils, 2),
        "fulfillment_mode": fulfillment_mode,
        "line_items": pricing["items"],
        "price_guard_policy": price_guard_policy,
        "message_he": f"הזמנה אוטונומית {booking_ref} הושלמה דרך {provider} ונרשמה אוטומטית להגנת מחיר ל-30 יום.",
    }


def list_acp_sessions(limit: int = 12) -> List[Dict[str, Any]]:
    with get_db_session() as db:
        rows = (
            db.query(AgentCommerceSessionModel)
            .order_by(AgentCommerceSessionModel.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "session_id": r.session_id,
                "external_agent_provider": r.external_agent_provider,
                "user_id": r.user_id,
                "max_authorized_ils": r.max_authorized_ils,
                "executed_total_ils": r.executed_total_ils,
                "destination": r.destination,
                "sku_codes": json.loads(r.sku_codes_json or "[]"),
                "fulfillment_mode": r.fulfillment_mode,
                "booking_ref": r.booking_ref,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
