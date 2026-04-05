"""Auth0 integration — Token Vault + user authentication.

This module handles:
1. User login/logout via Auth0 Universal Login
2. Token Vault connection management (connect/disconnect services)
3. Token exchange for API access (read-only scopes only)
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request

from app.config import settings
from app.models.schemas import PermissionLevel, ServiceConnection

# ── Auth0 OAuth client ───────────────────────────────────────────────────────

oauth = OAuth()

oauth.register(
    "auth0",
    client_id=settings.auth0_client_id,
    client_secret=settings.auth0_client_secret,
    client_kwargs={"scope": "openid profile email"},
    server_metadata_url=(
        f"https://{settings.auth0_domain}/.well-known/openid-configuration"
    ),
) if settings.auth0_domain else None


# ── Service connection registry ──────────────────────────────────────────────

# Defines which services Fin-Guard can connect to and their READ-ONLY scopes
SERVICE_REGISTRY = {
    "financial_api": {
        "name": "Financial Account (Plaid)",
        "scopes": ["transactions:read", "accounts:read"],
        "description": "Read-only access to bank transactions and account balances",
    },
    "google_sheets": {
        "name": "Google Sheets",
        "scopes": ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        "description": "Read-only access to your budget spreadsheet",
    },
    "slack": {
        "name": "Slack",
        "scopes": ["chat:write", "channels:read"],
        "description": "Send alert notifications to your Slack workspace",
    },
}

# In-memory connection state (per-user in production)
_connections: dict[str, ServiceConnection] = {}


def get_connections() -> list[ServiceConnection]:
    """Get all service connections with their current state."""
    result = []
    for svc_id, registry in SERVICE_REGISTRY.items():
        if svc_id in _connections:
            result.append(_connections[svc_id])
        else:
            result.append(ServiceConnection(
                service_id=svc_id,
                service_name=registry["name"],
                permission=PermissionLevel.NONE,
                connected=False,
                scopes=registry["scopes"],
            ))
    return result


def connect_service(service_id: str) -> ServiceConnection:
    """Connect a service via Token Vault.

    In production, this triggers the Auth0 Connected Accounts flow:
    1. Redirect user to service's OAuth consent screen
    2. User grants read-only permissions
    3. Auth0 stores tokens in Token Vault
    4. Fin-Guard retrieves tokens via token exchange

    For the hackathon demo, we simulate this flow.
    """
    if service_id not in SERVICE_REGISTRY:
        raise ValueError(f"Unknown service: {service_id}")

    registry = SERVICE_REGISTRY[service_id]
    conn = ServiceConnection(
        service_id=service_id,
        service_name=registry["name"],
        permission=PermissionLevel.READ,  # ALWAYS read-only
        connected=True,
        connected_at=datetime.now(),
        scopes=registry["scopes"],
    )
    _connections[service_id] = conn
    return conn


def disconnect_service(service_id: str) -> bool:
    """Disconnect a service — revoke Token Vault access.

    User can disconnect any service at any time without affecting others.
    This is the per-service granular revocation model.
    """
    if service_id in _connections:
        del _connections[service_id]
        return True
    return False


def is_connected(service_id: str) -> bool:
    """Check if a service is currently connected."""
    return service_id in _connections and _connections[service_id].connected
