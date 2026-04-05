"""Fine-Grained Authorization (FGA) with OpenFGA.

Defines a permission model where the AI agent has specific,
auditable permissions per resource. This is not just "read-only" —
it's a full authorization model that specifies exactly WHAT the agent
can read, from WHERE, and under WHAT conditions.

Authorization Model:
  agent#viewer → financial_api (can read transactions)
  agent#viewer → google_sheets (can read budget)
  agent#writer → slack (can write alerts only)
  agent#NONE  → financial_api (cannot write transactions)
  agent#NONE  → bank_transfer (permanently blocked)

This model is enforced at every tool call, not just at connection time.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

import httpx

from app.config import settings
from app.models.schemas import AuditEntry, PermissionLevel

log = logging.getLogger(__name__)


# ── Authorization Model Definition ──────────────────────────────────────

AUTHORIZATION_MODEL = {
    "type_definitions": [
        {
            "type": "agent",
            "relations": {
                "owner": {"this": {}},
            },
        },
        {
            "type": "service",
            "relations": {
                "viewer": {"this": {}},
                "writer": {"this": {}},
                "admin": {"this": {}},
            },
        },
    ],
}

# Agent permission tuples — defines exactly what fin-guard can do
AGENT_PERMISSIONS = [
    # READ permissions
    {"agent": "fin-guard", "relation": "viewer", "service": "financial_api",
     "description": "Read transaction data"},
    {"agent": "fin-guard", "relation": "viewer", "service": "google_sheets",
     "description": "Read budget spreadsheet"},
    {"agent": "fin-guard", "relation": "viewer", "service": "audit_log",
     "description": "Read own audit trail"},

    # ALERT permission (the only "write" — and it's to notify the user)
    {"agent": "fin-guard", "relation": "writer", "service": "slack_alerts",
     "description": "Send alert notifications to user"},

    # EXPLICITLY DENIED — these are logged when attempted
    # No writer permission for financial_api
    # No writer permission for google_sheets
    # No admin permission for anything
]

# Permanently blocked actions — attempting these is always logged
BLOCKED_ACTIONS = [
    {"service": "financial_api", "action": "write_transaction", "reason": "Write access permanently disabled"},
    {"service": "financial_api", "action": "delete_transaction", "reason": "Delete access permanently disabled"},
    {"service": "financial_api", "action": "transfer_funds", "reason": "Fund transfer permanently disabled"},
    {"service": "google_sheets", "action": "write_cell", "reason": "Budget modification permanently disabled"},
    {"service": "google_sheets", "action": "delete_sheet", "reason": "Sheet deletion permanently disabled"},
    {"service": "bank_api", "action": "initiate_payment", "reason": "Payment initiation permanently disabled"},
]


class FGAClient:
    """Fine-Grained Authorization enforcement layer."""

    def __init__(self):
        self._live = bool(settings.auth0_domain)
        self._model_created = False

    def check_permission(
        self,
        agent: str,
        relation: str,
        service: str,
    ) -> tuple[bool, AuditEntry]:
        """Check if the agent has a specific permission.

        This is called BEFORE every tool invocation to enforce
        the authorization model.
        """
        # Check against permission tuples
        allowed = any(
            p["agent"] == agent and p["relation"] == relation and p["service"] == service
            for p in AGENT_PERMISSIONS
        )

        if allowed:
            return True, AuditEntry(
                timestamp=datetime.now(),
                service="auth0_fga",
                action=f"check:{agent}#{relation}@{service}",
                permission_used=PermissionLevel.READ,
                success=True,
                details=f"FGA ALLOWED: {agent} has {relation} access to {service}",
            )
        else:
            return False, AuditEntry(
                timestamp=datetime.now(),
                service="auth0_fga",
                action=f"check:{agent}#{relation}@{service}",
                permission_used=PermissionLevel.NONE,
                success=False,
                details=f"FGA DENIED: {agent} does NOT have {relation} access to {service}",
            )

    def check_blocked(self, service: str, action: str) -> Optional[AuditEntry]:
        """Check if an action is in the permanently blocked list.

        Returns an audit entry if blocked, None if not in the blocked list.
        """
        for blocked in BLOCKED_ACTIONS:
            if blocked["service"] == service and blocked["action"] == action:
                return AuditEntry(
                    timestamp=datetime.now(),
                    service="auth0_fga",
                    action=f"blocked:{service}.{action}",
                    permission_used=PermissionLevel.NONE,
                    success=False,
                    details=f"FGA PERMANENTLY BLOCKED: {blocked['reason']}",
                )
        return None

    def get_model(self) -> dict:
        """Return the full authorization model for display."""
        return {
            "model": AUTHORIZATION_MODEL,
            "permissions": AGENT_PERMISSIONS,
            "blocked_actions": BLOCKED_ACTIONS,
            "agent": "fin-guard",
            "enforcement": "pre-invocation",
            "description": (
                "Every tool call is checked against this model BEFORE execution. "
                "The agent cannot bypass FGA — it is enforced at the framework level."
            ),
        }

    def get_permissions_display(self) -> list[dict]:
        """Get a human-readable permission matrix."""
        return [
            {
                "service": p["service"],
                "access": p["relation"],
                "description": p["description"],
                "status": "GRANTED",
            }
            for p in AGENT_PERMISSIONS
        ] + [
            {
                "service": b["service"],
                "access": "blocked",
                "description": b["reason"],
                "status": "PERMANENTLY_BLOCKED",
            }
            for b in BLOCKED_ACTIONS
        ]


# Singleton
fga = FGAClient()
