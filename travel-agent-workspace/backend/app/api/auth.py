import uuid
from typing import Dict
from fastapi import APIRouter, HTTPException, status, Depends
from app.api.schemas import UserCreate, UserLogin, UserResponse, Token
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory user database for plug-and-play simplicity and testing
USERS_DB: Dict[str, Dict[str, str]] = {
    "demo@travelplanner.ai": {
        "id": "usr_demo123",
        "email": "demo@travelplanner.ai",
        "hashed_password": get_password_hash("password123"),
        "full_name": "Demo Traveler",
        "role": "user",
    }
}


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    """Register a new user account and return a signed JWT access token."""
    email_key = user_in.email.lower()
    if email_key in USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    hashed_pwd = get_password_hash(user_in.password)

    user_record = {
        "id": user_id,
        "email": email_key,
        "hashed_password": hashed_pwd,
        "full_name": user_in.full_name or email_key.split("@")[0].title(),
        "role": "user",
    }
    USERS_DB[email_key] = user_record

    access_token = create_access_token(data={"sub": user_id, "email": email_key, "role": "user"})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            email=user_record["email"],
            full_name=user_record["full_name"],
            role=user_record["role"],
        ),
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Authenticate with email and password to receive a JWT access token."""
    email_key = credentials.email.lower()
    user_record = USERS_DB.get(email_key)

    if not user_record or not verify_password(credentials.password, user_record["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user_record["id"], "email": user_record["email"], "role": user_record["role"]}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user_record["id"],
            email=user_record["email"],
            full_name=user_record["full_name"],
            role=user_record["role"],
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve details of the currently authenticated user."""
    user_id = current_user.get("user_id", "guest_user")
    email = current_user.get("sub", "guest@travelplanner.ai")

    # Look up in DB or return user context
    for u in USERS_DB.values():
        if u["id"] == user_id:
            return UserResponse(
                id=u["id"],
                email=u["email"],
                full_name=u["full_name"],
                role=u["role"],
            )

    return UserResponse(
        id=user_id,
        email=email if "@" in email else f"{email}@travelplanner.ai",
        full_name="Active Traveler",
        role=current_user.get("role", "guest"),
    )
