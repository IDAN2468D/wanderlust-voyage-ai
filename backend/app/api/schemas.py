from datetime import date, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr


class TripPlanRequest(BaseModel):
    """Payload for submitting a trip planning request."""

    origin: str = Field(default="TLV", description="Departure city or airport code (e.g., 'TLV', 'JFK', 'LHR')")
    destination: str = Field(..., description="Target destination city (e.g., 'Bali', 'Santorini', 'Rome')")
    start_date: Optional[str] = Field(default=None, description="Departure date in YYYY-MM-DD format")
    departure_date: Optional[str] = Field(default=None, description="Alternative field for departure date (SPEC.md adherence)")
    return_date: Optional[str] = Field(default=None, description="Optional return date in YYYY-MM-DD format")
    duration_days: int = Field(default=7, ge=1, le=30, description="Duration of the trip in days")
    total_budget: Optional[float] = Field(default=None, description="Total budget in USD for the entire trip")
    budget: Optional[float] = Field(default=None, description="Alternative field for budget (SPEC.md adherence)")
    currency: str = Field(default="USD", description="Currency code ('USD', 'ILS', 'EUR', 'GBP')")
    travelers: int = Field(default=2, ge=1, le=20, description="Number of travelers")
    interests: List[str] = Field(
        default_factory=lambda: ["History", "Food & Dining", "Culture"],
        description="List of traveler interest categories",
    )
    travel_style: str = Field(default="balanced", description="Travel style: 'budget', 'balanced', or 'luxury'")
    session_id: Optional[str] = Field(default=None, description="Optional existing session ID for conversation memory")

    def get_effective_start_date(self) -> str:
        default_date = (date.today() + timedelta(days=30)).strftime("%Y-%m-%d")
        return self.start_date or self.departure_date or default_date

    def get_effective_budget(self) -> float:
        if self.total_budget is not None and self.total_budget > 0:
            return float(self.total_budget)
        if self.budget is not None and self.budget > 0:
            return float(self.budget)
        return 2400.0


class TripPlanResponse(BaseModel):
    """Detailed response containing the synthesized markdown plan, financial metrics, and specialist data."""

    session_id: str
    destination: str
    duration_days: int
    total_budget: float
    total_estimated: float
    remaining_balance: float
    budget_status: str
    flight_cost: float
    hotel_cost: float
    activities_cost: float
    markdown_plan: str
    itemized_breakdown: Dict[str, Any]
    weather_metrics: Optional[Dict[str, Any]] = None
    packing_checklist: Optional[List[Dict[str, Any]]] = None
    safety_info: Optional[Dict[str, Any]] = None
    seasonal_events: Optional[Dict[str, Any]] = None
    structured_days: Optional[List[Dict[str, Any]]] = None
    recommended_flight: Optional[Dict[str, Any]] = None
    selected_hotel: Optional[Dict[str, Any]] = None
    start_date_formatted: Optional[str] = None
    transit_guide: Optional[Dict[str, Any]] = None
    culinary_guide: Optional[Dict[str, Any]] = None
    shopping_taxfree: Optional[Dict[str, Any]] = None
    calendar_events: Optional[Dict[str, Any]] = None
    ground_alerts: Optional[Dict[str, Any]] = None
    whatsapp_briefings: Optional[Dict[str, Any]] = None
    budget_overrun_flagged: Optional[bool] = False
    guardrail_warnings: Optional[List[str]] = None


class TripChatRequest(BaseModel):
    """Payload for multi-turn conversational travel planning."""

    session_id: str = Field(..., min_length=1, description="Session identifier for short/long-term memory")
    message: str = Field(..., min_length=1, description="Traveler follow-up message or refinement request")


class TripChatResponse(BaseModel):
    """Response from multi-turn conversational travel assistant."""

    session_id: str
    reply: str
    updated_plan: Optional[TripPlanResponse] = None


class WorkspaceCalendarSyncRequest(BaseModel):
    """Payload for generating Google Calendar event links and iCal schedule."""

    destination: str
    start_date: str
    duration_days: int
    flight_number: Optional[str] = "LY-081"
    hotel_name: Optional[str] = None
    require_approval: bool = False


class WorkspaceCalendarSyncResponse(BaseModel):
    """Response containing one-click Google Calendar URL and downloadable iCal (.ics) payload."""

    status: str = "SUCCESS"
    action_id: Optional[str] = None
    google_calendar_url: Optional[str] = None
    event_title: Optional[str] = None
    event_details: Optional[str] = None
    location: Optional[str] = None
    ical_data: Optional[str] = None


class WorkspaceGmailBriefingRequest(BaseModel):
    """Payload for dispatching an email briefing via Google Flow MCP / Gmail."""

    destination: str
    duration_days: int
    recipient_email: EmailStr
    markdown_plan: str
    total_estimated_usd: float
    require_approval: bool = False


class WorkspaceGmailBriefingResponse(BaseModel):
    """Response confirming email briefing preparation."""

    status: str
    action_id: Optional[str] = None
    recipient: str
    subject: str
    html_preview: str


class ApproveActionRequest(BaseModel):
    """Payload for Human-In-The-Loop approval or cancellation of pending external actions."""

    action_id: str = Field(..., min_length=1, description="Pending action ID")
    approved: bool = Field(..., description="True to execute action, False to cancel")


class ApproveActionResponse(BaseModel):
    """Response after approving or cancelling a pending external action."""

    action_id: str
    status: str
    action_type: str
    result: Optional[Dict[str, Any]] = None


class WorkspaceDocExportRequest(BaseModel):
    """Payload for exporting trip plan to Google Drive / Google Docs."""

    destination: str
    duration_days: int
    markdown_plan: str


class WorkspaceDocExportResponse(BaseModel):
    """Response containing exported document metadata and Google Drive bridge payload."""

    status: str
    document_title: str
    google_docs_url: str
    formatted_content: str


class UserCreate(BaseModel):
    """Registration request model."""

    email: EmailStr
    password: str = Field(..., min_length=6, description="Password (minimum 6 characters)")
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    """Login request model."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Public user profile model."""

    id: str
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "user"
    picture: Optional[str] = None
    auth_provider: str = "local"


class GoogleAuthRequest(BaseModel):
    """Google OAuth authentication request payload."""

    credential: Optional[str] = Field(default=None, description="Google ID token (JWT) from Google Identity Services")
    code: Optional[str] = Field(default=None, description="Google OAuth 2.0 authorization code from redirect callback")
    redirect_uri: Optional[str] = Field(default=None, description="OAuth redirect URI matching the request")
    email: Optional[EmailStr] = Field(default=None, description="Email address provided by Google profile")
    name: Optional[str] = Field(default=None, description="Full name provided by Google profile")
    picture: Optional[str] = Field(default=None, description="Profile avatar URL from Google")


class Token(BaseModel):
    """JWT bearer token model."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Payload stored within the JWT token."""

    sub: Optional[str] = None
    role: Optional[str] = None


# ==============================================================================
# TLV Holiday Flight Board Schemas (Skill: tlv-holiday-flight-board)
# ==============================================================================

class TLVHolidayFlightBoardRequest(BaseModel):
    """Payload for generating a live Ben Gurion departure flight board for holidays."""

    holiday_name_or_key: Optional[str] = Field(
        default=None,
        description="Holiday name ('pesach', 'sukkot', 'summer', 'shavuot', 'hanukkah') or None for custom dates",
    )
    destination: Optional[str] = Field(
        default="anywhere",
        description="Target destination (city, IATA code, or 'anywhere' / 'לכל יעד זול')",
    )
    depart_date: Optional[str] = Field(
        default=None,
        description="Departure date YYYY-MM-DD (overrides canonical holiday window if provided)",
    )
    return_date: Optional[str] = Field(
        default=None,
        description="Return date YYYY-MM-DD (overrides canonical holiday window if provided)",
    )
    adults: int = Field(default=1, ge=1, le=10, description="Number of adult passengers")
    children: int = Field(default=0, ge=0, le=10, description="Number of children passengers")
    infants: int = Field(default=0, ge=0, le=5, description="Number of infants (under 2 years)")
    checked_bag_needed: bool = Field(default=True, description="Whether checked baggage is required")
    nonstop_only: bool = Field(default=False, description="Filter for direct / nonstop flights only")
    budget_ceiling_nis: Optional[float] = Field(default=None, ge=0, description="Optional maximum budget per person in NIS")
    session_id: Optional[str] = Field(default=None, description="Optional session tracking ID")


class TLVHolidayFlightOption(BaseModel):
    """Individual flight option in the departure board."""

    rank: int
    airline: str
    tier_name: str
    flight_number: str
    route: str
    destination_name: str
    destination_code: str
    stops: int
    stops_text: str
    depart_time: str
    return_time: str
    depart_date: str
    return_date: str
    duration: str
    base_fare_usd: float
    base_fare_nis: int
    bag_fee_nis: int
    bag_included: bool
    true_total_nis: int
    family_total_nis: int
    cost_math: Dict[str, Any]
    source: str
    booking_url: str
    shabbat_compliant: bool


class TLVHolidayFlightBoardResponse(BaseModel):
    """Full flight departure board response for a holiday period."""

    holiday: Dict[str, Any]
    shabbat_audit: Dict[str, Any]
    search_links: Dict[str, str]
    passengers: Dict[str, Any]
    rates_disclaimer: Dict[str, Any]
    top_picks: Dict[str, Optional[TLVHolidayFlightOption]]
    board_flights: List[TLVHolidayFlightOption]
    holiday_warnings: List[str]


# ==============================================================================
# Resend Email Integration Schemars
# ==============================================================================

class EmailDispatchResponse(BaseModel):
    """Generic response for email dispatch requests."""

    status: str
    message: str
    id: Optional[str] = None
    recipient: Optional[str] = None


class SendFlightBoardEmailRequest(BaseModel):
    """Payload for emailing a TLV holiday flight board to a user."""

    recipient_email: EmailStr
    holiday_name: str
    flights: List[Dict[str, Any]]
    search_links: Optional[Dict[str, str]] = None


class ForgotPasswordRequest(BaseModel):
    """Payload for requesting a password reset email."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Payload for setting a new password using a reset token."""

    token: str
    new_password: str = Field(..., min_length=6, description="New password (minimum 6 characters)")


class ContactInquiryRequest(BaseModel):
    """Payload for user contact and feedback submissions."""

    name: str = Field(..., min_length=2, description="Sender name")
    email: EmailStr
    subject: str = Field(..., min_length=2, description="Message subject")
    message: str = Field(..., min_length=5, description="Message content")


class BookingConfirmationRequest(BaseModel):
    """Payload for dispatching an official booking confirmation email and persisting booking."""

    booking_ref: str = Field(..., description="Unique booking reference code (e.g. 'WNDR-824192')")
    destination: str = Field(..., description="Destination name")
    duration_days: int = Field(..., ge=1, description="Duration of stay in days")
    total_amount: float = Field(..., ge=0, description="Total amount charged")
    currency: str = Field(default="USD", description="Currency of payment (ILS, USD, EUR)")
    recipient_email: EmailStr = Field(..., description="Customer email address")
    customer_name: Optional[str] = Field(default=None, description="Customer full name")
    customer_phone: Optional[str] = Field(default=None, description="Customer mobile phone")
    passport_number: Optional[str] = Field(default=None, description="Customer passport number")
    flight_portion: Optional[float] = Field(default=None, description="Flight cost portion")
    hotel_portion: Optional[float] = Field(default=None, description="Hotel cost portion")
    payment_method: Optional[str] = Field(default="card", description="Payment method used")
    installments: Optional[int] = Field(default=1, ge=1, le=24, description="Number of payment installments")


class BookingRecordResponse(BaseModel):
    """Persisted booking record returned from the database."""

    booking_ref: str
    destination: str
    duration_days: int
    total_amount: float
    currency: str
    recipient_email: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    payment_method: str = "card"
    installments: int = 1
    booking_date: str
    status: str = "CONFIRMED"
    flight_portion: Optional[float] = None
    hotel_portion: Optional[float] = None


class BookingsListResponse(BaseModel):
    """List of persisted bookings for a user."""

    status: str = "SUCCESS"
    bookings: List[BookingRecordResponse]


class TripSaveRequest(BaseModel):
    """Payload for saving or updating a planned itinerary in the database."""

    session_id: Optional[str] = None
    origin: str = "TLV"
    destination: str
    start_date: Optional[str] = None
    duration_days: int = Field(default=7, ge=1, le=30)
    total_budget: float = 2400.0
    total_estimated: float = 2400.0
    budget_status: str = "APPROVED"
    travel_style: str = "balanced"
    markdown_plan: str = ""
    plan_payload: Optional[Dict[str, Any]] = None
    user_email: Optional[str] = None


class SavedTripRecord(BaseModel):
    """Persisted trip summary record."""

    session_id: str
    origin: str
    destination: str
    start_date: Optional[str] = None
    duration_days: int
    total_budget: float
    total_estimated: float
    budget_status: str
    travel_style: str
    markdown_plan: str
    created_at: str


class TripsHistoryResponse(BaseModel):
    """List of persisted planned trips."""

    status: str = "SUCCESS"
    trips: List[SavedTripRecord]


class NewsletterSubscribeRequest(BaseModel):
    """Payload for subscribing to the rotating travel news newsletter."""

    email: EmailStr
    full_name: Optional[str] = None
    interests: List[str] = Field(default_factory=list)


class NewsletterSubscribeResponse(BaseModel):
    """Response after subscribing and dispatching a rotating newsletter edition."""

    status: str
    message: str
    email: EmailStr
    edition_number: int
    edition_id: str
    edition_badge: str
    edition_title: str
    dispatch_date: str
    email_delivery_status: str
    headlines: List[str]
    id: Optional[str] = None
    preview_html: Optional[str] = None
