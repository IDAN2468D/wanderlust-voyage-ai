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
    TLVHolidayFlightBoardRequest,
    TLVHolidayFlightBoardResponse,
    SendFlightBoardEmailRequest,
    ContactInquiryRequest,
    EmailDispatchResponse,
)
from app.core.security import get_current_user
from app.services.email_service import email_service
from app.agents.orchestrator import (
    synthesize_deterministic_plan,
    stream_multi_agent_execution,
)
from app.tools.tlv_flight_board_tools import ISRAELI_HOLIDAYS_2026
from app.agents.tlv_flight_agent import (
    synthesize_tlv_flight_board,
    stream_tlv_flight_board_execution,
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
    Prepares a formatted HTML confirmation briefing and dispatches via Resend
    with graceful fallback if Resend API key is unconfigured.
    """
    dest = request.destination
    subject = f"✈️ תדריך הנסיעה שלך ל{dest} - Wanderlust Voyage AI"

    # Send through Resend EmailService
    result = await email_service.send_trip_briefing(
        recipient_email=str(request.recipient_email),
        destination=dest,
        duration_days=request.duration_days,
        total_estimated_usd=request.total_estimated_usd,
        markdown_plan=request.markdown_plan,
    )

    status_code_text = "SENT" if result.get("status") == "sent" else "SENT_SIMULATED"
    logger.info(f"Dispatched trip briefing for {dest} to {request.recipient_email} (status: {status_code_text})")

    return WorkspaceGmailBriefingResponse(
        status=status_code_text,
        recipient=str(request.recipient_email),
        subject=subject,
        html_preview=result.get("message", "תדריך הנסיעה נשלח בהצלחה לתיבת הדואר."),
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


# 4. TLV Holiday Flight Board Endpoints (Skill: tlv-holiday-flight-board)
@router.get("/flights/holidays")
async def get_israeli_holidays():
    """
    Returns canonical Israeli school-break and holiday dates for 2026.
    """
    holidays_list = []
    for key, val in ISRAELI_HOLIDAYS_2026.items():
        holidays_list.append({
            "key": key,
            "name_he": val["name_he"],
            "name_en": val["name_en"],
            "depart_window": val["depart_window"],
            "return_window": val["return_window"],
            "school_break": val["school_break"],
            "peak_season": val["peak_season"],
            "peak_surcharge_window": val["peak_surcharge_window"],
            "airport_arrival_recommendation": val["airport_arrival_recommendation"],
        })
    return {"status": "SUCCESS", "holidays": holidays_list}


@router.post("/flights/tlv-holiday-board", response_model=TLVHolidayFlightBoardResponse)
async def generate_tlv_flight_board(request: TLVHolidayFlightBoardRequest):
    """
    Synchronously generates a ranked Ben Gurion holiday departure board with baggage normalization,
    Shabbat constraints, Bank of Israel FX conversion, and search deep-links.
    """
    result = synthesize_tlv_flight_board(
        holiday_name_or_key=request.holiday_name_or_key,
        destination=request.destination,
        depart_date=request.depart_date,
        return_date=request.return_date,
        adults=request.adults,
        children=request.children,
        infants=request.infants,
        checked_bag_needed=request.checked_bag_needed,
        nonstop_only=request.nonstop_only,
        budget_ceiling_nis=request.budget_ceiling_nis,
    )
    return result


@router.post("/flights/tlv-holiday-board/stream")
async def stream_tlv_flight_board(request: TLVHolidayFlightBoardRequest):
    """
    Streams multi-stage deliberation and live thought processes for the TLV Holiday Flight Board
    via Server-Sent Events (SSE).
    """
    return StreamingResponse(
        stream_tlv_flight_board_execution(
            holiday_name_or_key=request.holiday_name_or_key,
            destination=request.destination,
            depart_date=request.depart_date,
            return_date=request.return_date,
            adults=request.adults,
            children=request.children,
            infants=request.infants,
            checked_bag_needed=request.checked_bag_needed,
            nonstop_only=request.nonstop_only,
            budget_ceiling_nis=request.budget_ceiling_nis,
            session_id=request.session_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/flights/send-board", response_model=EmailDispatchResponse)
async def send_flight_board_email(payload: SendFlightBoardEmailRequest):
    """
    Emails the computed TLV holiday flight board table to the user.
    """
    res = await email_service.send_flight_board(
        recipient_email=str(payload.recipient_email),
        holiday_name=payload.holiday_name,
        flights=payload.flights,
        search_links=payload.search_links,
    )
    is_ok = res.get("status") in ["sent", "simulated"]
    return EmailDispatchResponse(
        status="SUCCESS" if is_ok else "FAILED",
        message="לוח הטיסות נשלח בהצלחה לכתובת המייל!" if is_ok else "לא ניתן היה לשלוח את לוח הטיסות למייל.",
        id=res.get("id"),
        recipient=str(payload.recipient_email),
    )


@router.post("/contact", response_model=EmailDispatchResponse)
async def submit_contact_inquiry(payload: ContactInquiryRequest):
    """
    Submits a contact/support inquiry and sends an automated confirmation email.
    """
    res = await email_service.send_contact_inquiry(
        sender_name=payload.name,
        sender_email=str(payload.email),
        subject=payload.subject,
        message=payload.message,
    )
    is_ok = res.get("status") in ["sent", "simulated"]
    return EmailDispatchResponse(
        status="SUCCESS" if is_ok else "FAILED",
        message="פנייתך התקבלה בהצלחה ואישור נשלח למייל!" if is_ok else "שגיאה בקליטת הפנייה.",
        id=res.get("id"),
        recipient=str(payload.email),
    )


