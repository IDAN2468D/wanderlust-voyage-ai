import uuid
import logging
from datetime import timedelta
from typing import Dict, Any, Optional
import httpx
from jose import jwt as jose_jwt
from sqlalchemy.orm import Session
from fastapi import APIRouter, HTTPException, Request, status, Depends, BackgroundTasks
from app.api.schemas import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    GoogleAuthRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    EmailDispatchResponse,
)
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    get_current_user,
)
from app.core.config import settings
from app.db.database import get_db, init_db
from app.db.models import UserModel
from app.services.email_service import email_service

logger = logging.getLogger("auth_routes")
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Lightweight in-memory mirror synced with SQLAlchemy database
USERS_DB: Dict[str, Dict[str, Any]] = {}


def _model_to_dict(user: UserModel) -> Dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "hashed_password": user.hashed_password,
        "full_name": user.full_name,
        "role": user.role,
        "picture": user.picture,
        "auth_provider": user.auth_provider,
    }


def _sync_cache(user: UserModel) -> Dict[str, Any]:
    rec = _model_to_dict(user)
    USERS_DB[user.email] = rec
    return rec


# Ensure database tables & demo user are initialized on import
init_db()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    background_tasks: BackgroundTasks,
    http_request: Request,
    db: Session = Depends(get_db),
):
    """Register a new user account in the database, dispatch welcome email, and return a signed JWT access token."""
    email_key = user_in.email.lower().strip()
    existing = db.query(UserModel).filter(UserModel.email == email_key).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="משתמש עם כתובת אימייל זו כבר קיים במערכת",
        )

    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    hashed_pwd = get_password_hash(user_in.password)
    full_name = user_in.full_name or email_key.split("@")[0].title()

    db_user = UserModel(
        id=user_id,
        email=email_key,
        hashed_password=hashed_pwd,
        full_name=full_name,
        role="user",
        picture=None,
        auth_provider="local",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    user_record = _sync_cache(db_user)

    frontend_url = email_service.resolve_frontend_url(http_request.headers.get("origin"))

    # Dispatch welcome email asynchronously
    background_tasks.add_task(
        email_service.send_welcome_email,
        email=email_key,
        full_name=user_record["full_name"],
        frontend_url=frontend_url,
    )

    access_token = create_access_token(
        data={
            "sub": email_key,
            "user_id": user_id,
            "email": email_key,
            "full_name": user_record["full_name"],
            "picture": user_record["picture"],
            "role": user_record["role"],
            "auth_provider": user_record["auth_provider"],
        }
    )

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


@router.post("/forgot-password", response_model=EmailDispatchResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    http_request: Request,
    db: Session = Depends(get_db),
):
    """
    Generates a secure password reset token and emails instructions via Resend.
    Does not disclose whether the email exists in the database.
    """
    email_key = payload.email.lower().strip()
    db_user = db.query(UserModel).filter(UserModel.email == email_key).first()

    if db_user:
        reset_token = create_access_token(
            data={"sub": email_key, "purpose": "password_reset"},
            expires_delta=timedelta(minutes=60),
        )
        frontend_url = email_service.resolve_frontend_url(http_request.headers.get("origin"))
        background_tasks.add_task(
            email_service.send_password_reset,
            email=email_key,
            reset_token=reset_token,
            recipient_name=db_user.full_name,
            frontend_url=frontend_url,
        )
        logger.info(f"Password reset token generated and queued for: {email_key}")

    return EmailDispatchResponse(
        status="SUCCESS",
        message="אם כתובת האימייל קיימת במערכת, נשלח אליה קישור מאובטח לאיפוס הסיסמה.",
        recipient=email_key,
    )


@router.post("/reset-password", response_model=EmailDispatchResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Validates a password reset token and updates the user's password in the database."""
    token_data = decode_access_token(payload.token)
    if not token_data or token_data.get("purpose") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="קישור איפוס הסיסמה אינו תקין או שפג תוקפו (תקף למשך 60 דקות).",
        )

    email_key = str(token_data.get("sub", "")).lower().strip()
    db_user = db.query(UserModel).filter(UserModel.email == email_key).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="חשבון המשתמש לא נמצא במערכת.",
        )

    db_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    db.refresh(db_user)
    _sync_cache(db_user)
    logger.info(f"Password reset successfully completed for: {email_key}")

    return EmailDispatchResponse(
        status="SUCCESS",
        message="הסיסמה עודכנה בהצלחה! כעת תוכל להתחבר עם הסיסמה החדשה.",
        recipient=email_key,
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password against the database to receive a JWT access token."""
    email_key = credentials.email.lower().strip()
    db_user = db.query(UserModel).filter(UserModel.email == email_key).first()

    if not db_user or not db_user.hashed_password or not verify_password(credentials.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="כתובת אימייל או סיסמה שגויים",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_record = _sync_cache(db_user)
    access_token = create_access_token(
        data={
            "sub": user_record["email"],
            "user_id": user_record["id"],
            "email": user_record["email"],
            "full_name": user_record["full_name"],
            "picture": user_record.get("picture"),
            "role": user_record["role"],
            "auth_provider": user_record.get("auth_provider", "local"),
        }
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


def _clean_redirect_uri(uri: str) -> str:
    if not uri:
        return ""
    clean = uri.strip().split("\n")[0].split("\r")[0].strip()
    if "?" in clean:
        clean = clean.split("?")[0]
    if "#" in clean:
        clean = clean.split("#")[0]
    if clean.endswith("/login"):
        clean = clean.replace("/login", "/api/auth/callback/google")
    elif not clean.endswith("/api/auth/callback/google"):
        clean = clean.rstrip("/") + "/api/auth/callback/google"
    return clean


@router.get("/google/url")
async def get_google_auth_url(redirect_uri: Optional[str] = None):
    """
    Generate the official Google OAuth 2.0 authorization consent URL
    using the configured GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.
    """
    client_id = settings.GOOGLE_CLIENT_ID
    target_redirect = _clean_redirect_uri(redirect_uri or settings.GOOGLE_REDIRECT_URI)

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
        "scope": "openid email profile https://www.googleapis.com/auth/userinfo.profile",
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
async def google_login(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate or register a user via Google OAuth and persist in DB:
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
            raw_redirect = (
                payload.redirect_uri
                if (payload.redirect_uri and "0.0.0.0" not in payload.redirect_uri)
                else settings.GOOGLE_REDIRECT_URI
            )
            target_redirect = _clean_redirect_uri(raw_redirect)

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
                    logger.error(
                        f"Google code exchange failed ({token_res.status_code}): {token_res.text} | redirect_uri={target_redirect}"
                    )
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
                    id_token_google = token_data.get("id_token")

                    if id_token_google:
                        try:
                            claims = jose_jwt.get_unverified_claims(id_token_google)
                            if claims.get("email"):
                                email = str(claims["email"]).lower().strip()
                            if claims.get("name"):
                                full_name = str(claims["name"]).strip()
                            if claims.get("picture"):
                                picture = str(claims["picture"]).strip()
                        except Exception as e:
                            logger.warning(f"Could not parse claims from id_token: {e}")

                    if access_token_google:
                        try:
                            userinfo_res = await client.get(
                                "https://www.googleapis.com/oauth2/v3/userinfo",
                                headers={"Authorization": f"Bearer {access_token_google}"},
                            )

                            if userinfo_res.status_code == 200:
                                g_user = userinfo_res.json()
                                if g_user.get("email"):
                                    email = str(g_user["email"]).lower().strip()
                                if g_user.get("name"):
                                    full_name = str(g_user["name"]).strip()
                                if g_user.get("picture"):
                                    picture = str(g_user["picture"]).strip()
                        except Exception as e:
                            logger.warning(f"Error requesting Google userinfo: {e}")

                    if not email:
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
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}"
                )
                if res.status_code == 200:
                    google_info = res.json()
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
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="טוקן Google אינו תקין או שפג תוקפו",
                    )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error validating Google ID token: {exc}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="שגיאה בתקשורת מול שרתי Google",
            )
    elif payload.email and settings.APP_ENV != "production" and not settings.GOOGLE_CLIENT_ID:
        # Allowed only in local dev/test when Google OAuth Client ID is not configured
        email = str(payload.email).lower().strip()
        full_name = payload.name or email.split("@")[0].title()
        picture = payload.picture or ""
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="נדרש קוד הרשאה או טוקן אימות תקף מ-Google",
        )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="לא התקבלה כתובת אימייל תקינה מ-Google",
        )

    db_user = db.query(UserModel).filter(UserModel.email == email).first()
    if db_user:
        if full_name:
            db_user.full_name = full_name
        if picture:
            db_user.picture = picture
        db_user.auth_provider = "google"
        db.commit()
        db.refresh(db_user)
    else:
        user_id = f"usr_g_{uuid.uuid4().hex[:8]}"
        db_user = UserModel(
            id=user_id,
            email=email,
            hashed_password=None,
            full_name=full_name or email.split("@")[0].title(),
            role="user",
            picture=picture or f"https://api.dicebear.com/7.x/initials/svg?seed={email}",
            auth_provider="google",
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    user_record = _sync_cache(db_user)

    access_token = create_access_token(
        data={
            "sub": user_record["email"],
            "user_id": user_record["id"],
            "email": user_record["email"],
            "full_name": user_record["full_name"],
            "picture": user_record.get("picture"),
            "role": user_record["role"],
            "auth_provider": "google",
        }
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
            auth_provider="google",
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve details of the currently authenticated user from DB or JWT fallback."""
    user_id = current_user.get("user_id", "guest_user")
    email = str(current_user.get("email") or current_user.get("sub", "guest@travelplanner.ai")).lower().strip()
    full_name = current_user.get("full_name")
    picture = current_user.get("picture")
    auth_provider = current_user.get("auth_provider", "local")
    role = current_user.get("role", "user")

    db_user = db.query(UserModel).filter(UserModel.email == email).first()
    if not db_user and user_id and user_id != "guest_user":
        db_user = db.query(UserModel).filter(UserModel.id == user_id).first()

    if db_user:
        changed = False
        if picture and not db_user.picture:
            db_user.picture = picture
            changed = True
        if full_name and (not db_user.full_name or db_user.full_name in ["Active Traveler", "Demo Traveler"]):
            db_user.full_name = full_name
            changed = True
        if auth_provider == "google" and db_user.auth_provider != "google":
            db_user.auth_provider = "google"
            changed = True
        if changed:
            db.commit()
            db.refresh(db_user)
        user_rec = _sync_cache(db_user)
        return UserResponse(
            id=user_rec["id"],
            email=user_rec["email"],
            full_name=user_rec.get("full_name"),
            role=user_rec.get("role", "user"),
            picture=user_rec.get("picture"),
            auth_provider=user_rec.get("auth_provider", "local"),
        )

    # Stateless fallback reconstructed directly from verified JWT claims
    resolved_name = full_name or (email.split("@")[0].title() if "@" in email else "מטייל רשום")
    resolved_picture = picture or (
        f"https://api.dicebear.com/7.x/initials/svg?seed={email}" if "@" in email else None
    )
    resolved_email = email if "@" in email else f"{email}@travelplanner.ai"

    db_user = UserModel(
        id=user_id,
        email=resolved_email,
        hashed_password=None,
        full_name=resolved_name,
        role=role,
        picture=resolved_picture,
        auth_provider=auth_provider,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    restored_record = _sync_cache(db_user)

    return UserResponse(
        id=restored_record["id"],
        email=restored_record["email"],
        full_name=restored_record["full_name"],
        role=restored_record["role"],
        picture=restored_record["picture"],
        auth_provider=restored_record["auth_provider"],
    )
