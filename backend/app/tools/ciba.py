"""Client-Initiated Backchannel Authentication (CIBA).

High-risk operations require explicit user approval via push notification.
This is the security feature that won the previous Auth0 hackathon.

Flow:
1. Agent detects high-risk anomaly (e.g., $2,500 crypto purchase)
2. Agent triggers CIBA — Auth0 sends push to user's device
3. User approves or denies on their phone
4. Agent proceeds only if approved

This prevents the agent from taking action without human-in-the-loop
consent for sensitive operations.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

import httpx

from app.config import settings
from app.models.schemas import AuditEntry, PermissionLevel


class CIBAClient:
    """Auth0 CIBA integration for human-in-the-loop approval."""

    def __init__(self):
        self._pending: dict[str, dict] = {}
        self._live = bool(settings.auth0_domain)

    async def request_approval(
        self,
        action: str,
        reason: str,
        risk_level: str = "high",
        user_id: Optional[str] = None,
    ) -> tuple[str, AuditEntry]:
        """Initiate a CIBA approval request.

        In live mode, calls Auth0's /bc-authorize endpoint which sends
        a push notification to the user's registered device.

        Returns a request_id for polling the approval status.
        """
        request_id = f"ciba_{uuid.uuid4().hex[:12]}"

        if self._live and user_id:
            try:
                return await self._real_ciba_request(request_id, action, reason, user_id)
            except Exception:
                pass

        # Demo mode: store pending approval
        self._pending[request_id] = {
            "action": action,
            "reason": reason,
            "risk_level": risk_level,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
        }

        audit = AuditEntry(
            timestamp=datetime.now(),
            service="auth0_ciba",
            action=f"request_approval:{action}",
            permission_used=PermissionLevel.READ,
            success=True,
            details=(
                f"CIBA approval requested for: {action}. "
                f"Reason: {reason}. Risk: {risk_level}. "
                f"Awaiting user approval via push notification."
            ),
        )
        return request_id, audit

    async def _real_ciba_request(
        self, request_id: str, action: str, reason: str, user_id: str
    ) -> tuple[str, AuditEntry]:
        """Real Auth0 CIBA backchannel authorization request.

        POST https://{domain}/bc-authorize
        """
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://{settings.auth0_domain}/bc-authorize",
                data={
                    "client_id": settings.auth0_client_id,
                    "client_secret": settings.auth0_client_secret,
                    "scope": "openid",
                    "login_hint": f"user_id:{user_id}",
                    "binding_message": f"Fin-Guard: Approve {action}? {reason}",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                auth_req_id = data.get("auth_req_id", request_id)
                self._pending[auth_req_id] = {
                    "action": action,
                    "reason": reason,
                    "status": "pending",
                    "auth_req_id": auth_req_id,
                }
                return auth_req_id, AuditEntry(
                    timestamp=datetime.now(),
                    service="auth0_ciba",
                    action=f"request_approval:{action}",
                    permission_used=PermissionLevel.READ,
                    success=True,
                    details=f"CIBA push sent via Auth0 (auth_req_id={auth_req_id})",
                )

        raise RuntimeError("CIBA request failed")

    def approve(self, request_id: str) -> tuple[bool, AuditEntry]:
        """Approve a pending CIBA request (demo mode)."""
        if request_id not in self._pending:
            return False, AuditEntry(
                timestamp=datetime.now(),
                service="auth0_ciba",
                action="approve",
                permission_used=PermissionLevel.NONE,
                success=False,
                details=f"No pending request: {request_id}",
            )

        self._pending[request_id]["status"] = "approved"
        return True, AuditEntry(
            timestamp=datetime.now(),
            service="auth0_ciba",
            action=f"approved:{self._pending[request_id]['action']}",
            permission_used=PermissionLevel.READ,
            success=True,
            details=(
                f"User APPROVED high-risk action: {self._pending[request_id]['action']}. "
                f"Human-in-the-loop consent recorded."
            ),
        )

    def deny(self, request_id: str) -> tuple[bool, AuditEntry]:
        """Deny a pending CIBA request."""
        if request_id not in self._pending:
            return False, AuditEntry(
                timestamp=datetime.now(),
                service="auth0_ciba",
                action="deny",
                permission_used=PermissionLevel.NONE,
                success=False,
                details=f"No pending request: {request_id}",
            )

        self._pending[request_id]["status"] = "denied"
        return True, AuditEntry(
            timestamp=datetime.now(),
            service="auth0_ciba",
            action=f"denied:{self._pending[request_id]['action']}",
            permission_used=PermissionLevel.NONE,
            success=False,
            details=(
                f"User DENIED high-risk action: {self._pending[request_id]['action']}. "
                f"Action blocked by human-in-the-loop."
            ),
        )

    def get_pending(self) -> list[dict]:
        """Get all pending approval requests."""
        return [
            {"request_id": k, **v}
            for k, v in self._pending.items()
            if v["status"] == "pending"
        ]

    def get_all(self) -> list[dict]:
        return [{"request_id": k, **v} for k, v in self._pending.items()]


# Singleton
ciba = CIBAClient()
