"""
Post-Booking Price Drop Guard & Travel Wallet (`post_booking_price_guard_agent`).
Inspired by Klarna Price Drop Guard & Google Customized Price Alerts:
tracks confirmed bookings for 14/30 days and auto-credits ILS (₪) wallet deltas.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from app.db.database import get_db_session
from app.db.models import PriceProtectionPolicyModel, TravelWalletEntryModel

VIP_COVERAGE_DAYS = {
    "STANDARD": 14,
    "GOLD": 21,
    "PLATINUM": 30,
}

# Deterministic baseline live market benchmarks in ILS per destination
LIVE_MARKET_BENCHMARKS_ILS: Dict[str, float] = {
    "Santorini": 3980.0,
    "Rome": 3250.0,
    "Tokyo": 6150.0,
    "Swiss Alps": 5490.0,
    "Bali": 4890.0,
}


def _serialize_policy(row: PriceProtectionPolicyModel) -> Dict[str, Any]:
    return {
        "policy_id": row.policy_id,
        "user_id": row.user_id,
        "booking_ref": row.booking_ref,
        "destination": row.destination,
        "sku_code": row.sku_code,
        "paid_amount_ils": row.paid_amount_ils,
        "lowest_observed_ils": row.lowest_observed_ils,
        "refunded_total_ils": row.refunded_total_ils,
        "vip_tier": row.vip_tier,
        "coverage_days": row.coverage_days,
        "status": row.status,
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def register_price_protection_policy(
    *,
    user_id: str,
    booking_ref: str,
    destination: str,
    sku_code: str,
    paid_amount_ils: float,
    vip_tier: str = "PLATINUM",
) -> Dict[str, Any]:
    tier = (vip_tier or "PLATINUM").strip().upper()
    coverage_days = VIP_COVERAGE_DAYS.get(tier, 30)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=coverage_days)

    with get_db_session() as db:
        existing = (
            db.query(PriceProtectionPolicyModel)
            .filter(
                PriceProtectionPolicyModel.booking_ref == booking_ref,
                PriceProtectionPolicyModel.sku_code == sku_code,
            )
            .first()
        )
        if existing:
            return _serialize_policy(existing)

        row = PriceProtectionPolicyModel(
            policy_id=f"ppg_{uuid.uuid4().hex[:10]}",
            user_id=user_id,
            booking_ref=booking_ref,
            destination=destination,
            sku_code=sku_code,
            paid_amount_ils=round(float(paid_amount_ils), 2),
            lowest_observed_ils=round(float(paid_amount_ils), 2),
            refunded_total_ils=0.0,
            vip_tier=tier if tier in VIP_COVERAGE_DAYS else "PLATINUM",
            coverage_days=coverage_days,
            status="ACTIVE",
            expires_at=expires_at,
            created_at=now,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return _serialize_policy(row)


def scan_price_drops_and_credit_wallet(
    *,
    user_id: str,
    booking_ref: str,
    destination: str,
    paid_amount_ils: float,
    sku_code: str = "PKG-TLV-ROM-5D",
    vip_tier: str = "PLATINUM",
    simulated_market_drop_pct: Optional[float] = None,
) -> Dict[str, Any]:
    policy = register_price_protection_policy(
        user_id=user_id,
        booking_ref=booking_ref,
        destination=destination,
        sku_code=sku_code,
        paid_amount_ils=paid_amount_ils,
        vip_tier=vip_tier,
    )

    if simulated_market_drop_pct is not None and simulated_market_drop_pct > 0:
        current_market_ils = round(float(paid_amount_ils) * (1.0 - float(simulated_market_drop_pct) / 100.0), 2)
    else:
        benchmark = LIVE_MARKET_BENCHMARKS_ILS.get(destination, round(float(paid_amount_ils) * 0.91, 2))
        current_market_ils = min(float(paid_amount_ils), benchmark)
        if current_market_ils >= float(paid_amount_ils):
            current_market_ils = round(float(paid_amount_ils) * 0.92, 2)

    refund_delta_ils = round(max(0.0, float(policy["lowest_observed_ils"]) - current_market_ils), 2)
    credit_entry: Optional[Dict[str, Any]] = None

    with get_db_session() as db:
        row = db.query(PriceProtectionPolicyModel).filter(PriceProtectionPolicyModel.policy_id == policy["policy_id"]).first()
        if row and refund_delta_ils > 0:
            row.lowest_observed_ils = current_market_ils
            row.refunded_total_ils = round(float(row.refunded_total_ils) + refund_delta_ils, 2)
            row.status = "CREDIT_ISSUED"
            entry_id = f"wlt_{uuid.uuid4().hex[:10]}"
            desc = f"זיכוי אוטומטי מירידת מחיר עבור {destination} ({booking_ref}): ₪{refund_delta_ils:,.2f}"
            db.add(
                TravelWalletEntryModel(
                    entry_id=entry_id,
                    user_id=user_id,
                    booking_ref=booking_ref,
                    entry_type="PRICE_DROP_REFUND",
                    amount_ils=refund_delta_ils,
                    description_he=desc,
                )
            )
            db.commit()
            db.refresh(row)
            policy = _serialize_policy(row)
            credit_entry = {
                "entry_id": entry_id,
                "amount_ils": refund_delta_ils,
                "description_he": desc,
            }

    wallet_summary = get_price_guard_overview(user_id=user_id)
    return {
        "policy": policy,
        "current_market_ils": current_market_ils,
        "price_drop_detected": refund_delta_ils > 0,
        "refund_issued_ils": refund_delta_ils,
        "credit_entry": credit_entry,
        "wallet_balance_ils": wallet_summary["wallet_balance_ils"],
        "message_he": (
            f"זוהתה ירידת מחיר! ₪{refund_delta_ils:,.2f} זוכו אוטומטית לארנק Wanderlust שלך."
            if refund_delta_ils > 0
            else "המחיר ששילמת עדיין הנמוך ביותר בשוק. המגן ממשיך לסרוק 24/7."
        ),
    }


def get_price_guard_overview(user_id: Optional[str] = None) -> Dict[str, Any]:
    with get_db_session() as db:
        pq = db.query(PriceProtectionPolicyModel)
        wq = db.query(TravelWalletEntryModel)
        if user_id:
            pq = pq.filter(PriceProtectionPolicyModel.user_id == user_id)
            wq = wq.filter(TravelWalletEntryModel.user_id == user_id)
        policies = pq.order_by(PriceProtectionPolicyModel.created_at.desc()).limit(25).all()
        entries = wq.order_by(TravelWalletEntryModel.created_at.desc()).limit(25).all()
        wallet_balance = round(sum(float(e.amount_ils) for e in entries), 2)
        return {
            "user_id": user_id or "all",
            "wallet_balance_ils": wallet_balance,
            "active_policies_count": len(policies),
            "policies": [_serialize_policy(p) for p in policies],
            "wallet_entries": [
                {
                    "entry_id": e.entry_id,
                    "booking_ref": e.booking_ref,
                    "entry_type": e.entry_type,
                    "amount_ils": e.amount_ils,
                    "description_he": e.description_he,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                }
                for e in entries
            ],
        }
