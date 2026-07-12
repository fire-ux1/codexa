from fastapi import APIRouter, HTTPException, Depends, Header, Request
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel
import requests
import jwt
import secrets
import hashlib
import uuid
import datetime
from typing import Optional

from settings import get_settings
from services.auth_service import encode_token, encode_refresh_token, decode_token
from services.db_service import create_user, get_user, get_db

router = APIRouter()
settings = get_settings()


class DeveloperLoginPayload(BaseModel):
    name: str = "Sandbox Developer"
    email: str = "sandbox@codepilot.ai"


class RefreshTokenPayload(BaseModel):
    refresh_token: str


class ApiKeyCreatePayload(BaseModel):
    name: str
    expires_in_days: Optional[int] = 30


def get_current_user_id(authorization: str = Header(None)) -> str:
    """Dependency to retrieve and validate user ID from Bearer token or personal API key."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Missing or invalid Authorization header.",
        )
    token = authorization.split(" ")[1]

    # 1. Personal API Key check
    if token.startswith("sk_live_"):
        key_hash = hashlib.sha256(token.encode()).hexdigest()
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, expires_at FROM api_keys WHERE key_hash = %s",
                (key_hash,),
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=401, detail="Unauthorized: Invalid API Key."
                )

            if row["expires_at"]:
                expires_at = row["expires_at"]
                if isinstance(expires_at, str):
                    try:
                        clean_ts = expires_at.split(".")[0].replace("Z", "")
                        expires_dt = datetime.datetime.strptime(
                            clean_ts, "%Y-%m-%d %H:%M:%S"
                        )
                    except Exception:
                        expires_dt = None
                else:
                    expires_dt = expires_at

                if expires_dt and expires_dt < datetime.datetime.utcnow():
                    raise HTTPException(
                        status_code=401, detail="Unauthorized: API Key has expired."
                    )

            return row["user_id"]
        finally:
            conn.close()

    # 2. JWT Access Token verification
    try:
        payload = decode_token(token)
        if not payload or "user_id" not in payload:
            raise HTTPException(
                status_code=401, detail="Unauthorized: Invalid session token."
            )

        if payload.get("type") != "access":
            raise HTTPException(
                status_code=401, detail="Unauthorized: Access token required."
            )

        user_id = payload["user_id"]
        token_version_in_jwt = payload.get("token_version")

        user = get_user(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized: User not found.")

        token_version_in_db = user.get("token_version")
        if token_version_in_db is not None and token_version_in_jwt is not None:
            if token_version_in_jwt != token_version_in_db:
                raise HTTPException(
                    status_code=401, detail="Unauthorized: Session has been revoked."
                )

        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401, detail="Unauthorized: Session token has expired."
        )
    except (jwt.InvalidTokenError, Exception):
        raise HTTPException(
            status_code=401, detail="Unauthorized: Invalid session token."
        )


@router.post("/developer-login")
def developer_login(payload: DeveloperLoginPayload):
    """Sandbox sandbox login that generates mock credentials instantly."""
    if not settings.allow_sandbox_login:
        raise HTTPException(
            status_code=403,
            detail="Developer sandbox login is disabled in this environment.",
        )
    user_id = "mock-dev"
    avatar_url = f"https://api.dicebear.com/7.x/bottts/svg?seed={payload.email}"
    create_user(
        user_id=user_id,
        email=payload.email,
        name=payload.name,
        avatar_url=avatar_url,
    )
    user = get_user(user_id)
    token_version = user["token_version"] if user and "token_version" in user else 1

    # MFA Login interception
    if user and user.get("mfa_enabled"):
        mfa_temp_token = jwt.encode(
            {
                "type": "mfa_temp",
                "user_id": user_id,
                "email": payload.email,
                "token_version": token_version,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=5),
            },
            settings.jwt_secret,
            algorithm="HS256",
        )
        return {
            "mfa_required": True,
            "mfa_temp_token": mfa_temp_token,
        }

    token = encode_token(
        user_id=user_id, email=payload.email, token_version=token_version
    )
    refresh_token = encode_refresh_token(
        user_id=user_id, email=payload.email, token_version=token_version
    )
    return {
        "token": token,
        "refresh_token": refresh_token,
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


@router.post("/refresh")
def refresh_session_token(payload: RefreshTokenPayload):
    """Generates a new access token using a valid refresh token (token rotation)."""
    try:
        decoded = decode_token(payload.refresh_token)
        if decoded.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type.")

        user_id = decoded["user_id"]
        email = decoded["email"]
        token_version_in_jwt = decoded.get("token_version")

        user = get_user(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found.")

        token_version_in_db = user.get("token_version")
        if token_version_in_db is not None and token_version_in_jwt is not None:
            if token_version_in_jwt != token_version_in_db:
                raise HTTPException(status_code=401, detail="Refresh token is revoked.")

        new_access = encode_token(user_id, email, token_version_in_db)
        new_refresh = encode_refresh_token(user_id, email, token_version_in_db)

        return {"token": new_access, "refresh_token": new_refresh}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token has expired.")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid refresh token: {str(e)}")


@router.post("/logout")
def logout_user(user_id: str = Depends(get_current_user_id)):
    """Logs out the user globally by incrementing token_version, invalidating all JWT sessions."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET token_version = COALESCE(token_version, 1) + 1 WHERE id = %s",
            (user_id,),
        )
        conn.commit()
        return {
            "status": "success",
            "message": "Successfully logged out of all devices.",
        }
    finally:
        conn.close()


class MfaConfirmPayload(BaseModel):
    code: str


class MfaVerifyPayload(BaseModel):
    temp_token: str
    code: str


@router.post("/mfa/setup")
def mfa_setup(current_user_id: str = Depends(get_current_user_id)):
    """Starts MFA setup: generates secret & returns QR data URL."""
    user = get_user(current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    from services.mfa_service import generate_mfa_setup

    secret, qr_url = generate_mfa_setup(user["email"])

    # Save the secret temporarily, leave mfa_enabled = FALSE
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET mfa_secret = %s, mfa_enabled = FALSE WHERE id = %s",
            (secret, current_user_id),
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "mfa_secret": secret,
        "qr_code_url": qr_url,
    }


@router.post("/mfa/confirm")
def mfa_confirm(
    payload: MfaConfirmPayload,
    current_user_id: str = Depends(get_current_user_id),
):
    """Confirm TOTP code scan to enable MFA."""
    user = get_user(current_user_id)
    if not user or not user.get("mfa_secret"):
        raise HTTPException(status_code=400, detail="MFA setup was not initiated.")

    from services.mfa_service import verify_totp_code

    is_valid = verify_totp_code(user["mfa_secret"], payload.code)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET mfa_enabled = TRUE WHERE id = %s",
            (current_user_id,),
        )
        conn.commit()
    finally:
        conn.close()

    # Log to audit service
    from services.audit_service import log_audit_event

    log_audit_event(current_user_id, "enable_mfa", details={"email": user["email"]})

    return {"status": "success", "message": "Multi-Factor Authentication enabled."}


@router.post("/mfa/disable")
def mfa_disable(
    payload: MfaConfirmPayload,
    current_user_id: str = Depends(get_current_user_id),
):
    """Disable MFA (requires current TOTP code)."""
    user = get_user(current_user_id)
    if not user or not user.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA is not enabled.")

    from services.mfa_service import verify_totp_code

    is_valid = verify_totp_code(user["mfa_secret"], payload.code)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET mfa_secret = NULL, mfa_enabled = FALSE WHERE id = %s",
            (current_user_id,),
        )
        conn.commit()
    finally:
        conn.close()

    # Log to audit service
    from services.audit_service import log_audit_event

    log_audit_event(current_user_id, "disable_mfa", details={"email": user["email"]})

    return {"status": "success", "message": "Multi-Factor Authentication disabled."}


@router.post("/login/mfa-verify")
def login_mfa_verify(payload: MfaVerifyPayload):
    """Validates temporary token + TOTP code to complete login."""
    try:
        decoded = jwt.decode(
            payload.temp_token, settings.jwt_secret, algorithms=["HS256"]
        )
        if decoded.get("type") != "mfa_temp":
            raise HTTPException(status_code=400, detail="Invalid session token type.")

        user_id = decoded["user_id"]
        email = decoded["email"]
        token_version_in_jwt = decoded.get("token_version")

        user = get_user(user_id)
        if not user or not user.get("mfa_secret") or not user.get("mfa_enabled"):
            raise HTTPException(
                status_code=401, detail="Authentication state mismatch."
            )

        token_version_in_db = user.get("token_version", 1)
        if token_version_in_jwt != token_version_in_db:
            raise HTTPException(status_code=401, detail="Session expired.")

        from services.mfa_service import verify_totp_code

        is_valid = verify_totp_code(user["mfa_secret"], payload.code)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid verification code.")

        token = encode_token(user_id, email, token_version_in_db)
        refresh_token = encode_refresh_token(user_id, email, token_version_in_db)

        from services.audit_service import log_audit_event

        log_audit_event(user_id, "mfa_login_success", details={"email": email})

        avatar_url = (
            user.get("avatar_url")
            or f"https://api.dicebear.com/7.x/bottts/svg?seed={user.get('name')}"
        )

        return {
            "token": token,
            "refresh_token": refresh_token,
            "user": {
                "id": user_id,
                "name": user.get("name"),
                "email": email,
                "avatar_url": avatar_url,
            },
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401, detail="Verification session expired. Please log in again."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid verification token.")


@router.post("/api-keys")
def create_personal_api_key(
    payload: ApiKeyCreatePayload, user_id: str = Depends(get_current_user_id)
):
    """Generates a personal API Key starting with sk_live_, returning the plaintext token once."""
    raw_key = "sk_live_" + secrets.token_hex(24)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_id = str(uuid.uuid4())
    prefix = raw_key[:12]

    expires_at = None
    if payload.expires_in_days:
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(
            days=payload.expires_in_days
        )

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO api_keys (id, user_id, name, key_hash, prefix, expires_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (key_id, user_id, payload.name, key_hash, prefix, expires_at),
        )
        conn.commit()
        return {
            "key_id": key_id,
            "name": payload.name,
            "prefix": prefix,
            "api_key": raw_key,
            "expires_at": expires_at.isoformat() + "Z" if expires_at else None,
        }
    finally:
        conn.close()


@router.get("/api-keys")
def list_personal_api_keys(user_id: str = Depends(get_current_user_id)):
    """Lists metadata for all API keys created by the user."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, name, prefix, created_at, expires_at FROM api_keys WHERE user_id = %s",
            (user_id,),
        )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.delete("/api-keys/{key_id}")
def revoke_personal_api_key(key_id: str, user_id: str = Depends(get_current_user_id)):
    """Revokes (deletes) a personal API key."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id FROM api_keys WHERE id = %s", (key_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="API Key not found.")

        if row["user_id"] != user_id:
            raise HTTPException(
                status_code=403, detail="Access Denied: You do not own this API key."
            )

        cursor.execute("DELETE FROM api_keys WHERE id = %s", (key_id,))
        conn.commit()
        return {"status": "success", "message": "API key successfully revoked."}
    finally:
        conn.close()


@router.get("/login/github")
def login_github(origin: Optional[str] = None):
    """Redirect to GitHub OAuth page."""
    if not settings.github_client_id:
        raise HTTPException(
            status_code=400,
            detail="GitHub OAuth client credentials are not configured in backend/.env. Please use the Sandbox Login fallback.",
        )

    state = origin or settings.llm_site_url
    auth_url = f"https://github.com/login/oauth/authorize?client_id={settings.github_client_id}&scope=user:email&state={state}"
    return RedirectResponse(url=auth_url)


@router.get("/callback/github")
def callback_github(code: str, state: Optional[str] = None):
    """GitHub OAuth callback endpoint."""
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=400, detail="GitHub Client credentials missing."
        )

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

    user_res = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    user_res.raise_for_status()
    user_profile = user_res.json()

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

    create_user(user_id=user_id, email=primary_email, name=name, avatar_url=avatar_url)

    user = get_user(user_id)
    token_version = user["token_version"] if user and "token_version" in user else 1

    frontend_base = state or settings.llm_site_url

    # MFA Redirect check
    if user and user.get("mfa_enabled"):
        mfa_temp_token = jwt.encode(
            {
                "type": "mfa_temp",
                "user_id": user_id,
                "email": primary_email,
                "token_version": token_version,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=5),
            },
            settings.jwt_secret,
            algorithm="HS256",
        )
        frontend_redirect = f"{frontend_base.rstrip('/')}/auth-callback?mfa_required=true&mfa_temp_token={mfa_temp_token}"
        return RedirectResponse(url=frontend_redirect)

    token = encode_token(
        user_id=user_id, email=primary_email, token_version=token_version
    )
    refresh_token = encode_refresh_token(
        user_id=user_id, email=primary_email, token_version=token_version
    )

    frontend_redirect = f"{frontend_base.rstrip('/')}/auth-callback?token={token}&refresh_token={refresh_token}"
    return RedirectResponse(url=frontend_redirect)


@router.get("/login/google")
def login_google(origin: Optional[str] = None):
    """Redirect to Google OAuth page."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth client credentials are not configured in backend/.env. Please use the Sandbox Login fallback.",
        )

    backend_redirect_uri = settings.google_redirect_uri
    state = origin or settings.llm_site_url
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={settings.google_client_id}&redirect_uri={backend_redirect_uri}&response_type=code&scope=openid%20email%20profile&state={state}"
    return RedirectResponse(url=auth_url)


@router.get("/callback/google")
def callback_google(code: str, state: Optional[str] = None):
    """Google OAuth callback endpoint."""
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=400, detail="Google Client credentials missing."
        )

    backend_redirect_uri = settings.google_redirect_uri
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

    create_user(user_id=user_id, email=email, name=name, avatar_url=avatar_url)

    user = get_user(user_id)
    token_version = user["token_version"] if user and "token_version" in user else 1

    frontend_base = state or settings.llm_site_url

    # MFA Redirect check
    if user and user.get("mfa_enabled"):
        mfa_temp_token = jwt.encode(
            {
                "type": "mfa_temp",
                "user_id": user_id,
                "email": email,
                "token_version": token_version,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=5),
            },
            settings.jwt_secret,
            algorithm="HS256",
        )
        frontend_redirect = f"{frontend_base.rstrip('/')}/auth-callback?mfa_required=true&mfa_temp_token={mfa_temp_token}"
        return RedirectResponse(url=frontend_redirect)

    token = encode_token(user_id=user_id, email=email, token_version=token_version)
    refresh_token = encode_refresh_token(
        user_id=user_id, email=email, token_version=token_version
    )

    frontend_redirect = f"{frontend_base.rstrip('/')}/auth-callback?token={token}&refresh_token={refresh_token}"
    return RedirectResponse(url=frontend_redirect)


@router.get("/sso/login")
def login_sso(origin: Optional[str] = None):
    """Redirect to Okta / OIDC auth page, or perform mock sign-in in sandbox."""
    state = origin or settings.llm_site_url
    if not settings.sso_client_id or not settings.sso_metadata_url:
        if settings.allow_sandbox_login:
            # Sandbox mock SSO flow
            import urllib.parse

            redirect_url = f"http://localhost:8000/auth/sso/callback?code=mock-sso-code&state={urllib.parse.quote(state)}"
            return RedirectResponse(url=redirect_url)
        raise HTTPException(
            status_code=400,
            detail="SSO/SAML client credentials are not configured. Please use the Developer Sandbox Login.",
        )

    auth_url = f"{settings.sso_metadata_url}/v1/authorize?client_id={settings.sso_client_id}&redirect_uri={settings.sso_redirect_uri}&response_type=code&scope=openid%20email%20profile&state={state}"
    return RedirectResponse(url=auth_url)


@router.get("/sso/callback")
def callback_sso(code: str, state: Optional[str] = None):
    """Callback endpoint for SSO OAuth2 flow."""
    if code == "mock-sso-code" and (
        not settings.sso_client_id or not settings.sso_client_secret
    ):
        email = "sso-sandbox@codepilot.ai"
        user_id = "sso-mock-dev"
        name = "SSO Sandbox Developer"
        avatar_url = f"https://api.dicebear.com/7.x/bottts/svg?seed={name}"
    else:
        if (
            not settings.sso_client_id
            or not settings.sso_client_secret
            or not settings.sso_metadata_url
        ):
            raise HTTPException(
                status_code=400, detail="SSO Client credentials missing."
            )

        token_endpoint = f"{settings.sso_metadata_url}/v1/token"
        try:
            token_res = requests.post(
                token_endpoint,
                data={
                    "client_id": settings.sso_client_id,
                    "client_secret": settings.sso_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.sso_redirect_uri,
                },
            )
            token_res.raise_for_status()
            token_data = token_res.json()
            access_token = token_data.get("access_token")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to exchange authorization code: {str(e)}",
            )

        if not access_token:
            raise HTTPException(
                status_code=400,
                detail="Failed to retrieve access token from SSO provider.",
            )

        userinfo_endpoint = f"{settings.sso_metadata_url}/v1/userinfo"
        try:
            user_res = requests.get(
                userinfo_endpoint,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_res.raise_for_status()
            user_profile = user_res.json()
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to retrieve user profile from SSO provider: {str(e)}",
            )

        email = user_profile.get("email")
        user_id = f"sso-{user_profile.get('sub')}"
        name = user_profile.get("name") or "SSO User"
        avatar_url = (
            user_profile.get("picture")
            or f"https://api.dicebear.com/7.x/bottts/svg?seed={name}"
        )

    create_user(user_id=user_id, email=email, name=name, avatar_url=avatar_url)

    user = get_user(user_id)
    token_version = user["token_version"] if user and "token_version" in user else 1

    from services.audit_service import log_audit_event

    log_audit_event(user_id, "sso_login_success", details={"email": email})

    frontend_base = state or settings.llm_site_url

    if user and user.get("mfa_enabled"):
        mfa_temp_token = jwt.encode(
            {
                "type": "mfa_temp",
                "user_id": user_id,
                "email": email,
                "token_version": token_version,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=5),
            },
            settings.jwt_secret,
            algorithm="HS256",
        )
        frontend_redirect = f"{frontend_base.rstrip('/')}/auth-callback?mfa_required=true&mfa_temp_token={mfa_temp_token}"
        return RedirectResponse(url=frontend_redirect)

    token = encode_token(user_id=user_id, email=email, token_version=token_version)
    refresh_token = encode_refresh_token(
        user_id=user_id, email=email, token_version=token_version
    )

    frontend_redirect = f"{frontend_base.rstrip('/')}/auth-callback?token={token}&refresh_token={refresh_token}"
    return RedirectResponse(url=frontend_redirect)


# ─── SAML 2.0 Enterprise SSO ─────────────────────────────────────────────────


def _get_saml_auth(request_data: dict):
    """
    Builds a python3-saml OneLogin_Saml2_Auth object from settings.
    request_data must contain: https, http_host, script_name, get_data, post_data
    """
    try:
        from onelogin.saml2.auth import OneLogin_Saml2_Auth
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="SAML library (python3-saml) is not installed. Run: pip install python3-saml",
        )

    if not settings.saml_enabled:
        raise HTTPException(
            status_code=503,
            detail="SAML SSO is not enabled. Set SAML_ENABLED=true in your environment.",
        )

    saml_settings = {
        "strict": True,
        "debug": False,
        "sp": {
            "entityId": settings.saml_sp_entity_id,
            "assertionConsumerService": {
                "url": settings.saml_acs_url,
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
            },
            "singleLogoutService": {
                "url": settings.saml_acs_url.replace("/callback", "/logout"),
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
            },
            "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
            "x509cert": settings.saml_sp_x509cert,
            "privateKey": settings.saml_sp_private_key,
        },
        "idp": {
            "entityId": settings.saml_idp_entity_id,
            "singleSignOnService": {
                "url": settings.saml_idp_sso_url,
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
            },
            "x509cert": settings.saml_idp_x509cert,
        },
    }

    from onelogin.saml2.auth import OneLogin_Saml2_Auth

    return OneLogin_Saml2_Auth(request_data, saml_settings)


def _build_saml_request_data(request) -> dict:
    """Convert a FastAPI Request object into the format python3-saml expects."""
    return {
        "https": "on" if request.url.scheme == "https" else "off",
        "http_host": request.headers.get("host", "localhost"),
        "script_name": str(request.url.path),
        "get_data": dict(request.query_params),
        "post_data": {},  # POST body is handled separately in callback
    }


@router.get("/saml/metadata")
async def saml_metadata(request: "Request"):
    """
    Generates and returns the SAML 2.0 Service Provider metadata XML.
    Share this with your Identity Provider (e.g. Okta, Azure AD, Google Workspace).
    """
    if not settings.saml_enabled:
        raise HTTPException(
            status_code=503,
            detail="SAML SSO is disabled. Set SAML_ENABLED=true.",
        )

    try:
        from onelogin.saml2.settings import OneLogin_Saml2_Settings
    except ImportError:
        raise HTTPException(status_code=501, detail="python3-saml is not installed.")

    saml_settings = {
        "strict": True,
        "debug": False,
        "sp": {
            "entityId": settings.saml_sp_entity_id,
            "assertionConsumerService": {
                "url": settings.saml_acs_url,
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
            },
            "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
            "x509cert": settings.saml_sp_x509cert,
            "privateKey": settings.saml_sp_private_key,
        },
        "idp": {
            "entityId": settings.saml_idp_entity_id,
            "singleSignOnService": {
                "url": settings.saml_idp_sso_url,
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
            },
            "x509cert": settings.saml_idp_x509cert,
        },
    }

    sp_settings = OneLogin_Saml2_Settings(
        settings=saml_settings, sp_validation_only=True
    )
    metadata = sp_settings.get_sp_metadata()
    errors = sp_settings.validate_metadata(metadata)

    if errors:
        raise HTTPException(status_code=500, detail=f"SAML metadata errors: {errors}")

    return Response(content=metadata, media_type="application/xml")


@router.get("/saml/login")
async def saml_login_redirect(origin: Optional[str] = None):
    """
    Initiates a SAML 2.0 SP-initiated login by redirecting to the IdP SSO URL.
    """
    if not settings.saml_enabled:
        raise HTTPException(
            status_code=503,
            detail="SAML SSO is disabled. Set SAML_ENABLED=true.",
        )
    if not settings.saml_idp_sso_url:
        raise HTTPException(
            status_code=503,
            detail="SAML IdP SSO URL is not configured (SAML_IDP_SSO_URL).",
        )

    # Build a minimal relay state and redirect the browser to the IdP
    import urllib.parse

    relay_state = origin or settings.llm_site_url
    redirect_url = (
        f"{settings.saml_idp_sso_url}"
        f"?SAMLRequest=&RelayState={urllib.parse.quote(relay_state)}"
    )

    # Use python3-saml to build the proper AuthN request redirect URL
    try:
        from onelogin.saml2.auth import OneLogin_Saml2_Auth

        fake_request_data = {
            "https": "on" if settings.saml_acs_url.startswith("https") else "off",
            "http_host": settings.saml_acs_url.split("//")[1].split("/")[0],
            "script_name": "/auth/saml/login",
            "get_data": {},
            "post_data": {},
        }
        saml_settings_dict = {
            "strict": True,
            "debug": False,
            "sp": {
                "entityId": settings.saml_sp_entity_id,
                "assertionConsumerService": {
                    "url": settings.saml_acs_url,
                    "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
                },
                "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
                "x509cert": settings.saml_sp_x509cert,
                "privateKey": settings.saml_sp_private_key,
            },
            "idp": {
                "entityId": settings.saml_idp_entity_id,
                "singleSignOnService": {
                    "url": settings.saml_idp_sso_url,
                    "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
                },
                "x509cert": settings.saml_idp_x509cert,
            },
        }
        auth = OneLogin_Saml2_Auth(fake_request_data, saml_settings_dict)
        redirect_url = auth.login(return_to=relay_state)
    except Exception as e:
        # Fallback: direct redirect to IdP
        print(
            f"[SAML] Warning building AuthN request: {e}. Falling back to direct redirect."
        )

    return RedirectResponse(url=redirect_url)


@router.post("/saml/callback")
async def saml_callback(request: "Request"):
    """
    Handles the SAML 2.0 Assertion Consumer Service (ACS) POST callback from the IdP.
    Validates the SAML response, extracts user identity, issues a JWT, and redirects to the frontend.
    """
    if not settings.saml_enabled:
        raise HTTPException(status_code=503, detail="SAML SSO is disabled.")

    try:
        from onelogin.saml2.auth import OneLogin_Saml2_Auth
    except ImportError:
        raise HTTPException(status_code=501, detail="python3-saml is not installed.")

    # Parse the incoming POST form body
    form = await request.form()
    post_data = dict(form)

    request_data = {
        "https": "on" if request.url.scheme == "https" else "off",
        "http_host": request.headers.get("host", "localhost"),
        "script_name": str(request.url.path),
        "get_data": dict(request.query_params),
        "post_data": post_data,
    }

    saml_settings_dict = {
        "strict": True,
        "debug": False,
        "sp": {
            "entityId": settings.saml_sp_entity_id,
            "assertionConsumerService": {
                "url": settings.saml_acs_url,
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
            },
            "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
            "x509cert": settings.saml_sp_x509cert,
            "privateKey": settings.saml_sp_private_key,
        },
        "idp": {
            "entityId": settings.saml_idp_entity_id,
            "singleSignOnService": {
                "url": settings.saml_idp_sso_url,
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
            },
            "x509cert": settings.saml_idp_x509cert,
        },
    }

    auth = OneLogin_Saml2_Auth(request_data, saml_settings_dict)
    auth.process_response()
    errors = auth.get_errors()

    if errors:
        error_reason = auth.get_last_error_reason()
        raise HTTPException(
            status_code=401,
            detail=f"SAML authentication failed: {errors}. Reason: {error_reason}",
        )

    if not auth.is_authenticated():
        raise HTTPException(
            status_code=401, detail="SAML assertion could not be verified."
        )

    # Extract user attributes
    name_id = auth.get_nameid()  # This is typically the email
    attributes = auth.get_attributes()

    # Normalize common attribute name patterns from various IdPs
    email = name_id or ""
    name = (
        attributes.get(
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname", [None]
        )[0]
        or attributes.get("displayName", [None])[0]
        or attributes.get("name", [None])[0]
        or email.split("@")[0]
    )

    if not email:
        raise HTTPException(
            status_code=400, detail="SAML assertion missing email / NameID."
        )

    # Upsert the user
    user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, email))
    create_user(user_id=user_id, email=email, name=name, avatar_url="")

    user = get_user(user_id)
    token_version = user["token_version"] if user and "token_version" in user else 1

    from services.audit_service import log_audit_event

    log_audit_event(
        user_id,
        "saml_login_success",
        details={"email": email, "idp": settings.saml_idp_entity_id},
    )

    token = encode_token(user_id=user_id, email=email, token_version=token_version)
    refresh_token = encode_refresh_token(
        user_id=user_id, email=email, token_version=token_version
    )

    relay_state = post_data.get("RelayState") or settings.llm_site_url

    frontend_redirect = (
        f"{relay_state.rstrip('/')}/auth-callback"
        f"?token={token}&refresh_token={refresh_token}"
    )
    return RedirectResponse(url=frontend_redirect)
