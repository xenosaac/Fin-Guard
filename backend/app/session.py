"""Per-session state management for Fin-Guard.

Each visitor gets an isolated session with:
- Their own randomly generated profile
- Their own connection state
- Their own audit log
- Their own CIBA requests
- Their own chat history

Session ID is stored in a cookie. State resets when browser closes.
"""
from __future__ import annotations

import random
import uuid
from datetime import datetime
from typing import Optional

from app.models.schemas import AuditEntry, PermissionLevel, ServiceConnection

# ── Random profile generation ──────────────────────────────────────────────

_FIRST_NAMES = [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey",
    "Riley", "Quinn", "Avery", "Dakota", "Reese",
    "Jamie", "Skyler", "Drew", "Blake", "Cameron",
    "Sage", "River", "Phoenix", "Robin", "Kai",
]
_LAST_NAMES = [
    "Chen", "Park", "Nguyen", "Kim", "Singh",
    "Patel", "Garcia", "Martinez", "Lee", "Wang",
    "Torres", "Rivera", "Hall", "Young", "Wright",
    "Lopez", "Hill", "Scott", "Adams", "Baker",
]
_CITIES = [
    ("San Francisco", "CA", "94107"),
    ("New York", "NY", "10013"),
    ("Austin", "TX", "78701"),
    ("Seattle", "WA", "98101"),
    ("Los Angeles", "CA", "90012"),
    ("Chicago", "IL", "60601"),
    ("Boston", "MA", "02101"),
    ("Denver", "CO", "80202"),
    ("Portland", "OR", "97201"),
    ("Miami", "FL", "33101"),
]


def _generate_profile() -> dict:
    """Generate a random but realistic user profile."""
    first = random.choice(_FIRST_NAMES)
    last = random.choice(_LAST_NAMES)
    city, state, zip_code = random.choice(_CITIES)
    fico = random.randint(680, 820)
    street_num = random.randint(100, 9999)
    streets = ["Market St", "Oak Ave", "Pine Blvd", "Main St", "Tech Drive", "Innovation Way"]

    return {
        "id": f"user_{uuid.uuid4().hex[:8]}",
        "name": f"{first} {last}",
        "nickname": first,
        "email": f"{first.lower()}.{last.lower()}@example.com",
        "phone": f"+1 ({random.randint(200,999)}) {random.randint(100,999)}-{random.randint(1000,9999)}",
        "birthday": f"{random.randint(1985,2002)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
        "address": f"{street_num} {random.choice(streets)}, {city}, {state} {zip_code}",
        "member_since": "2025-03-01",
        "auth_provider": "google-oauth2",
        "fico_score": fico,
        "credit_utilization": round(random.uniform(0.08, 0.45), 2),
    }


def _generate_accounts(profile_name: str) -> list[dict]:
    """Generate random account balances for each session."""
    checking_bal = round(random.uniform(3200, 28000), 2)
    savings_bal = round(random.uniform(12000, 85000), 2)
    invest_bal = round(random.uniform(35000, 250000), 2)
    last4_a = f"{random.randint(1000,9999)}"
    last4_b = f"{random.randint(1000,9999)}"
    last4_c = f"{random.randint(1000,9999)}"

    return [
        {
            "id": f"checking_{last4_a}",
            "name": "Primary Checking",
            "type": "checking",
            "last_four": last4_a,
            "balance": checking_bal,
            "routing_masked": f"****{random.randint(1000,9999)}",
            "opened_date": f"{random.randint(2017,2023)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            "status": "active",
        },
        {
            "id": f"savings_{last4_b}",
            "name": "Emergency Savings",
            "type": "savings",
            "last_four": last4_b,
            "balance": savings_bal,
            "routing_masked": f"****{random.randint(1000,9999)}",
            "opened_date": f"{random.randint(2018,2024)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            "status": "active",
        },
        {
            "id": f"investment_{last4_c}",
            "name": "Brokerage Account",
            "type": "investment",
            "last_four": last4_c,
            "balance": invest_bal,
            "routing_masked": "N/A",
            "opened_date": f"{random.randint(2019,2024)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            "status": "active",
        },
    ]


# ── Service registry (shared, not per-session) ────────────────────────────

SERVICE_REGISTRY = {
    "financial_api": {
        "name": "Financial Account (Plaid)",
        "scopes": ["transactions:read", "accounts:read"],
    },
    "google_sheets": {
        "name": "Google Sheets",
        "scopes": ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    },
    "slack": {
        "name": "Slack",
        "scopes": ["chat:write", "channels:read"],
    },
}


# ── Session class ──────────────────────────────────────────────────────────

class Session:
    """Isolated per-visitor state."""

    def __init__(self):
        self.profile = _generate_profile()
        self.accounts = _generate_accounts(self.profile["name"])
        self.connections: dict[str, ServiceConnection] = {}
        self.audit_log: list[AuditEntry] = []
        self.created_at = datetime.now()

    def get_connections(self) -> list[ServiceConnection]:
        result = []
        for svc_id, reg in SERVICE_REGISTRY.items():
            if svc_id in self.connections:
                result.append(self.connections[svc_id])
            else:
                result.append(ServiceConnection(
                    service_id=svc_id,
                    service_name=reg["name"],
                    permission=PermissionLevel.NONE,
                    connected=False,
                    scopes=reg["scopes"],
                ))
        return result

    def connect_service(self, service_id: str) -> ServiceConnection:
        if service_id not in SERVICE_REGISTRY:
            raise ValueError(f"Unknown service: {service_id}")
        reg = SERVICE_REGISTRY[service_id]

        # Audit: token vault store
        self.audit_log.append(AuditEntry(
            timestamp=datetime.now(),
            service="auth0_token_vault",
            action=f"store_token:{service_id}",
            permission_used=PermissionLevel.READ,
            success=True,
            details=f"Token Vault stored OAuth token for {service_id} (scopes: {', '.join(reg['scopes'])})",
        ))
        # Audit: token exchange
        self.audit_log.append(AuditEntry(
            timestamp=datetime.now(),
            service="auth0_token_vault",
            action=f"exchange_token:{service_id}",
            permission_used=PermissionLevel.READ,
            success=True,
            details=f"Token exchange successful for {service_id} via RFC 8693 (mode=demo)",
        ))

        conn = ServiceConnection(
            service_id=service_id,
            service_name=reg["name"],
            permission=PermissionLevel.READ,
            connected=True,
            connected_at=datetime.now(),
            scopes=reg["scopes"],
        )
        self.connections[service_id] = conn
        return conn

    def disconnect_service(self, service_id: str) -> bool:
        if service_id in self.connections:
            self.audit_log.append(AuditEntry(
                timestamp=datetime.now(),
                service="auth0_token_vault",
                action=f"revoke_token:{service_id}",
                permission_used=PermissionLevel.READ,
                success=True,
                details=f"Token revoked for {service_id}",
            ))
            del self.connections[service_id]
            return True
        return False

    def is_connected(self, service_id: str) -> bool:
        return service_id in self.connections and self.connections[service_id].connected

    def get_initials(self) -> str:
        parts = self.profile["name"].split()
        return "".join(p[0] for p in parts[:2]).upper()


# ── Session store ──────────────────────────────────────────────────────────

_sessions: dict[str, Session] = {}


def get_session(session_id: Optional[str]) -> tuple[str, Session]:
    """Get or create a session. Returns (session_id, session)."""
    if session_id and session_id in _sessions:
        return session_id, _sessions[session_id]

    # New session
    new_id = uuid.uuid4().hex[:16]
    session = Session()
    _sessions[new_id] = session
    return new_id, session


def clear_session(session_id: str) -> None:
    """Remove a session."""
    _sessions.pop(session_id, None)
