"""API routes for Fin-Guard backend."""
from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.agents.guardian import agent
from app.auth import connect_service, disconnect_service, get_connections
from app.models.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    AuditEntry,
    DashboardState,
    ServiceConnection,
)
from app.tools.notifications import clear_alerts, get_alerts
from app.tools.ciba import ciba
from app.tools.fga import fga

router = APIRouter(prefix="/api", tags=["api"])


# ── Dashboard ────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardState)
async def get_dashboard():
    """Get full dashboard state."""
    return DashboardState(
        connections=get_connections(),
        recent_alerts=get_alerts()[-10:],
        audit_log=agent.get_audit_log()[-30:],
        agent_status=agent.status,
    )


# ── Connections (Token Vault) ────────────────────────────────────────────

@router.get("/connections", response_model=list[ServiceConnection])
async def list_connections():
    return get_connections()


@router.post("/connections/{service_id}/connect", response_model=ServiceConnection)
async def connect(service_id: str):
    """Connect a service via Auth0 Token Vault. All connections are READ-ONLY."""
    try:
        return connect_service(service_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/connections/{service_id}/disconnect")
async def disconnect(service_id: str):
    """Disconnect — revoke Token Vault access. Per-service granular revocation."""
    if disconnect_service(service_id):
        return {"status": "disconnected", "service_id": service_id}
    raise HTTPException(status_code=404, detail="Service not connected")


# ── Agent Analysis ───────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalysisResponse)
async def run_analysis(req: Optional[AnalysisRequest] = None):
    """Trigger full analysis with FGA enforcement on every tool call."""
    result = await agent.analyze()
    return result


@router.post("/analyze/demo-blocked-write", response_model=AuditEntry)
async def demo_blocked_write():
    """Demonstrate FGA-enforced write block."""
    # Check FGA first
    blocked_entry = fga.check_blocked("financial_api", "write_transaction")
    if blocked_entry:
        agent.audit_log.append(blocked_entry)
        return blocked_entry
    return agent.demonstrate_blocked_write()


# ── CIBA (Human-in-the-Loop) ────────────────────────────────────────────

@router.post("/ciba/request")
async def ciba_request(action: str = "escalate_alert", reason: str = "High-risk anomaly detected"):
    """Request CIBA approval for a high-risk action.

    Sends push notification to user's device for approval.
    Agent cannot proceed until user approves or denies.
    """
    request_id, audit = await ciba.request_approval(action, reason)
    agent.audit_log.append(audit)
    return {"request_id": request_id, "status": "pending", "action": action}


@router.post("/ciba/{request_id}/approve")
async def ciba_approve(request_id: str):
    """Approve a pending CIBA request."""
    success, audit = ciba.approve(request_id)
    agent.audit_log.append(audit)
    if not success:
        raise HTTPException(status_code=404, detail="No pending request")
    return {"status": "approved", "request_id": request_id}


@router.post("/ciba/{request_id}/deny")
async def ciba_deny(request_id: str):
    """Deny a pending CIBA request."""
    success, audit = ciba.deny(request_id)
    agent.audit_log.append(audit)
    if not success:
        raise HTTPException(status_code=404, detail="No pending request")
    return {"status": "denied", "request_id": request_id}


@router.get("/ciba/pending")
async def ciba_pending():
    """Get all pending CIBA approval requests."""
    return ciba.get_pending()


# ── FGA (Fine-Grained Authorization) ────────────────────────────────────

@router.get("/fga/model")
async def fga_model():
    """Get the full FGA authorization model."""
    return fga.get_model()


@router.get("/fga/permissions")
async def fga_permissions():
    """Get the human-readable permission matrix."""
    return fga.get_permissions_display()


@router.post("/fga/check")
async def fga_check(agent_name: str = "fin-guard", relation: str = "viewer", service: str = "financial_api"):
    """Check a specific FGA permission."""
    allowed, audit = fga.check_permission(agent_name, relation, service)
    agent.audit_log.append(audit)
    return {"allowed": allowed, "agent": agent_name, "relation": relation, "service": service}


# ── Alerts ───────────────────────────────────────────────────────────────

@router.get("/alerts")
async def list_alerts():
    return get_alerts()


@router.post("/alerts/clear")
async def clear_all_alerts():
    clear_alerts()
    return {"status": "cleared"}


# ── Audit Trail ──────────────────────────────────────────────────────────

@router.get("/audit", response_model=list[AuditEntry])
async def get_audit_trail():
    """Full audit trail — every API call the agent has made."""
    return agent.get_audit_log()


@router.post("/audit/clear")
async def clear_audit():
    agent.clear_audit_log()
    return {"status": "cleared"}


# ── Demo Reset ───────────────────────────────────────────────────────────

@router.post("/reset")
async def reset_demo():
    """Reset all state for a fresh demo run."""
    agent.clear_audit_log()
    clear_alerts()
    return {"status": "reset"}
