"""Pydantic models for API request/response schemas."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Permission Model ─────────────────────────────────────────────────────────

class PermissionLevel(str, Enum):
    READ = "read"
    NONE = "none"
    # NOTE: no WRITE level — Fin-Guard is read-only by design


class ServiceConnection(BaseModel):
    """A connected third-party service via Auth0 Token Vault."""
    service_id: str
    service_name: str  # "Google Sheets", "Slack", "Financial API"
    permission: PermissionLevel = PermissionLevel.READ
    connected: bool = False
    connected_at: Optional[datetime] = None
    scopes: list[str] = Field(default_factory=list)


# ── Transaction & Alert Models ───────────────────────────────────────────────

class Transaction(BaseModel):
    id: str
    date: datetime
    description: str
    amount: float
    category: str
    merchant: str = ""
    is_anomaly: bool = False
    anomaly_reason: str = ""


class Alert(BaseModel):
    id: str
    timestamp: datetime
    title: str
    description: str
    severity: str = "medium"  # low, medium, high
    transaction_id: Optional[str] = None
    notified_via: list[str] = Field(default_factory=list)  # ["slack", "in_app"]
    acknowledged: bool = False


class SpendingThreshold(BaseModel):
    """User-defined threshold for anomaly detection."""
    category: str = "all"
    max_amount: float = 500.0
    daily_limit: float = 1000.0
    enabled: bool = True


# ── Audit Trail ──────────────────────────────────────────────────────────────

class AuditEntry(BaseModel):
    """Every API call the agent makes is logged here."""
    timestamp: datetime
    service: str
    action: str  # "read_transactions", "read_budget", "send_alert"
    permission_used: PermissionLevel
    success: bool
    details: str = ""


# ── Agent Messages ───────────────────────────────────────────────────────────

class AgentMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class AnalysisRequest(BaseModel):
    prompt: str = "Analyze my recent transactions for unusual spending patterns."


class AnalysisResponse(BaseModel):
    summary: str
    alerts: list[Alert] = Field(default_factory=list)
    transactions_scanned: int = 0
    anomalies_found: int = 0


# ── Dashboard ────────────────────────────────────────────────────────────────

class DashboardState(BaseModel):
    connections: list[ServiceConnection] = Field(default_factory=list)
    recent_alerts: list[Alert] = Field(default_factory=list)
    audit_log: list[AuditEntry] = Field(default_factory=list)
    thresholds: list[SpendingThreshold] = Field(default_factory=list)
    agent_status: str = "idle"  # idle, analyzing, alerting
