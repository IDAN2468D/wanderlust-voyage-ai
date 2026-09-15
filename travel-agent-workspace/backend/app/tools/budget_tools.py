import json
from typing import Dict, Any


def calculate_trip_budget(
    total_budget: float,
    flight_cost: float,
    accommodation_cost: float,
    daily_food_estimate: float,
    activities_cost: float,
    duration_days: int,
    local_transit_estimate: float = 15.0,
    emergency_buffer_percentage: float = 5.0,
) -> str:
    """
    Calculate and audit the overall trip expenses against the traveler's total budget.

    Args:
        total_budget (float): Maximum available budget in USD provided by user.
        flight_cost (float): Total round-trip flight expense in USD.
        accommodation_cost (float): Total lodging expense for the entire stay in USD.
        daily_food_estimate (float): Estimated daily food & beverage expense per person in USD.
        activities_cost (float): Total admission tickets, tours, and attraction fees in USD.
        duration_days (int): Total duration of the trip in days.
        local_transit_estimate (float): Estimated daily local metro/taxi/bus transit in USD (default $15/day).
        emergency_buffer_percentage (float): Safety contingency buffer percentage (default 5%).

    Returns:
        str: JSON formatted audit report containing:
             - audit_status: 'APPROVED' if total expenses <= total_budget, otherwise 'OVER_BUDGET'
             - total_budget: original budget
             - total_estimated_cost: sum of all itemized expenses
             - remaining_balance: surplus or deficit (total_budget - total_estimated_cost)
             - percentage_breakdown: allocation of funds across categories
             - recommendations: actionable financial advice to optimize costs.
    """
    days = max(1, duration_days)
    total_food_cost = round(daily_food_estimate * days, 2)
    total_transit_cost = round(local_transit_estimate * days, 2)

    subtotal = round(flight_cost + accommodation_cost + total_food_cost + activities_cost + total_transit_cost, 2)
    emergency_buffer = round(subtotal * (emergency_buffer_percentage / 100.0), 2)
    grand_total = round(subtotal + emergency_buffer, 2)

    remaining_balance = round(total_budget - grand_total, 2)
    is_approved = remaining_balance >= 0

    audit_status = "APPROVED" if is_approved else "OVER_BUDGET"

    # Percentage breakdown
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

    # Actionable advice
    recommendations = []
    if is_approved:
        recommendations.append(
            f"Budget Approved! You have a comfortable surplus of ${remaining_balance:.2f} USD "
            f"({round((remaining_balance / total_budget) * 100, 1)}% of budget) for spontaneous activities or souvenirs."
        )
        if pct(flight_cost) > 45:
            recommendations.append("Flights account for over 45% of total budget; consider flexible dates if looking to save more.")
    else:
        deficit = abs(remaining_balance)
        recommendations.append(
            f"Over Budget Warning: Projected total (${grand_total:.2f}) exceeds budget (${total_budget:.2f}) "
            f"by ${deficit:.2f} USD."
        )
        if pct(accommodation_cost) > 35:
            recommendations.append(
                f"Consider switching to a boutique or 3-star stay to save an estimated ${round(accommodation_cost * 0.25, 2)} USD."
            )
        if pct(flight_cost) > 40:
            recommendations.append("Consider flights with 1 short layover to reduce flight expenditure by 20-30%.")
        recommendations.append(
            "Opt for lunch specials and street food markets instead of sit-down dinners every evening."
        )

    report: Dict[str, Any] = {
        "audit_status": audit_status,
        "total_budget_usd": round(total_budget, 2),
        "total_projected_expenses_usd": grand_total,
        "remaining_balance_usd": remaining_balance,
        "is_within_budget": is_approved,
        "duration_days": days,
        "itemized_breakdown": breakdown,
        "recommendations": recommendations,
    }

    return json.dumps(report, indent=2)
