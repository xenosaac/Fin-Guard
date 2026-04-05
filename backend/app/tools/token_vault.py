"""Auth0 Token Vault simulation layer.

In production, this calls the Auth0 Token Vault API to:
1. Exchange Auth0 access token for external service token
2. Retrieve stored tokens for connected services
3. Refresh expired tokens automatically

For the hackathon demo, this simulates the Token Vault flow
with realistic audit entries showing each step.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.models.schemas import AuditEntry, PermissionLevel


class TokenVaultClient:
    """Simulates Auth0 Token Vault token exchange."""

    def __init__(self):
        self._tokens: dict[str, dict] = {}

    def store_token(self, service_id: str, scopes: list[str]) -> AuditEntry:
        """Simulate Token Vault storing a new service token."""
        self._tokens[service_id] = {
            "access_token": f"vault_{service_id}_{'x' * 16}",
            "scopes": scopes,
            "stored_at": datetime.now().isoformat(),
        }
        return AuditEntry(
            timestamp=datetime.now(),
            service="auth0_token_vault",
            action=f"store_token:{service_id}",
            permission_used=PermissionLevel.READ,
            success=True,
            details=f"Token Vault stored OAuth token for {service_id} (scopes: {', '.join(scopes)})",
        )

    def exchange_token(self, service_id: str) -> tuple[Optional[str], AuditEntry]:
        """Simulate Token Vault token exchange (RFC 8693).

        This is the core Token Vault operation:
        Auth0 access token → external service access token
        """
        if service_id not in self._tokens:
            audit = AuditEntry(
                timestamp=datetime.now(),
                service="auth0_token_vault",
                action=f"exchange_token:{service_id}",
                permission_used=PermissionLevel.NONE,
                success=False,
                details=f"No stored token for {service_id} — service not connected",
            )
            return None, audit

        token = self._tokens[service_id]["access_token"]
        audit = AuditEntry(
            timestamp=datetime.now(),
            service="auth0_token_vault",
            action=f"exchange_token:{service_id}",
            permission_used=PermissionLevel.READ,
            success=True,
            details=f"Token exchange successful for {service_id} via RFC 8693",
        )
        return token, audit

    def revoke_token(self, service_id: str) -> AuditEntry:
        """Revoke a stored token — per-service granular revocation."""
        was_stored = service_id in self._tokens
        self._tokens.pop(service_id, None)
        return AuditEntry(
            timestamp=datetime.now(),
            service="auth0_token_vault",
            action=f"revoke_token:{service_id}",
            permission_used=PermissionLevel.READ,
            success=True,
            details=(
                f"Token revoked for {service_id}"
                if was_stored
                else f"No token to revoke for {service_id}"
            ),
        )

    def list_connections(self) -> list[str]:
        """List all services with stored tokens."""
        return list(self._tokens.keys())


# Singleton
vault = TokenVaultClient()
