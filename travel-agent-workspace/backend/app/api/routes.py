import uuid
import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse

from app.api.schemas import TripPlanRequest, TripPlanResponse
from app.core.security import get_current_user
from app.agents.orchestrator import (
    synthesize_deterministic_plan,
    stream_multi_agent_execution,
)

logger = logging.getLogger("api_routes")
router = APIRouter(prefix="/v1", tags=["Travel Planner Multi-Agent"])


@router.post("/plan-trip", response_model=TripPlanResponse, status_code=status.HTTP_200_OK)
async def plan_trip_sync(
    request: TripPlanRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Synchronously generate a full multi-agent travel plan.
    Returns complete markdown itinerary, financial metrics, and itemized budget.
    """
    session_id = request.session_id or f"session_{uuid.uuid4().hex[:10]}"
    user_id = current_user.get("user_id", "guest_user")
    logger.info(f"User {user_id} requested trip plan for {request.destination} (Session: {session_id})")

    result = synthesize_deterministic_plan(
        origin=request.origin,
        destination=request.destination,
        start_date=request.start_date,
        duration_days=request.duration_days,
        total_budget=request.total_budget,
        interests=request.interests,
        travel_style=request.travel_style,
    )

    return TripPlanResponse(
        session_id=session_id,
        destination=request.destination,
        duration_days=request.duration_days,
        total_budget=request.total_budget,
        total_estimated=result["total_estimated"],
        remaining_balance=result["remaining_balance"],
        budget_status=result["budget_status"],
        flight_cost=result["flight_cost"],
        hotel_cost=result["hotel_cost"],
        activities_cost=result["activities_cost"],
        markdown_plan=result["markdown_plan"],
        itemized_breakdown=result["itemized_breakdown"],
    )


@router.post("/plan-trip/stream")
async def plan_trip_stream(
    request: TripPlanRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Stream real-time Server-Sent Events (SSE) from the Multi-Agent Travel Planner.
    Emits live agent status, tool calls, and streaming markdown tokens.
    """
    session_id = request.session_id or f"session_{uuid.uuid4().hex[:10]}"
    user_id = current_user.get("user_id", "guest_user")
    logger.info(f"User {user_id} opened live SSE stream for {request.destination} (Session: {session_id})")

    return StreamingResponse(
        stream_multi_agent_execution(
            origin=request.origin,
            destination=request.destination,
            start_date=request.start_date,
            duration_days=request.duration_days,
            total_budget=request.total_budget,
            interests=request.interests,
            travel_style=request.travel_style,
            session_id=session_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
