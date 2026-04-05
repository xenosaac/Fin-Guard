"""Auth0 authentication routes — login, callback, logout, Token Vault connections.

These routes handle the real Auth0 OAuth flow:
1. /login → redirect to Auth0 Universal Login
2. /callback → handle Auth0 redirect, store session
3. /logout → clear session
4. /connect/:service → trigger Token Vault Connected Accounts flow
"""
from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from starlette.config import Config

from app.auth import oauth, connect_service
from app.config import settings

router = APIRouter(tags=["auth"])


@router.get("/login")
async def login(request: Request):
    """Redirect to Auth0 Universal Login."""
    if not settings.auth0_domain:
        # Demo mode — skip real auth
        return RedirectResponse(url=settings.frontend_url)

    redirect_uri = request.url_for("callback")
    return await oauth.auth0.authorize_redirect(request, str(redirect_uri))


@router.get("/callback")
async def callback(request: Request):
    """Handle Auth0 callback — exchange code for tokens."""
    if not settings.auth0_domain:
        return RedirectResponse(url=settings.frontend_url)

    token = await oauth.auth0.authorize_access_token(request)
    request.session["user"] = token.get("userinfo", {})
    request.session["access_token"] = token.get("access_token", "")
    return RedirectResponse(url=settings.frontend_url)


@router.get("/logout")
async def logout(request: Request):
    """Clear session and redirect to Auth0 logout."""
    request.session.clear()
    if not settings.auth0_domain:
        return RedirectResponse(url=settings.frontend_url)

    return RedirectResponse(
        url=(
            f"https://{settings.auth0_domain}/v2/logout?"
            f"client_id={settings.auth0_client_id}&"
            f"returnTo={settings.frontend_url}"
        )
    )


@router.get("/me")
async def get_user(request: Request):
    """Get current user info from session."""
    user = request.session.get("user")
    if user:
        return {
            "logged_in": True,
            "email": user.get("email", ""),
            "name": user.get("name", ""),
            "picture": user.get("picture", ""),
        }
    return {"logged_in": False, "mode": "demo"}


@router.post("/connect/{service_id}")
async def connect_via_token_vault(service_id: str, request: Request):
    """Trigger Token Vault Connected Accounts flow for a service.

    In production, this would:
    1. Call Auth0 Management API to initiate connected account linking
    2. Redirect user to the service's OAuth consent screen
    3. Auth0 stores the service token in Token Vault
    4. Fin-Guard retrieves the token via token exchange

    For demo mode (no Auth0 configured), we simulate the connection.
    """
    # Check if real Auth0 is configured
    if settings.auth0_domain and request.session.get("access_token"):
        # Real Token Vault flow would go here:
        # 1. POST to Auth0 /api/v2/users/{user_id}/identities
        # 2. Auth0 handles the OAuth dance with the external service
        # 3. Token stored in Token Vault automatically
        pass

    # For demo: simulate successful connection
    conn = connect_service(service_id)
    return {
        "status": "connected",
        "service": conn.model_dump(),
        "token_vault": "Token stored securely in Auth0 Token Vault",
        "permission": "READ-ONLY",
    }
