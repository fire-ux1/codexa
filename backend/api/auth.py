from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import requests
import uuid

from settings import get_settings
from services.auth_service import encode_token, decode_token
from services.db_service import create_user, get_user

router = APIRouter()
settings = get_settings()


class DeveloperLoginPayload(BaseModel):
    name: str = "Sandbox Developer"
    email: str = "sandbox@codepilot.ai"


def get_current_user_id(authorization: str = Header(None)) -> str:
    """Dependency to retrieve and validate user ID from Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Missing or invalid Authorization header.",
        )
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if not payload or "user_id" not in payload:
        raise HTTPException(
            status_code=401, detail="Unauthorized: Invalid session token."
        )
    return payload["user_id"]


@router.post("/developer-login")
def developer_login(payload: DeveloperLoginPayload):
    """Sandbox sandbox login that generates mock credentials instantly."""
    user_id = "mock-dev"
    avatar_url = f"https://api.dicebear.com/7.x/bottts/svg?seed={payload.email}"
    create_user(
        user_id=user_id,
        email=payload.email,
        name=payload.name,
        avatar_url=avatar_url,
    )
    token = encode_token(user_id=user_id, email=payload.email)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "name": payload.name,
            "email": payload.email,
            "avatar_url": avatar_url,
        },
    }


@router.get("/me")
def get_me(user_id: str = Depends(get_current_user_id)):
    """Retrieve logged in user information."""
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.get("/login/github")
def login_github():
    """Redirect to GitHub OAuth page."""
    if not settings.github_client_id:
        raise HTTPException(
            status_code=400,
            detail="GitHub OAuth client credentials are not configured in backend/.env. Please use the Sandbox Login fallback.",
        )

    redirect_uri = f"{settings.llm_site_url.rstrip('/')}/auth-callback"
    auth_url = f"https://github.com/login/oauth/authorize?client_id={settings.github_client_id}&scope=user:email"
    return RedirectResponse(url=auth_url)


@router.get("/callback/github")
def callback_github(code: str):
    """GitHub OAuth callback endpoint."""
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=400, detail="GitHub Client credentials missing."
        )

    # 1. Exchange code for access token
    token_res = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": settings.github_client_id,
            "client_secret": settings.github_client_secret,
            "code": code,
        },
    )
    token_res.raise_for_status()
    token_data = token_res.json()
    access_token = token_data.get("access_token")

    if not access_token:
        raise HTTPException(
            status_code=400, detail="Failed to retrieve access token from GitHub."
        )

    # 2. Retrieve user profile
    user_res = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    user_res.raise_for_status()
    user_profile = user_res.json()

    # 3. Retrieve user email
    email_res = requests.get(
        "https://api.github.com/user/emails",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    email_res.raise_for_status()
    emails = email_res.json()
    primary_email = next((e["email"] for e in emails if e["primary"]), None)
    if not primary_email:
        primary_email = (
            user_profile.get("email") or f"{user_profile.get('login')}@github.com"
        )

    user_id = f"github-{user_profile.get('id')}"
    name = user_profile.get("name") or user_profile.get("login") or "GitHub User"
    avatar_url = (
        user_profile.get("avatar_url")
        or f"https://api.dicebear.com/7.x/bottts/svg?seed={name}"
    )

    # 4. Save to DB
    create_user(user_id=user_id, email=primary_email, name=name, avatar_url=avatar_url)

    # 5. Generate JWT token
    token = encode_token(user_id=user_id, email=primary_email)

    # Redirect user back to frontend callback
    frontend_redirect = (
        f"{settings.llm_site_url.rstrip('/')}/auth-callback?token={token}"
    )
    return RedirectResponse(url=frontend_redirect)


@router.get("/login/google")
def login_google():
    """Redirect to Google OAuth page."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth client credentials are not configured in backend/.env. Please use the Sandbox Login fallback.",
        )

    redirect_uri = f"{settings.llm_site_url.rstrip('/')}/auth-callback"  # wait, we will use backend callback to handle user creation first
    backend_redirect_uri = "http://localhost:8000/auth/callback/google"  # standard redirect back to backend callback
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={settings.google_client_id}&redirect_uri={backend_redirect_uri}&response_type=code&scope=openid%20email%20profile"
    return RedirectResponse(url=auth_url)


@router.get("/callback/google")
def callback_google(code: str):
    """Google OAuth callback endpoint."""
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=400, detail="Google Client credentials missing."
        )

    # 1. Exchange code for access token
    backend_redirect_uri = "http://localhost:8000/auth/callback/google"
    token_res = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": backend_redirect_uri,
        },
    )
    token_res.raise_for_status()
    token_data = token_res.json()
    access_token = token_data.get("access_token")

    if not access_token:
        raise HTTPException(
            status_code=400, detail="Failed to retrieve access token from Google."
        )

    # 2. Retrieve user profile
    user_res = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    user_res.raise_for_status()
    user_profile = user_res.json()

    email = user_profile.get("email")
    user_id = f"google-{user_profile.get('sub')}"
    name = user_profile.get("name") or "Google User"
    avatar_url = (
        user_profile.get("picture")
        or f"https://api.dicebear.com/7.x/bottts/svg?seed={name}"
    )

    # 3. Save to DB
    create_user(user_id=user_id, email=email, name=name, avatar_url=avatar_url)

    # 4. Generate JWT token
    token = encode_token(user_id=user_id, email=email)

    # Redirect user back to frontend callback
    frontend_redirect = (
        f"{settings.llm_site_url.rstrip('/')}/auth-callback?token={token}"
    )
    return RedirectResponse(url=frontend_redirect)
