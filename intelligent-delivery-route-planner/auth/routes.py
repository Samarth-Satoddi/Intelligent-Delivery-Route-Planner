"""FastAPI Router for Authentication, Sessions, and User Profile."""
import os
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import User, RefreshToken, RouteHistory
from .schemas import UserRegister, UserLogin, UserResponse, TokenResponse, RefreshTokenRequest, RouteHistoryResponse
from .security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_refresh_token_pair,
    hash_token_sha256,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from .dependencies import get_current_active_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account with USER role."""
    normalized_email = user_in.email.strip().lower()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Enforce password minimum strength
    if len(user_in.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    hashed = hash_password(user_in.password)
    user = User(
        email=normalized_email,
        full_name=user_in.full_name.strip(),
        hashed_password=hashed,
        role="USER",  # Strictly force USER role for public registration
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(
    user_in: UserLogin,
    response: Response,
    db: Session = Depends(get_db)
):
    """Authenticate with email and password, returning access token and setting refresh cookie."""
    normalized_email = user_in.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

    # Create Access Token
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})

    # Create and persist Refresh Token
    raw_refresh_token, token_hash = generate_refresh_token_pair()
    days = 14 if user_in.remember_me else REFRESH_TOKEN_EXPIRE_DAYS
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=days)

    db_refresh = RefreshToken(
        token_hash=token_hash,
        user_id=user.id,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(db_refresh)
    db.commit()

    # Set secure HttpOnly cookie for refresh token
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh_token,
        httponly=True,
        max_age=days * 86400,
        expires=expires_at.strftime("%a, %d %b %Y %H:%M:%S GMT"),
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/api/auth",
    )

    # Also set access_token cookie for direct browser navigation support
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_seconds=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    request: Request,
    response: Response,
    body: Optional[RefreshTokenRequest] = None,
    db: Session = Depends(get_db)
):
    """Rotate refresh token and issue new access token."""
    raw_refresh = None
    if body and body.refresh_token:
        raw_refresh = body.refresh_token
    else:
        raw_refresh = request.cookies.get("refresh_token")

    if not raw_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required.")

    token_hash = hash_token_sha256(raw_refresh)
    token_entry = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if not token_entry:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    if token_entry.revoked or token_entry.expires_at < datetime.datetime.utcnow():
        # Potential reuse or expiration: revoke to protect account
        token_entry.revoked = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired or revoked refresh token.")

    # Refresh Token Rotation: revoke existing and generate fresh one
    token_entry.revoked = True

    user = token_entry.user
    new_raw_refresh, new_token_hash = generate_refresh_token_pair()
    new_expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    new_db_token = RefreshToken(
        token_hash=new_token_hash,
        user_id=user.id,
        expires_at=new_expires_at,
        revoked=False,
    )
    db.add(new_db_token)
    db.commit()

    # Issue new access token
    new_access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})

    response.set_cookie(
        key="refresh_token",
        value=new_raw_refresh,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/api/auth",
    )
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
    )

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in_seconds=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Revoke refresh token and clear session cookies."""
    raw_refresh = request.cookies.get("refresh_token")
    if raw_refresh:
        token_hash = hash_token_sha256(raw_refresh)
        entry = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if entry:
            entry.revoked = True
            db.commit()

    response.delete_cookie(key="refresh_token", path="/api/auth")
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out successfully. Tokens revoked."}


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_active_user)):
    """Return currently authenticated user's profile and assigned role."""
    return user


@router.get("/history", response_model=List[RouteHistoryResponse])
def get_user_route_history(
    user: User = Depends(get_current_active_user),
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Return past calculated routes for the authenticated user."""
    history = (
        db.query(RouteHistory)
        .filter(RouteHistory.user_id == user.id)
        .order_by(RouteHistory.created_at.desc())
        .limit(limit)
        .all()
    )
    return history


@router.post("/bootstrap-admin")
def bootstrap_admin(
    admin_secret: str,
    email: str = "admin@campus.edu",
    password: str = "Admin@Campus2026!",
    full_name: str = "Campus System Administrator",
    db: Session = Depends(get_db)
):
    """Seed the initial administrator account securely.

    Requires ADMIN_BOOTSTRAP_SECRET environment variable match or executes if no users exist.
    """
    configured_secret = os.getenv("ADMIN_BOOTSTRAP_SECRET", "campus_admin_bootstrap_secret_key_2026")
    admin_count = db.query(User).filter(User.role == "ADMIN").count()

    if admin_count > 0 and admin_secret != configured_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin already bootstrapped. Secret required to create additional administrators."
        )

    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing:
        existing.role = "ADMIN"
        db.commit()
        return {"message": f"Existing user '{email}' promoted to ADMIN.", "email": email}

    admin_user = User(
        email=email.lower(),
        full_name=full_name,
        hashed_password=hash_password(password),
        role="ADMIN",
        is_active=True,
    )
    db.add(admin_user)
    db.commit()
    return {"message": "Administrator account created successfully.", "email": email, "role": "ADMIN"}

