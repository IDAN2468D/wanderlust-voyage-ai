import json
import uuid
import logging
import urllib.parse
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.schemas import (
    TripPlanRequest,
    TripPlanResponse,
    TripChatRequest,
    TripChatResponse,
    WorkspaceCalendarSyncRequest,
    WorkspaceCalendarSyncResponse,
    WorkspaceGmailBriefingRequest,
    WorkspaceGmailBriefingResponse,
    WorkspaceDocExportRequest,
    WorkspaceDocExportResponse,
    ApproveActionRequest,
    ApproveActionResponse,
    TLVHolidayFlightBoardRequest,
    TLVHolidayFlightBoardResponse,
    SendFlightBoardEmailRequest,
    ContactInquiryRequest,
    EmailDispatchResponse,
    BookingConfirmationRequest,
    BookingRecordResponse,
    BookingsListResponse,
    TripSaveRequest,
    SavedTripRecord,
    TripsHistoryResponse,
    NewsletterSubscribeRequest,
    NewsletterSubscribeResponse,
    KnowledgeSearchRequest,
    KnowledgeChunkResult,
    KnowledgeSearchResponse,
    KnowledgeStatsResponse,
    TripReplanRequest,
    TripReplanResponse,
    GroupSplitRequest,
    TripVoteRequest,
    TravelerPreferencesPayload,
    PersonalKnowledgeIngestRequest,
)
from app.core.security import get_current_user
from app.db.database import get_db, get_db_session
from app.db.models import (
    BookingModel,
    ContactInquiryModel,
    NewsletterSubscriberModel,
    SavedTripModel,
    PendingActionModel,
    TripVoteModel,
)
from app.services.email_service import email_service
from app.services.email_templates import render_newsletter_html
from app.services.newsletter_service import (
    NEWSLETTER_EDITIONS,
    get_israeli_dispatch_date,
    select_rotating_edition,
)
from app.agents.guardrails import (
    TripGuardrailError,
    validate_trip_input,
    validate_trip_output,
)
from app.agents.orchestrator import (
    synthesize_deterministic_plan,
    stream_multi_agent_execution,
    run_trip_chat,
    _SESSION_PLANS,
)
from app.rag.retriever import get_knowledge_base
from app.tools.tlv_flight_board_tools import ISRAELI_HOLIDAYS_2026
from app.agents.tlv_flight_agent import (
    synthesize_tlv_flight_board,
    stream_tlv_flight_board_execution,
)

logger = logging.getLogger("api_routes")
core_router = APIRouter(tags=["Travel Planner Multi-Agent"])

# In-memory Human-In-The-Loop pending external actions registry
PENDING_ACTIONS: Dict[str, Dict[str, Any]] = {}


def _persist_trip_to_db(
    *,
    session_id: str,
    user_id: Optional[str],
    user_email: Optional[str],
    origin: str,
    destination: str,
    start_date: Optional[str],
    duration_days: int,
    total_budget: float,
    total_estimated: float,
    budget_status: str,
    travel_style: str,
    markdown_plan: str,
    plan_payload: Optional[Dict[str, Any]] = None,
) -> None:
    """Save or update a planned trip record in the persistent database."""
    try:
        clean_uid = None if (not user_id or user_id == "guest_user") else str(user_id)
        clean_email = (
            str(user_email).lower().strip()
            if user_email and "@" in str(user_email) and "guest_user" not in str(user_email)
            else None
        )
        payload_str = json.dumps(plan_payload or {}, ensure_ascii=False, default=str)

        with get_db_session() as db:
            existing = db.query(SavedTripModel).filter(SavedTripModel.session_id == session_id).first()
            if existing:
                if clean_uid:
                    existing.user_id = clean_uid
                if clean_email:
                    existing.user_email = clean_email
                existing.origin = origin
                existing.destination = destination
                existing.start_date = start_date
                existing.duration_days = duration_days
                existing.total_budget = total_budget
                existing.total_estimated = total_estimated
                existing.budget_status = budget_status
                existing.travel_style = travel_style
                existing.markdown_plan = markdown_plan
                existing.plan_payload_json = payload_str
            else:
                db.add(
                    SavedTripModel(
                        session_id=session_id,
                        user_id=clean_uid,
                        user_email=clean_email,
                        origin=origin,
                        destination=destination,
                        start_date=start_date,
                        duration_days=duration_days,
                        total_budget=total_budget,
                        total_estimated=total_estimated,
                        budget_status=budget_status,
                        travel_style=travel_style,
                        markdown_plan=markdown_plan,
                        plan_payload_json=payload_str,
                    )
                )
            db.commit()
    except Exception as exc:
        logger.warning(f"Could not persist trip '{session_id}' to database: {exc}")


def execute_plan_sync(
    request: TripPlanRequest,
    user_id: str,
    user_email: Optional[str] = None,
) -> TripPlanResponse:
    """Internal helper to execute synchronous trip planning with input/output guardrails."""
    session_id = request.session_id or f"session_{uuid.uuid4().hex[:10]}"
    start_date = request.get_effective_start_date()
    effective_budget = request.get_effective_budget()

    try:
        validate_trip_input(
            origin=request.origin,
            destination=request.destination,
            start_date=start_date,
            duration_days=request.duration_days,
            total_budget=effective_budget,
        )
    except TripGuardrailError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    logger.info(f"User {user_id} planning trip to {request.destination} (Session: {session_id})")

    try:
        result = synthesize_deterministic_plan(
            origin=request.origin,
            destination=request.destination,
            start_date=start_date,
            duration_days=request.duration_days,
            total_budget=effective_budget,
            interests=request.interests,
            travel_style=request.travel_style,
            currency=request.currency,
            travelers=request.travelers,
            return_date=request.return_date,
            shabbat_safe_mode=request.shabbat_safe_mode,
            kosher_only=request.kosher_only,
            accessibility_mode=request.accessibility_mode,
            user_id=user_id,
        )
        result = validate_trip_output(result, effective_budget)
    except TripGuardrailError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    _SESSION_PLANS[session_id] = result
    _persist_trip_to_db(
        session_id=session_id,
        user_id=user_id,
        user_email=user_email,
        origin=request.origin,
        destination=request.destination,
        start_date=start_date,
        duration_days=request.duration_days,
        total_budget=effective_budget,
        total_estimated=float(result.get("total_estimated", 0)),
        budget_status=str(result.get("budget_status", "APPROVED")),
        travel_style=request.travel_style,
        markdown_plan=str(result.get("markdown_plan", "")),
        plan_payload=result,
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
        transit_guide=result.get("transit_guide"),
        culinary_guide=result.get("culinary_guide"),
        shopping_taxfree=result.get("shopping_taxfree"),
        calendar_events=result.get("calendar_events"),
        ground_alerts=result.get("ground_alerts"),
        whatsapp_briefings=result.get("whatsapp_briefings"),
        rag_knowledge=result.get("rag_knowledge"),
        reasoning_trace=result.get("reasoning_trace"),
        shabbat_halacha=result.get("shabbat_halacha"),
        connectivity_mobility=result.get("connectivity_mobility"),
        protection_rerouting=result.get("protection_rerouting"),
        loyalty_vault=result.get("loyalty_vault"),
        group_breakdown=result.get("group_breakdown"),
        traveler_memory=result.get("traveler_memory"),
        critic_audit=result.get("critic_audit"),
        track_h_insights=result.get("track_h_insights"),
        budget_overrun_flagged=result.get("budget_overrun_flagged", False),
        guardrail_warnings=result.get("guardrail_warnings", []),
    )


def execute_plan_stream(
    request: TripPlanRequest,
    user_id: str,
    user_email: Optional[str] = None,
) -> StreamingResponse:
    """Internal helper to initiate SSE multi-agent streaming with input guardrail and DB persistence."""
    session_id = request.session_id or f"session_{uuid.uuid4().hex[:10]}"
    start_date = request.get_effective_start_date()
    effective_budget = request.get_effective_budget()

    try:
        validate_trip_input(
            origin=request.origin,
            destination=request.destination,
            start_date=start_date,
            duration_days=request.duration_days,
            total_budget=effective_budget,
        )
    except TripGuardrailError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    logger.info(f"User {user_id} streaming multi-agent plan for {request.destination} (Session: {session_id})")

    async def _persisting_stream():
        collected_chunks: List[str] = []
        async for sse_block in stream_multi_agent_execution(
            origin=request.origin,
            destination=request.destination,
            start_date=start_date,
            duration_days=request.duration_days,
            total_budget=effective_budget,
            interests=request.interests,
            travel_style=request.travel_style,
            currency=request.currency,
            session_id=session_id,
            travelers=request.travelers,
            return_date=request.return_date,
            shabbat_safe_mode=request.shabbat_safe_mode,
            kosher_only=request.kosher_only,
            accessibility_mode=request.accessibility_mode,
            user_id=user_id,
        ):
            if sse_block.startswith("event: chunk"):
                try:
                    data_line = sse_block.split("data:", 1)[1].strip()
                    collected_chunks.append(json.loads(data_line).get("text", ""))
                except Exception:
                    pass
            elif sse_block.startswith("event: done"):
                try:
                    data_line = sse_block.split("data:", 1)[1].strip()
                    done_data = json.loads(data_line)
                    full_md = _SESSION_PLANS.get(session_id, {}).get("markdown_plan") or "".join(collected_chunks)
                    _persist_trip_to_db(
                        session_id=session_id,
                        user_id=user_id,
                        user_email=user_email,
                        origin=request.origin,
                        destination=request.destination,
                        start_date=start_date,
                        duration_days=request.duration_days,
                        total_budget=effective_budget,
                        total_estimated=float(done_data.get("total_estimated", 0)),
                        budget_status=str(done_data.get("budget_status", "APPROVED")),
                        travel_style=request.travel_style,
                        markdown_plan=full_md,
                        plan_payload=done_data,
                    )
                except Exception as exc:
                    logger.warning(f"Stream DB persistence warning: {exc}")
            yield sse_block

    return StreamingResponse(
        _persisting_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _execute_calendar_sync(request: WorkspaceCalendarSyncRequest) -> WorkspaceCalendarSyncResponse:
    """Build Google Calendar deep link and RFC 5545 iCalendar payload."""
    dest = request.destination
    start_dt_str = request.start_date
    days = max(1, request.duration_days)

    try:
        dt = datetime.strptime(start_dt_str, "%Y-%m-%d")
    except Exception:
        dt = datetime.now() + timedelta(days=14)

    end_dt = dt + timedelta(days=days)
    start_fmt = dt.strftime("%Y%m%dT090000Z")
    end_fmt = end_dt.strftime("%Y%m%dT180000Z")

    title = f"✈️ חופשה ב{dest} - Wanderlust Voyage AI"
    details = (
        f"תוכנית חופשה מלאה עבור {dest} ({days} ימים)\n"
        f"טיסה: {request.flight_number}\n"
        f"מלון: {request.hotel_name or 'מלון בוטיק נבחר'}\n"
        "נוצר אוטונומית על ידי Wanderlust Voyage AI & Google Flow MCP"
    )

    params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": f"{start_fmt}/{end_fmt}",
        "details": details,
        "location": dest,
    }
    google_cal_url = f"https://calendar.google.com/calendar/render?{urllib.parse.urlencode(params)}"

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
        status="SUCCESS",
        google_calendar_url=google_cal_url,
        event_title=title,
        event_details=details,
        location=dest,
        ical_data=ical_data,
    )


async def _execute_gmail_briefing(request: WorkspaceGmailBriefingRequest) -> WorkspaceGmailBriefingResponse:
    """Dispatch trip briefing email via Resend EmailService."""
    dest = request.destination
    subject = f"✈️ תדריך הנסיעה שלך ל{dest} - Wanderlust Voyage AI"

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


# 1. Existing endpoints
@core_router.post("/plan-trip", response_model=TripPlanResponse, status_code=200)
async def plan_trip_sync(
    request: TripPlanRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return execute_plan_sync(
        request,
        current_user.get("user_id", "guest_user"),
        current_user.get("email"),
    )


@core_router.post("/plan-trip/stream")
async def plan_trip_stream(
    request: TripPlanRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return execute_plan_stream(
        request,
        current_user.get("user_id", "guest_user"),
        current_user.get("email"),
    )


# 2. SPEC.md Contract endpoints (POST /api/v1/trips/plan & /api/trips/plan)
@core_router.post("/trips/plan", response_model=TripPlanResponse, status_code=200)
async def trips_plan_sync(
    request: TripPlanRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return execute_plan_sync(
        request,
        current_user.get("user_id", "guest_user"),
        current_user.get("email"),
    )


@core_router.post("/trips/plan/stream")
async def trips_plan_stream(
    request: TripPlanRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return execute_plan_stream(
        request,
        current_user.get("user_id", "guest_user"),
        current_user.get("email"),
    )


@core_router.post("/trips/chat", response_model=TripChatResponse, status_code=200)
async def trips_chat(
    request: TripChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Multi-turn conversational travel assistant backed by Agno session memory."""
    logger.info(f"User {current_user.get('user_id', 'guest_user')} chat message in session {request.session_id}")
    chat_result = await run_trip_chat(session_id=request.session_id, message=request.message)
    return TripChatResponse(**chat_result)


def _save_pending_action(action_id: str, action_type: str, payload: Dict[str, Any]) -> None:
    PENDING_ACTIONS[action_id] = {"action_type": action_type, "payload": payload}
    try:
        with get_db_session() as db:
            db.add(
                PendingActionModel(
                    action_id=action_id,
                    action_type=action_type,
                    payload_json=json.dumps(payload, ensure_ascii=False, default=str),
                    status="pending",
                )
            )
            db.commit()
    except Exception as exc:
        logger.warning(f"Failed to persist pending action {action_id}: {exc}")


def _pop_pending_action(action_id: str) -> Optional[Dict[str, Any]]:
    pending = PENDING_ACTIONS.pop(action_id, None)
    if pending:
        return pending
    try:
        with get_db_session() as db:
            row = (
                db.query(PendingActionModel)
                .filter(PendingActionModel.action_id == action_id, PendingActionModel.status == "pending")
                .first()
            )
            if row:
                return {
                    "action_type": row.action_type,
                    "payload": json.loads(row.payload_json),
                }
    except Exception as exc:
        logger.warning(f"Failed to load pending action {action_id}: {exc}")
    return None


def _mark_pending_action_status(action_id: str, status_val: str) -> None:
    try:
        with get_db_session() as db:
            row = db.query(PendingActionModel).filter(PendingActionModel.action_id == action_id).first()
            if row:
                row.status = status_val
                db.commit()
    except Exception as exc:
        logger.warning(f"Failed to update pending action {action_id} status: {exc}")


@core_router.post("/trips/approve-action", response_model=ApproveActionResponse, status_code=200)
async def approve_pending_action(request: ApproveActionRequest):
    """Human-In-The-Loop approval endpoint to execute or cancel pending workspace actions."""
    pending = _pop_pending_action(request.action_id)
    if not pending:
        raise HTTPException(status_code=404, detail=f"Pending action '{request.action_id}' not found.")

    action_type = pending["action_type"]
    if not request.approved:
        _mark_pending_action_status(request.action_id, "cancelled")
        return ApproveActionResponse(
            action_id=request.action_id,
            status="cancelled",
            action_type=action_type,
            result={"message": "Action cancelled by user."},
        )

    if action_type == "sync_calendar":
        payload_req = WorkspaceCalendarSyncRequest(**pending["payload"])
        exec_res = _execute_calendar_sync(payload_req)
        _mark_pending_action_status(request.action_id, "executed")
        return ApproveActionResponse(
            action_id=request.action_id,
            status="executed",
            action_type=action_type,
            result=exec_res.model_dump(),
        )

    if action_type == "send_briefing":
        payload_req = WorkspaceGmailBriefingRequest(**pending["payload"])
        exec_res = await _execute_gmail_briefing(payload_req)
        _mark_pending_action_status(request.action_id, "executed")
        return ApproveActionResponse(
            action_id=request.action_id,
            status="executed",
            action_type=action_type,
            result=exec_res.model_dump(),
        )

    raise HTTPException(status_code=400, detail=f"Unsupported pending action type: {action_type}")


# 3. Google Workspace / Google Flow MCP Integration Endpoints
@core_router.post("/workspace/sync-calendar", response_model=WorkspaceCalendarSyncResponse)
async def sync_calendar_event(request: WorkspaceCalendarSyncRequest):
    """
    Generates a direct 1-click Google Calendar URL and standard iCalendar (.ics) format.
    Supports Human-In-The-Loop confirmation when require_approval=True.
    """
    if request.require_approval:
        action_id = f"act_{uuid.uuid4().hex[:12]}"
        _save_pending_action(action_id, "sync_calendar", request.model_dump())
        return WorkspaceCalendarSyncResponse(
            status="pending_approval",
            action_id=action_id,
            location=request.destination,
            event_title=f"Pending approval: ✈️ חופשה ב{request.destination}",
        )

    return _execute_calendar_sync(request)


@core_router.post("/workspace/send-briefing", response_model=WorkspaceGmailBriefingResponse)
async def send_gmail_briefing(request: WorkspaceGmailBriefingRequest):
    """
    Prepares a formatted HTML confirmation briefing and dispatches via Resend
    with graceful fallback. Supports Human-In-The-Loop confirmation when require_approval=True.
    """
    if request.require_approval:
        action_id = f"act_{uuid.uuid4().hex[:12]}"
        _save_pending_action(action_id, "send_briefing", request.model_dump())
        subject = f"✈️ תדריך הנסיעה שלך ל{request.destination} - Wanderlust Voyage AI"
        return WorkspaceGmailBriefingResponse(
            status="pending_approval",
            action_id=action_id,
            recipient=str(request.recipient_email),
            subject=subject,
            html_preview="הפעולה ממתינה לאישור המשתמש (Human-In-The-Loop) לפני שליחת המייל.",
        )

    return await _execute_gmail_briefing(request)


@core_router.post("/workspace/export-doc", response_model=WorkspaceDocExportResponse)
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
@core_router.get("/flights/holidays")
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


@core_router.post("/flights/tlv-holiday-board", response_model=TLVHolidayFlightBoardResponse)
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


@core_router.post("/flights/tlv-holiday-board/stream")
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


@core_router.post("/flights/send-board", response_model=EmailDispatchResponse)
async def send_flight_board_email(
    payload: SendFlightBoardEmailRequest,
    http_request: Request,
):
    """
    Emails the computed TLV holiday flight board table to the user.
    """
    frontend_url = email_service.resolve_frontend_url(http_request.headers.get("origin"))
    res = await email_service.send_flight_board(
        recipient_email=str(payload.recipient_email),
        holiday_name=payload.holiday_name,
        flights=payload.flights,
        search_links=payload.search_links,
        frontend_url=frontend_url,
    )
    is_ok = res.get("status") in ["sent", "simulated"]
    return EmailDispatchResponse(
        status="SUCCESS" if is_ok else "FAILED",
        message="לוח הטיסות נשלח בהצלחה לכתובת המייל!" if is_ok else "לא ניתן היה לשלוח את לוח הטיסות למייל.",
        id=res.get("id"),
        recipient=str(payload.recipient_email),
    )


@core_router.post("/contact", response_model=EmailDispatchResponse)
async def submit_contact_inquiry(
    payload: ContactInquiryRequest,
    db: Session = Depends(get_db),
):
    """
    Submits a contact/support inquiry, persists it in DB, and sends an automated confirmation email.
    """
    res = await email_service.send_contact_inquiry(
        sender_name=payload.name,
        sender_email=str(payload.email),
        subject=payload.subject,
        message=payload.message,
    )
    try:
        db.add(
            ContactInquiryModel(
                ticket_id=str(res.get("id") or uuid.uuid4().hex[:8].upper())[:32],
                name=payload.name,
                email=str(payload.email).lower().strip(),
                subject=payload.subject,
                message=payload.message,
            )
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning(f"Could not persist contact inquiry to DB: {exc}")

    is_ok = res.get("status") in ["sent", "simulated"]
    return EmailDispatchResponse(
        status="SUCCESS" if is_ok else "FAILED",
        message="פנייתך התקבלה בהצלחה ואישור נשלח למייל!" if is_ok else "שגיאה בקליטת הפנייה.",
        id=res.get("id"),
        recipient=str(payload.email),
    )


@core_router.post("/workspace/booking-confirmation", response_model=EmailDispatchResponse)
@core_router.post("/bookings/confirm", response_model=EmailDispatchResponse)
async def send_booking_confirmation(
    payload: BookingConfirmationRequest,
    http_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Persists the booking record in the database and emails the official booking confirmation voucher via Resend.
    """
    clean_email = str(payload.recipient_email).lower().strip()
    user_id = current_user.get("user_id")
    clean_uid = None if (not user_id or user_id == "guest_user") else str(user_id)

    try:
        existing = (
            db.query(BookingModel)
            .filter(BookingModel.booking_ref == payload.booking_ref)
            .first()
        )
        if existing:
            if clean_uid and not existing.user_id:
                existing.user_id = clean_uid
            existing.recipient_email = clean_email
            if payload.customer_name:
                existing.customer_name = payload.customer_name
            if payload.customer_phone:
                existing.customer_phone = payload.customer_phone
            if payload.passport_number:
                existing.passport_number = payload.passport_number
        else:
            db.add(
                BookingModel(
                    booking_ref=payload.booking_ref,
                    user_id=clean_uid,
                    recipient_email=clean_email,
                    customer_name=payload.customer_name,
                    customer_phone=payload.customer_phone,
                    passport_number=payload.passport_number,
                    destination=payload.destination,
                    duration_days=payload.duration_days,
                    total_amount=payload.total_amount,
                    currency=payload.currency,
                    flight_portion=payload.flight_portion,
                    hotel_portion=payload.hotel_portion,
                    payment_method=payload.payment_method or "card",
                    installments=payload.installments or 1,
                    status="CONFIRMED",
                )
            )
        db.commit()
        try:
            from app.tools.price_guard_tools import register_price_protection_policy

            fx_rate = 3.7 if str(payload.currency).upper() == "USD" else (4.0 if str(payload.currency).upper() == "EUR" else 1.0)
            register_price_protection_policy(
                user_id=clean_uid or "guest_user",
                booking_ref=payload.booking_ref,
                destination=payload.destination,
                sku_code=f"PKG-TLV-{payload.destination[:3].upper()}",
                paid_amount_ils=round(float(payload.total_amount) * fx_rate, 2),
                vip_tier="PLATINUM",
            )
        except Exception as pg_exc:
            logger.debug(f"Price protection auto-registration skipped: {pg_exc}")
    except Exception as exc:
        db.rollback()
        logger.warning(f"Could not persist booking #{payload.booking_ref} to DB: {exc}")

    frontend_url = email_service.resolve_frontend_url(http_request.headers.get("origin"))
    res = await email_service.send_booking_confirmation(
        recipient_email=str(payload.recipient_email),
        booking_ref=payload.booking_ref,
        destination=payload.destination,
        duration_days=payload.duration_days,
        total_amount=payload.total_amount,
        currency=payload.currency,
        customer_name=payload.customer_name,
        flight_portion=payload.flight_portion,
        hotel_portion=payload.hotel_portion,
        frontend_url=frontend_url,
    )
    is_ok = res.get("status") in ["sent", "simulated"]
    logger.info(f"Dispatched booking confirmation for #{payload.booking_ref} to {payload.recipient_email}")
    return EmailDispatchResponse(
        status="SUCCESS" if is_ok else "FAILED",
        message="אישור ההזמנה וכרטיסי הטיסה נשלחו בהצלחה לכתובת המייל!" if is_ok else "שגיאה בשליחת אישור ההזמנה.",
        id=res.get("id"),
        recipient=str(payload.recipient_email),
    )


@core_router.get("/bookings", response_model=BookingsListResponse)
async def list_bookings(
    email: Optional[str] = Query(default=None, description="Optional email filter"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve persisted bookings for the authenticated user or specified email."""
    user_id = current_user.get("user_id")
    auth_email = current_user.get("email")
    target_email = (email or (auth_email if auth_email and "guest_user" not in str(auth_email) else None))

    query = db.query(BookingModel)
    if user_id and user_id != "guest_user" and target_email:
        clean_e = str(target_email).lower().strip()
        query = query.filter(
            (BookingModel.user_id == str(user_id)) | (BookingModel.recipient_email == clean_e)
        )
    elif target_email:
        query = query.filter(BookingModel.recipient_email == str(target_email).lower().strip())
    elif user_id and user_id != "guest_user":
        query = query.filter(BookingModel.user_id == str(user_id))
    else:
        return BookingsListResponse(status="SUCCESS", bookings=[])

    rows = query.order_by(BookingModel.created_at.desc()).limit(50).all()
    items = [
        BookingRecordResponse(
            booking_ref=r.booking_ref,
            destination=r.destination,
            duration_days=r.duration_days,
            total_amount=r.total_amount,
            currency=r.currency,
            recipient_email=r.recipient_email,
            customer_name=r.customer_name,
            customer_phone=r.customer_phone,
            payment_method=r.payment_method,
            installments=r.installments,
            booking_date=r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat(),
            status=r.status,
            flight_portion=r.flight_portion,
            hotel_portion=r.hotel_portion,
        )
        for r in rows
    ]
    return BookingsListResponse(status="SUCCESS", bookings=items)


@core_router.post("/trips/save")
async def save_trip_record(
    payload: TripSaveRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Save or update a planned trip in the persistent database."""
    session_id = payload.session_id or f"session_{uuid.uuid4().hex[:10]}"
    user_id = current_user.get("user_id", "guest_user")
    user_email = payload.user_email or current_user.get("email")

    _persist_trip_to_db(
        session_id=session_id,
        user_id=user_id,
        user_email=user_email,
        origin=payload.origin,
        destination=payload.destination,
        start_date=payload.start_date,
        duration_days=payload.duration_days,
        total_budget=payload.total_budget,
        total_estimated=payload.total_estimated,
        budget_status=payload.budget_status,
        travel_style=payload.travel_style,
        markdown_plan=payload.markdown_plan,
        plan_payload=payload.plan_payload,
    )
    return {"status": "SUCCESS", "session_id": session_id}


@core_router.get("/trips/history", response_model=TripsHistoryResponse)
async def list_saved_trips(
    email: Optional[str] = Query(default=None, description="Optional email filter"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve persisted planned trips for the authenticated user or email."""
    user_id = current_user.get("user_id")
    auth_email = current_user.get("email")
    target_email = email or (auth_email if auth_email and "guest_user" not in str(auth_email) else None)

    query = db.query(SavedTripModel)
    if user_id and user_id != "guest_user" and target_email:
        clean_e = str(target_email).lower().strip()
        query = query.filter(
            (SavedTripModel.user_id == str(user_id)) | (SavedTripModel.user_email == clean_e)
        )
    elif target_email:
        query = query.filter(SavedTripModel.user_email == str(target_email).lower().strip())
    elif user_id and user_id != "guest_user":
        query = query.filter(SavedTripModel.user_id == str(user_id))
    else:
        return TripsHistoryResponse(status="SUCCESS", trips=[])

    rows = query.order_by(SavedTripModel.updated_at.desc()).limit(30).all()
    trips = [
        SavedTripRecord(
            session_id=r.session_id,
            origin=r.origin,
            destination=r.destination,
            start_date=r.start_date,
            duration_days=r.duration_days,
            total_budget=r.total_budget,
            total_estimated=r.total_estimated,
            budget_status=r.budget_status,
            travel_style=r.travel_style,
            markdown_plan=r.markdown_plan,
            created_at=r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat(),
        )
        for r in rows
    ]
    return TripsHistoryResponse(status="SUCCESS", trips=trips)


# 5. Rotating Travel News Newsletter Endpoints
@core_router.post("/newsletter/subscribe", response_model=NewsletterSubscribeResponse)
async def subscribe_newsletter(
    payload: NewsletterSubscribeRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    """
    Subscribes an email to the Wanderlust rotating travel newsletter (persisting in DB)
    and immediately dispatches a structured, styled RTL HTML digest with rotating news.
    Re-submitting an email rotates to the next editorial edition automatically.
    """
    clean_email = str(payload.email).lower().strip()
    now_utc = datetime.now(timezone.utc)

    subscriber = (
        db.query(NewsletterSubscriberModel)
        .filter(NewsletterSubscriberModel.email == clean_email)
        .first()
    )

    if subscriber:
        prev_count = subscriber.editions_sent or 0
        last_ed_id = subscriber.last_edition_id
        if payload.full_name:
            subscriber.full_name = payload.full_name
        if payload.interests:
            subscriber.interests_json = json.dumps(payload.interests, ensure_ascii=False)
        subscriber.is_active = True
    else:
        prev_count = 0
        last_ed_id = None
        subscriber = NewsletterSubscriberModel(
            email=clean_email,
            full_name=payload.full_name,
            preferred_language="he",
            interests_json=json.dumps(payload.interests or [], ensure_ascii=False),
            editions_sent=0,
            is_active=True,
        )
        db.add(subscriber)

    edition = select_rotating_edition(
        previous_editions_sent=prev_count,
        last_edition_id=last_ed_id,
    )
    new_edition_num = prev_count + 1
    dispatch_date_il = get_israeli_dispatch_date()

    subscriber.editions_sent = new_edition_num
    subscriber.last_edition_id = edition["edition_id"]
    subscriber.last_sent_at = now_utc
    db.commit()
    db.refresh(subscriber)

    frontend_url = email_service.resolve_frontend_url(http_request.headers.get("origin"))

    send_res = await email_service.send_newsletter_digest(
        recipient_email=clean_email,
        edition_data=edition,
        edition_number=new_edition_num,
        dispatch_date_il=dispatch_date_il,
        recipient_name=subscriber.full_name,
        frontend_url=frontend_url,
    )
    delivery_status = str(send_res.get("status", "simulated"))
    is_ok = delivery_status in ("sent", "simulated")

    headlines = [
        str((edition.get("breaking_story") or {}).get("title", "")),
        *[str(item.get("title", "")) for item in (edition.get("news_items") or []) if item.get("title")],
    ]

    if delivery_status == "sent":
        status_msg = f"מהדורה #{new_edition_num} ({edition['edition_badge']}) נשלחה בהצלחה לתיבת המייל שלך!"
    elif is_ok:
        status_msg = f"נרשמת בהצלחה! מהדורה #{new_edition_num} ({edition['edition_badge']}) הופקה (מצב סימולציה מקומי — הוסף RESEND_API_KEY לשליחה אמיתית)."
    else:
        status_msg = "ההרשמה נשמרה במסד הנתונים, אך אירעה תקלה בשליחת המייל דרך ספק הדואר."

    logger.info(
        f"Newsletter dispatch for {clean_email}: edition=#{new_edition_num} ({edition['edition_id']}), status={delivery_status}"
    )

    return NewsletterSubscribeResponse(
        status="SUCCESS" if is_ok else "PARTIAL",
        message=status_msg,
        email=clean_email,
        edition_number=new_edition_num,
        edition_id=edition["edition_id"],
        edition_badge=edition["edition_badge"],
        edition_title=edition["headline"],
        dispatch_date=dispatch_date_il,
        email_delivery_status=delivery_status,
        headlines=headlines,
        id=send_res.get("id"),
        preview_html=send_res.get("html_preview"),
    )


@core_router.get("/newsletter/preview")
async def preview_newsletter_edition(
    http_request: Request,
    edition_index: int = Query(default=0, ge=0),
    email: str = Query(default="traveler@wanderlust.ai"),
):
    """Preview any rotating newsletter edition JSON and rendered HTML."""
    edition = select_rotating_edition(previous_editions_sent=edition_index)
    dispatch_date_il = get_israeli_dispatch_date()
    edition_number = (edition_index % len(NEWSLETTER_EDITIONS)) + 1
    frontend_url = email_service.resolve_frontend_url(http_request.headers.get("origin"))
    html_preview = render_newsletter_html(
        recipient_email=email,
        edition_data=edition,
        edition_number=edition_number,
        dispatch_date_il=dispatch_date_il,
        frontend_url=frontend_url,
    )
    return {
        "status": "SUCCESS",
        "edition_number": edition_number,
        "total_editions": len(NEWSLETTER_EDITIONS),
        "dispatch_date": dispatch_date_il,
        "edition": edition,
        "html": html_preview,
    }


@core_router.get("/workspace/download-ics")
async def download_calendar_ics(
    destination: str,
    start_date: str = "2026-10-15",
    duration_days: int = 7,
    days: int | None = None,
):
    """
    Downloads full RFC 5545 iCalendar (.ics) file directly for importing into phone/calendar.
    Handles non-ASCII / Hebrew destination names safely according to RFC 5987.
    """
    from app.tools.calendar_tools import generate_trip_calendar_pack
    effective_days = days if days is not None else duration_days
    cal_pack = generate_trip_calendar_pack(destination, start_date, effective_days)

    # Safely format filename for Latin-1 HTTP header compatibility (RFC 5987)
    safe_ascii_name = "wanderlust_trip.ics"
    quoted_name = urllib.parse.quote(destination.strip().replace(" ", "_"))

    return Response(
        content=cal_pack["ical_data"].encode("utf-8"),
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_ascii_name}"; filename*=UTF-8\'\'{quoted_name}.ics',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )


# 6. RAG Knowledgebase & VectorStore Endpoints
@core_router.post("/knowledge/search", response_model=KnowledgeSearchResponse, status_code=200)
async def search_knowledge_endpoint(payload: KnowledgeSearchRequest):
    """Query the Wanderlust RAG VectorStore using bilingual Hebrew/English semantic similarity."""
    kb = get_knowledge_base()
    raw_matches = kb.retrieve(
        query=payload.query,
        destination=payload.destination,
        category=payload.category,
        top_k=payload.top_k,
    )
    matches = [KnowledgeChunkResult(**m) for m in raw_matches]
    return KnowledgeSearchResponse(
        status="SUCCESS",
        query=payload.query,
        destination=payload.destination,
        results_count=len(matches),
        matches=matches,
    )


@core_router.get("/knowledge/stats", response_model=KnowledgeStatsResponse, status_code=200)
async def knowledge_stats_endpoint():
    """Return index health, chunk count, vector dimensions, and covered destinations."""
    kb = get_knowledge_base()
    stats = kb.ensure_indexed()
    return KnowledgeStatsResponse(**stats)


@core_router.post("/knowledge/reindex", response_model=KnowledgeStatsResponse, status_code=200)
async def knowledge_reindex_endpoint():
    """Force full re-indexing (Loader -> Splitter -> Embedder -> VectorStore + SQLAlchemy)."""
    kb = get_knowledge_base()
    stats = kb.ensure_indexed(force=True)
    return KnowledgeStatsResponse(**stats)


# 7. Sprint 8 & 9 Endpoints: Replan, Group Split/Voting, Memory, Readiness & Ops
def _load_session_plan(session_id: str) -> Optional[Dict[str, Any]]:
    plan = _SESSION_PLANS.get(session_id)
    if plan:
        return plan
    try:
        with get_db_session() as db:
            row = db.query(SavedTripModel).filter(SavedTripModel.session_id == session_id).first()
            if row and row.plan_payload_json:
                parsed = json.loads(row.plan_payload_json)
                _SESSION_PLANS[session_id] = parsed
                return parsed
    except Exception:
        pass
    return None


@core_router.post("/trips/{session_id}/replan", response_model=TripReplanResponse, status_code=200)
async def replan_trip_day_endpoint(session_id: str, payload: TripReplanRequest):
    """Mutate a single day/slot in a planned trip and persist updated budget & .ics."""
    from app.tools.replan_tools import apply_itinerary_swap

    plan = _load_session_plan(session_id)
    if not plan:
        raise HTTPException(status_code=404, detail="סשן תכנון הטיול לא נמצא")
    res = apply_itinerary_swap(
        plan_payload=plan,
        day_number=payload.affected_day,
        slot=payload.slot,
        trigger_type=payload.trigger_type,
        constraint_note=payload.constraint_note or "",
    )
    updated = res["updated_plan"]
    _SESSION_PLANS[session_id] = updated
    _persist_trip_to_db(
        session_id=session_id,
        user_id=None,
        user_email=None,
        origin=str(updated.get("origin") or "TLV"),
        destination=str(updated.get("destination") or "Rome"),
        start_date=updated.get("start_date"),
        duration_days=int(updated.get("duration_days", 7)),
        total_budget=float(updated.get("total_budget", 2400.0)),
        total_estimated=float(updated.get("total_estimated", 0.0)),
        budget_status=str(updated.get("budget_status", "APPROVED")),
        travel_style=str(updated.get("travel_style", "balanced")),
        markdown_plan=str(updated.get("markdown_plan", "")),
        plan_payload=updated,
    )
    return TripReplanResponse(
        session_id=session_id,
        trigger_type=payload.trigger_type,
        diffs=res["diffs"],
        updated_plan=updated,
    )


@core_router.post("/trips/{session_id}/replan/stream")
async def replan_trip_day_stream_endpoint(session_id: str, payload: TripReplanRequest):
    """SSE stream for live day re-planning diff preview."""
    import asyncio
    from app.tools.replan_tools import apply_itinerary_swap

    plan = _load_session_plan(session_id)
    if not plan:
        raise HTTPException(status_code=404, detail="סשן תכנון הטיול לא נמצא")

    async def _stream():
        def fmt(ev: str, d: Dict[str, Any]) -> str:
            return f"event: {ev}\ndata: {json.dumps(d, ensure_ascii=False)}\n\n"

        yield fmt("step", {
            "agent": "trip_disruption_replan_agent",
            "stage": "REPLAN",
            "message": f"מחשב חלופה ליום {payload.affected_day} ({payload.slot}) לפי אילוץ: {payload.trigger_type}...",
        })
        await asyncio.sleep(0.15)
        res = apply_itinerary_swap(
            plan_payload=plan,
            day_number=payload.affected_day,
            slot=payload.slot,
            trigger_type=payload.trigger_type,
            constraint_note=payload.constraint_note or "",
        )
        updated = res["updated_plan"]
        _SESSION_PLANS[session_id] = updated
        yield fmt("diff", {"diffs": res["diffs"]})
        yield fmt("done", {"session_id": session_id, "diffs": res["diffs"], "updated_plan": updated})

    return StreamingResponse(_stream(), media_type="text/event-stream")


@core_router.post("/trips/{session_id}/group-split", status_code=200)
async def group_split_endpoint(session_id: str, payload: GroupSplitRequest):
    """Compute multi-traveler cost split & Bit/PayBox settlement ledger for an existing plan."""
    from app.tools.group_split_tools import compute_group_cost_split

    plan = _load_session_plan(session_id) or {}
    profiles = [p.model_dump() for p in payload.traveler_profiles] if payload.traveler_profiles else None
    raw = compute_group_cost_split(
        travelers=payload.travelers,
        flight_cost_per_trip=float(plan.get("flight_cost", 550.0)),
        hotel_cost_total=float(plan.get("hotel_cost", 700.0)),
        activities_cost_total=float(plan.get("activities_cost", 150.0)),
        duration_days=int(plan.get("duration_days", 7)),
        traveler_profiles=profiles,
    )
    return json.loads(raw)


@core_router.post("/trips/{session_id}/vote", status_code=201)
async def trip_vote_endpoint(session_id: str, payload: TripVoteRequest, db: Session = Depends(get_db)):
    """Cast a collaborative group vote on a flight, hotel, or activity."""
    row = TripVoteModel(
        session_id=session_id,
        voter_name=payload.voter_name,
        item_type=payload.item_type,
        item_id=payload.item_id,
        vote=payload.vote,
        comment=payload.comment,
    )
    db.add(row)
    db.commit()
    votes = db.query(TripVoteModel).filter(TripVoteModel.session_id == session_id).all()
    return {
        "status": "RECORDED",
        "session_id": session_id,
        "total_votes": len(votes),
        "votes": [
            {"voter_name": v.voter_name, "item_type": v.item_type, "item_id": v.item_id, "vote": v.vote, "comment": v.comment}
            for v in votes
        ],
    }


@core_router.get("/trips/{session_id}/votes", status_code=200)
async def get_trip_votes_endpoint(session_id: str, db: Session = Depends(get_db)):
    votes = db.query(TripVoteModel).filter(TripVoteModel.session_id == session_id).all()
    return {
        "session_id": session_id,
        "total_votes": len(votes),
        "votes": [
            {"voter_name": v.voter_name, "item_type": v.item_type, "item_id": v.item_id, "vote": v.vote, "comment": v.comment}
            for v in votes
        ],
    }


@core_router.get("/profile/preferences", status_code=200)
async def get_profile_preferences_endpoint(current_user: dict = Depends(get_current_user)):
    from app.tools.memory_tools import load_traveler_memory

    return load_traveler_memory(current_user.get("user_id"))


@core_router.put("/profile/preferences", status_code=200)
async def update_profile_preferences_endpoint(
    payload: TravelerPreferencesPayload,
    current_user: dict = Depends(get_current_user),
):
    from app.tools.memory_tools import update_traveler_memory

    uid = str(current_user.get("user_id") or "guest_user")
    return update_traveler_memory(uid, payload.model_dump(exclude_unset=True))


@core_router.post("/knowledge/ingest-personal", status_code=201)
async def ingest_personal_knowledge_endpoint(
    payload: PersonalKnowledgeIngestRequest,
    current_user: dict = Depends(get_current_user),
):
    from app.tools.memory_tools import ingest_user_travel_document

    uid = str(current_user.get("user_id") or "guest_user")
    return ingest_user_travel_document(
        user_id=uid,
        title=payload.title,
        content=payload.content,
        destination=payload.destination,
        doc_type=payload.doc_type,
    )


@core_router.get("/bookings/{booking_ref}/readiness", status_code=200)
async def booking_readiness_endpoint(booking_ref: str, db: Session = Depends(get_db)):
    from app.tools.concierge_tools import build_pre_departure_timeline

    booking = db.query(BookingModel).filter(BookingModel.booking_ref == booking_ref).first()
    if not booking:
        raise HTTPException(status_code=404, detail="הזמנה לא נמצאה")
    return build_pre_departure_timeline(
        booking_ref=booking.booking_ref,
        destination=booking.destination,
        duration_days=booking.duration_days,
        total_amount=booking.total_amount,
    )


@core_router.get("/ops/live-pulse", status_code=200)
async def ops_live_pulse_endpoint():
    """Live TLV Hub FX rates (Frankfurter) + terminal advisory pulse."""
    from app.tools.budget_tools import _fetch_frankfurter_rates, EXCHANGE_RATES

    fx = await _fetch_frankfurter_rates("USD") or dict(EXCHANGE_RATES)
    return {
        "status": "LIVE",
        "hub": "TLV (Ben Gurion Terminal 3)",
        "recommended_arrival_hours": 3.0,
        "fx_rates": fx,
        "routes_highlight": [
            {"route": "TLV ⇄ HND", "note": "טוקיו • ישיר / 1 עצירה"},
            {"route": "TLV ⇄ FCO", "note": "רומא • טיסות יומיות"},
            {"route": "TLV ⇄ JTR", "note": "סנטוריני • עונתי ישיר"},
        ],
    }


@core_router.get("/ops/metrics", status_code=200)
async def ops_metrics_endpoint(db: Session = Depends(get_db)):
    """Operational telemetry & database posture."""
    from app.db.database import get_active_db_backend

    return {
        "db_backend": get_active_db_backend(),
        "agents_registered": 32,
        "cached_sessions": len(_SESSION_PLANS),
        "saved_trips_count": db.query(SavedTripModel).count(),
        "bookings_count": db.query(BookingModel).count(),
        "knowledge_chunks_count": get_knowledge_base().get_stats().get("chunks_indexed", 0),
        "pending_actions_count": db.query(PendingActionModel).filter(PendingActionModel.status == "pending_approval").count(),
    }


router = APIRouter(prefix="/v1", tags=["Travel Planner Multi-Agent"])
router.include_router(core_router)
