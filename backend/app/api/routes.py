import uuid
import logging
import urllib.parse
from typing import Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, status, Response
from fastapi.responses import StreamingResponse

from app.api.schemas import (
    TripPlanRequest,
    TripPlanResponse,
    WorkspaceCalendarSyncRequest,
    WorkspaceCalendarSyncResponse,
    WorkspaceGmailBriefingRequest,
    WorkspaceGmailBriefingResponse,
    WorkspaceDocExportRequest,
    WorkspaceDocExportResponse,
)
from app.core.security import get_current_user
from app.agents.orchestrator import (
    synthesize_deterministic_plan,
    stream_multi_agent_execution,
)

logger = logging.getLogger("api_routes")
router = APIRouter(prefix="/v1", tags=["Travel Planner Multi-Agent"])


def execute_plan_sync(request: TripPlanRequest, user_id: str) -> TripPlanResponse:
    """Internal helper to execute synchronous trip planning."""
    session_id = request.session_id or f"session_{uuid.uuid4().hex[:10]}"
    start_date = request.get_effective_start_date()
    effective_budget = request.get_effective_budget()

    logger.info(f"User {user_id} planning trip to {request.destination} (Session: {session_id})")

    result = synthesize_deterministic_plan(
        origin=request.origin,
        destination=request.destination,
        start_date=start_date,
        duration_days=request.duration_days,
        total_budget=effective_budget,
        interests=request.interests,
        travel_style=request.travel_style,
        currency=request.currency,
    )

    return TripPlanResponse(
        session_id=session_id,
        destination=request.destination,
        duration_days=request.duration_days,
        total_budget=effective_budget,
        total_estimated=result["total_estimated"],
        remaining_balance=result["remaining_balance"],
        budget_status=result["budget_status"],
        flight_cost=result["flight_cost"],
        hotel_cost=result["hotel_cost"],
        activities_cost=result["activities_cost"],
        markdown_plan=result["markdown_plan"],
        itemized_breakdown=result["itemized_breakdown"],
        weather_metrics=result.get("weather_metrics"),
        packing_checklist=result.get("packing_checklist"),
        safety_info=result.get("safety_info"),
        seasonal_events=result.get("seasonal_events"),
        structured_days=result.get("structured_days"),
        recommended_flight=result.get("recommended_flight"),
        selected_hotel=result.get("selected_hotel"),
        start_date_formatted=result.get("start_date_formatted"),
    )


def execute_plan_stream(request: TripPlanRequest, user_id: str) -> StreamingResponse:
    """Internal helper to initiate SSE multi-agent streaming."""
    session_id = request.session_id or f"session_{uuid.uuid4().hex[:10]}"
    start_date = request.get_effective_start_date()
    effective_budget = request.get_effective_budget()

    logger.info(f"User {user_id} streaming multi-agent plan for {request.destination} (Session: {session_id})")

    return StreamingResponse(
        stream_multi_agent_execution(
            origin=request.origin,
            destination=request.destination,
            start_date=start_date,
            duration_days=request.duration_days,
            total_budget=effective_budget,
            interests=request.interests,
            travel_style=request.travel_style,
            currency=request.currency,
            session_id=session_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# 1. Existing endpoints
@router.post("/plan-trip", response_model=TripPlanResponse, status_code=status.HTTP_200_OK)
async def plan_trip_sync(
    request: TripPlanRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return execute_plan_sync(request, current_user.get("user_id", "guest_user"))


@router.post("/plan-trip/stream")
async def plan_trip_stream(
    request: TripPlanRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return execute_plan_stream(request, current_user.get("user_id", "guest_user"))


# 2. SPEC.md Contract endpoints (POST /api/v1/trips/plan)
@router.post("/trips/plan", response_model=TripPlanResponse, status_code=status.HTTP_200_OK)
async def trips_plan_sync(
    request: TripPlanRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return execute_plan_sync(request, current_user.get("user_id", "guest_user"))


@router.post("/trips/plan/stream")
async def trips_plan_stream(
    request: TripPlanRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return execute_plan_stream(request, current_user.get("user_id", "guest_user"))


# 3. Google Workspace / Google Flow MCP Integration Endpoints
@router.post("/workspace/sync-calendar", response_model=WorkspaceCalendarSyncResponse)
async def sync_calendar_event(request: WorkspaceCalendarSyncRequest):
    """
    Generates a direct 1-click Google Calendar URL and standard iCalendar (.ics) format.
    Allows instant calendar event scheduling for flights and trip start.
    """
    dest = request.destination
    start_dt_str = request.start_date
    days = max(1, request.duration_days)

    try:
        dt = datetime.strptime(start_dt_str, "%Y-%m-%d")
    except Exception:
        dt = datetime.now() + timedelta(days=14)

    end_dt = dt + timedelta(days=days)

    # Dates in Google Calendar format YYYYMMDDTHHMMSSZ
    start_fmt = dt.strftime("%Y%m%dT090000Z")
    end_fmt = end_dt.strftime("%Y%m%dT180000Z")

    title = f"✈️ חופשה ב{dest} - Wanderlust Voyage AI"
    details = (
        f"תוכנית חופשה מלאה עבור {dest} ({days} ימים)\n"
        f"טיסה: {request.flight_number}\n"
        f"מלון: {request.hotel_name or 'מלון בוטיק נבחר'}\n"
        f"נוצר אוטונומית על ידי Wanderlust Voyage AI & Google Flow MCP"
    )

    params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": f"{start_fmt}/{end_fmt}",
        "details": details,
        "location": dest,
    }
    google_cal_url = f"https://calendar.google.com/calendar/render?{urllib.parse.urlencode(params)}"

    # Generate standard RFC 5545 iCalendar payload
    ical_data = (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "PRODID:-//Wanderlust Voyage AI//Travel Planner//HE\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:{uuid.uuid4()}@wanderlust.ai\r\n"
        f"DTSTAMP:{datetime.now().strftime('%Y%m%dT%H%M%SZ')}\r\n"
        f"DTSTART:{start_fmt}\r\n"
        f"DTEND:{end_fmt}\r\n"
        f"SUMMARY:{title}\r\n"
        f"DESCRIPTION:{details.replace(chr(10), ' ')}\r\n"
        f"LOCATION:{dest}\r\n"
        "STATUS:CONFIRMED\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )

    return WorkspaceCalendarSyncResponse(
        google_calendar_url=google_cal_url,
        event_title=title,
        event_details=details,
        location=dest,
        ical_data=ical_data,
    )


@router.post("/workspace/send-briefing", response_model=WorkspaceGmailBriefingResponse)
async def send_gmail_briefing(request: WorkspaceGmailBriefingRequest):
    """
    Prepares a formatted HTML confirmation briefing and simulates Gmail dispatch via Google Flow MCP.
    """
    dest = request.destination
    subject = f"✈️ תדריך הנסיעה שלך ל{dest} - Wanderlust Voyage AI"

    html_content = f"""
    <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #0c121d; color: #f8fafc; padding: 24px; border-radius: 16px;">
        <h1 style="color: #2dd4bf; border-bottom: 2px solid rgba(45, 212, 191, 0.3); padding-bottom: 8px;">תדריך נסיעה רשמי: {dest} ({request.duration_days} ימים)</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">שלום! סוכני ה-AI של Wanderlust סיכמו בהצלחה את כל פרטי הנסיעה שלך.</p>
        <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 12px; margin: 16px 0; border: 1px solid rgba(255,255,255,0.1);">
            <p><strong>יעד:</strong> {dest}</p>
            <p><strong>משך השהות:</strong> {request.duration_days} ימים</p>
            <p><strong>עלות משוערת כוללת:</strong> ${request.total_estimated_usd:,.2f} USD (כולל 10% כרית ביטחון)</p>
        </div>
        <h3 style="color: #38bdf8;">דגשים מרכזיים:</h3>
        <div style="white-space: pre-wrap; font-size: 13px; color: #94a3b8; line-height: 1.7;">
{request.markdown_plan[:1500]}...
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #64748b;">נוצר באמצעות Wanderlust Voyage AI & Google Flow MCP</p>
    </div>
    """

    logger.info(f"Dispatched trip briefing for {dest} to {request.recipient_email} via Google Flow MCP")

    return WorkspaceGmailBriefingResponse(
        status="SENT_SIMULATED",
        recipient=str(request.recipient_email),
        subject=subject,
        html_preview=html_content,
    )


@router.post("/workspace/export-doc", response_model=WorkspaceDocExportResponse)
async def export_google_doc(request: WorkspaceDocExportRequest):
    """
    Exports trip itinerary markdown to Google Drive format.
    """
    dest = request.destination
    title = f"Wanderlust AI Itinerary - {dest} ({request.duration_days} Days)"
    google_docs_url = f"https://docs.google.com/document/create?title={urllib.parse.quote(title)}"

    return WorkspaceDocExportResponse(
        status="SUCCESS",
        document_title=title,
        google_docs_url=google_docs_url,
        formatted_content=request.markdown_plan,
    )
