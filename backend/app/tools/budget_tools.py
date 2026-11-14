import asyncio
import concurrent.futures
import json
import logging
from typing import Dict, Any, List, Optional

import httpx

logger = logging.getLogger("budget_tools")

EXCHANGE_RATES = {
    "USD": 1.0,
    "ILS": 3.70,
    "EUR": 0.92,
    "GBP": 0.79,
}


def _run_async(coro):
    """Execute an async coroutine safely from synchronous tool code."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(asyncio.run, coro).result(timeout=6.0)


async def _fetch_frankfurter_rates(base: str = "USD") -> Optional[Dict[str, float]]:
    """Query Frankfurter Exchange Rate API for live USD/EUR/ILS/GBP conversion."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://api.frankfurter.app/latest",
                params={"from": base, "to": "EUR,ILS,GBP"},
            )
            resp.raise_for_status()
            payload = resp.json()
            rates = payload.get("rates") or {}
            if not rates:
                return None
            return {
                "USD": 1.0,
                "ILS": round(float(rates.get("ILS", EXCHANGE_RATES["ILS"])), 4),
                "EUR": round(float(rates.get("EUR", EXCHANGE_RATES["EUR"])), 4),
                "GBP": round(float(rates.get("GBP", EXCHANGE_RATES["GBP"])), 4),
            }
    except (httpx.TimeoutException, httpx.HTTPError, Exception) as exc:
        logger.warning(f"Frankfurter FX lookup failed, using fallback rates: {exc}")
        return None


def calculate_trip_budget(
    total_budget: float,
    flight_cost: float,
    accommodation_cost: float,
    daily_food_estimate: float,
    activities_cost: float,
    duration_days: int,
    local_transit_estimate: float = 15.0,
    emergency_buffer_percentage: float = 10.0,
    currency: str = "USD",
) -> str:
    """
    Calculate and audit the overall trip expenses against the traveler's total budget.
    Strictly enforces a 10% unallocated contingency buffer per the budget-currency-optimizer directive.

    Args:
        total_budget (float): Maximum available budget in USD.
        flight_cost (float): Total round-trip flight expense in USD.
        accommodation_cost (float): Total lodging expense for the entire stay in USD.
        daily_food_estimate (float): Estimated daily food & beverage expense per person in USD.
        activities_cost (float): Total admission tickets, tours, and attraction fees in USD.
        duration_days (int): Total duration of the trip in days.
        local_transit_estimate (float): Estimated daily transit in USD (default $15/day).
        emergency_buffer_percentage (float): Safety buffer percentage (mandatory 10% per skill directive).
        currency (str): User preferred display currency ('USD', 'ILS', 'EUR', 'GBP').

    Returns:
        str: JSON formatted audit report with itemized breakdowns, currency equivalents,
             and actionable financial advice.
    """
    days = max(1, duration_days)
    total_food_cost = round(daily_food_estimate * days, 2)
    total_transit_cost = round(local_transit_estimate * days, 2)

    subtotal = round(flight_cost + accommodation_cost + total_food_cost + activities_cost + total_transit_cost, 2)
    # 10% contingency buffer as mandated by constitution
    buffer_pct = max(10.0, emergency_buffer_percentage)
    emergency_buffer = round(subtotal * (buffer_pct / 100.0), 2)
    grand_total = round(subtotal + emergency_buffer, 2)

    remaining_balance = round(total_budget - grand_total, 2)
    # Flag any trip exceeding budget ceiling by even 1%
    is_approved = grand_total <= (total_budget * 1.01)

    audit_status = "APPROVED" if is_approved else "OVER_BUDGET"

    def pct(val: float) -> float:
        return round((val / grand_total * 100.0) if grand_total > 0 else 0.0, 1)

    breakdown = {
        "flights": {"amount_usd": round(flight_cost, 2), "percentage": pct(flight_cost)},
        "accommodation": {"amount_usd": round(accommodation_cost, 2), "percentage": pct(accommodation_cost)},
        "food_and_dining": {"amount_usd": total_food_cost, "percentage": pct(total_food_cost)},
        "activities_and_tours": {"amount_usd": round(activities_cost, 2), "percentage": pct(activities_cost)},
        "local_transit": {"amount_usd": total_transit_cost, "percentage": pct(total_transit_cost)},
        "contingency_buffer": {"amount_usd": emergency_buffer, "percentage": pct(emergency_buffer)},
    }

    # Multi-currency conversions (live Frankfurter FX with deterministic fallback)
    live_rates = _run_async(_fetch_frankfurter_rates("USD"))
    active_rates = live_rates if live_rates else dict(EXCHANGE_RATES)
    rates_source = "frankfurter" if live_rates else "deterministic_fallback"

    curr_code = currency.upper()
    curr_rate = active_rates.get(curr_code, 1.0)
    ils_rate = active_rates["ILS"]

    recommendations: List[str] = []
    if is_approved:
        surplus_pct = round((remaining_balance / total_budget) * 100, 1) if total_budget > 0 else 0
        recommendations.append(
            f"Budget Approved! ✅ התקציב אושר בהצלחה! נותר עודף מרווח של ${remaining_balance:,.2f} USD "
            f"({remaining_balance * ils_rate:,.0f} ₪, שהם כ-{surplus_pct}% מתקציב היעד) המיועדים לקניות ובילויים ספונטניים."
        )
        recommendations.append(
            f"🛡️ כרית ביטחון של 10% (${emergency_buffer:,.2f} USD / {emergency_buffer * ils_rate:,.0f} ₪) "
            "משוריינת לבלת\"מים ואינה כלולה בהוצאות השוטפות."
        )
    else:
        deficit = abs(remaining_balance)
        recommendations.append(
            f"Over Budget Warning: ⚠️ התראה: העלות החזויה (${grand_total:,.2f} USD / {grand_total * ils_rate:,.0f} ₪) "
            f"חורגת מהתקציב המוגדר (${total_budget:,.2f} USD) ב-${deficit:,.2f} USD."
        )
        if pct(accommodation_cost) > 35:
            recommendations.append(
                f"💡 סעיף הלינה תופס {pct(accommodation_cost)}% מהתקציב. "
                f"מעבר למלון 4 כוכבים או דירת בוטיק יחסוך כ-${accommodation_cost * 0.25:,.0f} USD."
            )
        if pct(flight_cost) > 40:
            recommendations.append(
                f"✈️ סעיף הטיסות מהווה {pct(flight_cost)}% מסך התקציב. "
                "בחירה בטיסה עם עצירת ביניים קצרה תוזיל את המחיר ב-20%-30%."
            )

    report: Dict[str, Any] = {
        "audit_status": audit_status,
        "total_budget_usd": round(total_budget, 2),
        "total_budget_ils": round(total_budget * ils_rate, 2),
        "total_projected_expenses_usd": grand_total,
        "total_projected_expenses_ils": round(grand_total * ils_rate, 2),
        "remaining_balance_usd": remaining_balance,
        "remaining_balance_ils": round(remaining_balance * ils_rate, 2),
        "selected_currency": curr_code,
        "total_projected_selected_currency": round(grand_total * curr_rate, 2),
        "is_within_budget": is_approved,
        "duration_days": days,
        "contingency_buffer_percentage": buffer_pct,
        "itemized_breakdown": breakdown,
        "exchange_rates": active_rates,
        "rates_source": rates_source,
        "recommendations": recommendations,
    }

    return json.dumps(report, ensure_ascii=False, indent=2)
