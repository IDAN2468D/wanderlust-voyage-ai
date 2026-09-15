from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr


class TripPlanRequest(BaseModel):
    """Payload for submitting a trip planning request."""

    origin: str = Field(default="TLV", description="Departure city or airport code (e.g., 'TLV', 'JFK', 'LHR')")
    destination: str = Field(..., description="Target destination city (e.g., 'Rome', 'Paris', 'Tokyo')")
    start_date: str = Field(..., description="Departure date in YYYY-MM-DD format")
    duration_days: int = Field(default=5, ge=1, le=30, description="Duration of the trip in days")
    total_budget: float = Field(default=2000.0, gt=0, description="Total budget in USD for the entire trip")
    interests: List[str] = Field(
        default_factory=lambda: ["History", "Food & Dining", "Culture"],
        description="List of traveler interest categories",
    )
    travel_style: str = Field(default="balanced", description="Travel style: 'budget', 'balanced', or 'luxury'")
    session_id: Optional[str] = Field(default=None, description="Optional existing session ID for conversation memory")


class TripPlanResponse(BaseModel):
    """Detailed response containing the synthesized markdown plan and key financial metrics."""

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
