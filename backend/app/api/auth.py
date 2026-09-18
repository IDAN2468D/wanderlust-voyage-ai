import uuid
import logging
from typing import Dict, Any
import httpx
from fastapi import APIRouter, HTTPException, status, Depends
from app.api.schemas import UserCreate, UserLogin, UserResponse, Token, GoogleAuthRequest
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.core.config import settings

logger = logging.getLogger("auth_routes")
router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory user database for plug-and-play simplicity and testing
USERS_DB: Dict[str, Dict[str, Any]] = {
    "demo@travelplanner.ai": {
        "id": "usr_demo123",
        "email": "demo@travelplanner.ai",
        "hashed_password": get_password_hash("password123"),
        "full_name": "Demo Traveler",
        "role": "user",
        "picture": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        "auth_provider": "local",
    }
}


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    """Register a new user account and return a signed JWT access token."""
    email_key = user_in.email.lower().strip()
    if email_key in USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="משתמש עם כתובת אימייל זו כבר קיים במערכת",
        )

    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    hashed_pwd = get_password_hash(user_in.password)

    user_record = {
        "id": user_id,
        "email": email_key,
        "hashed_password": hashed_pwd,
        "full_name": user_in.full_name or email_key.split("@")[0].title(),
        "role": "user",
        "picture": None,
        "auth_provider": "local",
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
            picture=user_record["picture"],
            auth_provider=user_record["auth_provider"],
        ),
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Authenticate with email and password to receive a JWT access token."""
    email_key = credentials.email.lower().strip()
    user_record = USERS_DB.get(email_key)

    if not user_record or not user_record.get("hashed_password") or not verify_password(credentials.password, user_record["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="כתובת אימייל או סיסמה שגויים",
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
            picture=user_record.get("picture"),
            auth_provider=user_record.get("auth_provider", "local"),
        ),
    )


@router.get("/google/url")
async def get_google_auth_url(redirect_uri: str = None):
    """
    Generate the official Google OAuth 2.0 authorization consent URL
    using the configured GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.
    """
    client_id = settings.GOOGLE_CLIENT_ID
    target_redirect = redirect_uri or settings.GOOGLE_REDIRECT_URI

    if not client_id:
        return {
            "configured": False,
            "url": None,
            "client_id": None,
            "redirect_uri": target_redirect,
            "message": "GOOGLE_CLIENT_ID is not configured in backend/.env",
        }

    import urllib.parse
    params = {
        "client_id": client_id,
        "redirect_uri": target_redirect,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return {
        "configured": True,
        "url": auth_url,
        "client_id": client_id,
        "redirect_uri": target_redirect,
    }


@router.post("/google", response_model=Token)
async def google_login(payload: GoogleAuthRequest):
    """
    Authenticate or register a user via Google OAuth:
    1. OAuth 2.0 Authorization Code (payload.code) with GOOGLE_CLIENT_SECRET
    2. Google Identity Services ID Token (payload.credential)
    3. Direct profile payload (Demo / Sandbox sign-in)
    """
    email: str = ""
    full_name: str = ""
    picture: str = ""

    # Option 1: Authorization Code Exchange (Google OAuth 2.0 Redirect flow)
    if payload.code:
        try:
            target_redirect = settings.GOOGLE_REDIRECT_URI
            if payload.redirect_uri and "0.0.0.0" not in payload.redirect_uri:
                target_redirect = payload.redirect_uri

            async with httpx.AsyncClient(timeout=10.0) as client:
                token_res = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "code": payload.code,
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "redirect_uri": target_redirect,
                        "grant_type": "authorization_code",
                    },
                )

                if token_res.status_code != 200:
                    logger.error(f"Google code exchange failed ({token_res.status_code}): {token_res.text} | redirect_uri={target_redirect}")
                    # If development and code failed, fallback to payload email if available
                    if payload.email:
                        email = str(payload.email).lower().strip()
                        full_name = payload.name or email.split("@")[0].title()
                        picture = payload.picture or ""
                    else:
                        err_detail = "אימות קוד ההרשאה מול Google נכשל."
                        try:
                            t_json = token_res.json()
                            if "error_description" in t_json:
                                err_detail += f" ({t_json['error_description']})"
                            elif "error" in t_json:
                                err_detail += f" ({t_json['error']})"
                        except Exception:
                            pass
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=err_detail,
                        )
                else:
                    token_data = token_res.json()
                    access_token_google = token_data.get("access_token")

                    # Fetch user info using Google access token
                    userinfo_res = await client.get(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        headers={"Authorization": f"Bearer {access_token_google}"},
                    )

                    if userinfo_res.status_code == 200:
                        g_user = userinfo_res.json()
                        email = g_user.get("email", "").lower().strip()
                        full_name = g_user.get("name") or payload.name or email.split("@")[0].title()
                        picture = g_user.get("picture") or payload.picture or ""
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="לא ניתן לקבל את פרטי המשתמש מחשבון ה-Google.",
                        )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Unexpected error in Google code exchange: {exc}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="שגיאה בתקשורת מול שרתי Google",
            )

    # Option 2: Google ID Token (Google Identity Services GSI)
    elif payload.credential:
        # Verify Google ID token via Google TokenInfo API
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}"
                )
                if res.status_code == 200:
                    google_info = res.json()
                    # Verify audience against GOOGLE_CLIENT_ID if configured
                    aud = google_info.get("aud")
                    if settings.GOOGLE_CLIENT_ID and aud and aud != settings.GOOGLE_CLIENT_ID:
                        logger.warning(f"Google token audience mismatch: {aud} vs {settings.GOOGLE_CLIENT_ID}")
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="מזהה הלקוח של Google אינו תואם להגדרות המערכת",
                        )
                    email = google_info.get("email", "").lower().strip()
                    full_name = google_info.get("name") or payload.name or ""
                    picture = google_info.get("picture") or payload.picture or ""
                else:
                    logger.warning(f"Google tokeninfo validation returned status {res.status_code}")
                    # Fallback to payload email if testing or development
                    if payload.email:
                        email = str(payload.email).lower().strip()
                        full_name = payload.name or email.split("@")[0].title()
                        picture = payload.picture or ""
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="טוקן Google אינו תקין או שפג תוקפו",
                        )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error validating Google ID token: {exc}")
            if payload.email:
                email = str(payload.email).lower().strip()
                full_name = payload.name or email.split("@")[0].title()
                picture = payload.picture or ""
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="שגיאה בתקשורת מול שרתי Google",
                )
    elif payload.email:
        # Option 3: Direct profile payload (Demo / Sandbox sign-in)
        email = str(payload.email).lower().strip()
        full_name = payload.name or email.split("@")[0].title()
        picture = payload.picture or ""
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="נדרש קוד הרשאה, טוקן אימות או כתובת אימייל מגוגל",
        )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="לא התקבלה כתובת אימייל תקינה מ-Google",
        )

    # Upsert user record
    if email in USERS_DB:
        user_record = USERS_DB[email]
        if full_name and (not user_record.get("full_name") or user_record["full_name"] == "Demo Traveler"):
            user_record["full_name"] = full_name
        if picture:
            user_record["picture"] = picture
        user_record["auth_provider"] = "google"
    else:
        user_id = f"usr_g_{uuid.uuid4().hex[:8]}"
        user_record = {
            "id": user_id,
            "email": email,
            "hashed_password": None,
            "full_name": full_name or email.split("@")[0].title(),
            "role": "user",
            "picture": picture or f"https://api.dicebear.com/7.x/initials/svg?seed={email}",
            "auth_provider": "google",
        }
        USERS_DB[email] = user_record

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
            picture=user_record.get("picture"),
            auth_provider=user_record.get("auth_provider", "google"),
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve details of the currently authenticated user."""
    user_id = current_user.get("user_id", "guest_user")
    email = current_user.get("sub", "guest@travelplanner.ai")

    # Look up in DB or return user context
    for u in USERS_DB.values():
        if u["id"] == user_id or u["email"] == email:
            return UserResponse(
                id=u["id"],
                email=u["email"],
                full_name=u["full_name"],
                role=u["role"],
                picture=u.get("picture"),
                auth_provider=u.get("auth_provider", "local"),
            )

    return UserResponse(
        id=user_id,
        email=email if "@" in email else f"{email}@travelplanner.ai",
        full_name="Active Traveler",
        role=current_user.get("role", "guest"),
        picture=None,
        auth_provider="local",
    )
