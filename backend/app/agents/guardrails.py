"""
Input & Output Guardrails for Wanderlust Voyage AI Travel Planner.
Enforces strict pre-execution and post-synthesis invariants per Course Spec & AGENTS.md.
"""
import re
from datetime import date, datetime
from typing import Any, Dict, List


REQUIRED_PLAN_KEYS = (
    "markdown_plan",
    "flight_cost",
    "hotel_cost",
    "activities_cost",
    "total_estimated",
    "remaining_balance",
    "budget_status",
    "itemized_breakdown",
    "structured_days",
    "start_date_formatted",
)

MIN_DAILY_BUDGET_USD = 50.0
ISRAELI_DATE_PATTERN = re.compile(r"^\d{2}/\d{2}/\d{4}$")


class TripGuardrailError(ValueError):
    """Raised when trip input or output violates safety/business guardrails."""


def validate_trip_input(
    origin: str,
    destination: str,
    start_date: str,
    duration_days: int,
    total_budget: float,
) -> Dict[str, Any]:
    """
    Validate trip planning input parameters before agent execution.

    Rejects:
    - Empty origin or destination
    - Invalid date format (expects YYYY-MM-DD) or dates in the past
    - Non-positive duration or duration > 30 days
    - Non-positive budget or unrealistic budget (< $50/day)
    """
    orig_clean = (origin or "").strip()
    dest_clean = (destination or "").strip()

    if not orig_clean:
        raise TripGuardrailError("Origin cannot be empty.")
    if not dest_clean:
        raise TripGuardrailError("Destination cannot be empty.")

    if not isinstance(duration_days, int) or duration_days < 1 or duration_days > 30:
        raise TripGuardrailError("duration_days must be between 1 and 30.")

    if not start_date or not isinstance(start_date, str):
        raise TripGuardrailError("Invalid start_date: expected YYYY-MM-DD format.")

    try:
        parsed_date = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
    except ValueError as exc:
        raise TripGuardrailError(f"Invalid start_date '{start_date}': expected YYYY-MM-DD format.") from exc

    if parsed_date < date.today():
        raise TripGuardrailError(f"start_date '{start_date}' cannot be in the past.")

    if total_budget is None or float(total_budget) <= 0:
        raise TripGuardrailError("total_budget must be a positive number.")

    min_required_budget = duration_days * MIN_DAILY_BUDGET_USD
    if float(total_budget) < min_required_budget:
        raise TripGuardrailError(
            f"Unrealistic budget: ${float(total_budget):,.2f} for {duration_days} days "
            f"is below minimum ${MIN_DAILY_BUDGET_USD:.0f}/day (${min_required_budget:,.2f} required)."
        )

    return {
        "valid": True,
        "origin": orig_clean,
        "destination": dest_clean,
        "start_date": parsed_date.isoformat(),
        "duration_days": duration_days,
        "total_budget": float(total_budget),
    }


def validate_trip_output(plan_data: Dict[str, Any], max_budget: float) -> Dict[str, Any]:
    """
    Validate synthesized trip output payload after agent execution.

    Verifies:
    - Presence of all required keys
    - Valid Israeli DD/MM/YYYY date format in start_date_formatted
    - Flags budget overruns when total_estimated exceeds max_budget * 1.01
    """
    if not isinstance(plan_data, dict):
        raise TripGuardrailError("Plan output must be a dictionary.")

    missing = [key for key in REQUIRED_PLAN_KEYS if key not in plan_data or plan_data[key] is None]
    if missing:
        raise TripGuardrailError(f"Plan output missing required keys: {', '.join(missing)}")

    start_fmt = str(plan_data.get("start_date_formatted", ""))
    if not ISRAELI_DATE_PATTERN.match(start_fmt):
        raise TripGuardrailError(
            f"start_date_formatted '{start_fmt}' must match Israeli DD/MM/YYYY format."
        )
    try:
        datetime.strptime(start_fmt, "%d/%m/%Y")
    except ValueError as exc:
        raise TripGuardrailError(f"start_date_formatted '{start_fmt}' is not a valid calendar date.") from exc

    warnings: List[str] = list(plan_data.get("guardrail_warnings") or [])
    total_estimated = float(plan_data["total_estimated"])
    overrun = total_estimated > (float(max_budget) * 1.01)

    if overrun:
        plan_data["budget_status"] = "OVER_BUDGET"
        plan_data["budget_overrun_flagged"] = True
        over_amt = round(total_estimated - float(max_budget), 2)
        warning_msg = (
            f"Budget overrun detected: estimated ${total_estimated:,.2f} exceeds "
            f"ceiling ${float(max_budget):,.2f} by ${over_amt:,.2f}."
        )
        if warning_msg not in warnings:
            warnings.append(warning_msg)
    else:
        plan_data["budget_overrun_flagged"] = False

    plan_data["guardrail_warnings"] = warnings
    return plan_data
