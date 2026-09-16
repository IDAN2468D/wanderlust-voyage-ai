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
        return self.start_date or self.departure_date or "2026-10-15"

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


class WorkspaceCalendarSyncRequest(BaseModel):
    """Payload for generating Google Calendar event links and iCal schedule."""

    destination: str
    start_date: str
    duration_days: int
    flight_number: Optional[str] = "LY-081"
    hotel_name: Optional[str] = None


class WorkspaceCalendarSyncResponse(BaseModel):
    """Response containing one-click Google Calendar URL and downloadable iCal (.ics) payload."""

    google_calendar_url: str
    event_title: str
    event_details: str
    location: str
    ical_data: str


class WorkspaceGmailBriefingRequest(BaseModel):
    """Payload for dispatching an email briefing via Google Flow MCP / Gmail."""

    destination: str
    duration_days: int
    recipient_email: EmailStr
    markdown_plan: str
    total_estimated_usd: float


class WorkspaceGmailBriefingResponse(BaseModel):
    """Response confirming email briefing preparation."""

    status: str
    recipient: str
    subject: str
    html_preview: str


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


class Token(BaseModel):
    """JWT bearer token model."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Payload stored within the JWT token."""

    sub: Optional[str] = None
    role: Optional[str] = None
