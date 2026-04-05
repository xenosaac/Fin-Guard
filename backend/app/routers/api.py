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
from app.tools.accounts import (
    get_accounts as _get_accounts,
    get_account as _get_account,
    get_account_transactions as _get_account_transactions,
    get_balance_history as _get_balance_history,
    get_profile as _get_profile,
    update_profile as _update_profile,
)
from app.tools.notifications import clear_alerts, get_alerts
from app.tools.ciba import ciba
from app.tools.fga import fga
from app.tools.scenarios import scenario_engine
from app.tools.security_score import scorer
from app.agents.chat import chat as agent_chat, get_history, clear_history

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


# ── Chat (conversational agent) ──────────────────────────────────────────

@router.post("/chat")
async def chat_endpoint(message: str = "What can you do?"):
    """Chat with Fin-Guard agent. The agent uses tools with FGA enforcement."""
    return await agent_chat(message)


@router.get("/chat/history")
async def chat_history():
    """Get conversation history."""
    return get_history()


@router.post("/chat/clear")
async def chat_clear():
    """Clear conversation history."""
    clear_history()
    return {"status": "cleared"}


# ── Threat Scenarios ────────────────────────────────────────────────

@router.get("/scenarios")
async def list_scenarios():
    """List all available attack scenarios (metadata only)."""
    return scenario_engine.list_scenarios()


@router.get("/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    """Get full scenario including all steps."""
    try:
        return scenario_engine.get_scenario(scenario_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Scenario not found")


@router.post("/scenarios/{scenario_id}/step/{step_number}")
async def execute_scenario_step(scenario_id: str, step_number: int):
    """Execute a single attack scenario step against real security layers."""
    try:
        result = await scenario_engine.execute_step(scenario_id, step_number)
        # Also push audit entries to the main agent log
        for entry_data in result["audit_entries"]:
            agent.audit_log.append(AuditEntry(**entry_data))
        return result
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/scenarios/{scenario_id}/run")
async def run_full_scenario(scenario_id: str):
    """Execute all steps of a scenario in sequence."""
    try:
        results = await scenario_engine.execute_full_scenario(scenario_id)
        for r in results:
            for entry_data in r["audit_entries"]:
                agent.audit_log.append(AuditEntry(**entry_data))
        return results
    except KeyError:
        raise HTTPException(status_code=404, detail="Scenario not found")


# ── Security Score ──────────────────────────────────────────────────

@router.get("/security-score")
async def security_score():
    """Get current security posture score with dimension breakdown."""
    return scorer.calculate()


@router.get("/security-score/trend")
async def security_score_trend():
    """Get 7-day score trend for sparkline chart."""
    return scorer.get_trend()


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


# ── Accounts ────────────────────────────────────────────────────────────


@router.get("/accounts")
async def list_accounts():
    """List all linked bank accounts."""
    allowed, fga_audit = fga.check_permission("fin-guard", "viewer", "financial_api")
    agent.audit_log.append(fga_audit)
    if not allowed:
        raise HTTPException(status_code=403, detail="FGA: read not permitted")
    return _get_accounts()


@router.get("/accounts/{account_id}")
async def get_single_account(account_id: str):
    """Get details for a single account."""
    allowed, fga_audit = fga.check_permission("fin-guard", "viewer", "financial_api")
    agent.audit_log.append(fga_audit)
    if not allowed:
        raise HTTPException(status_code=403, detail="FGA: read not permitted")
    try:
        return _get_account(account_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/accounts/{account_id}/transactions")
async def account_transactions(account_id: str, days: int = 30):
    """Get mock transactions for an account."""
    allowed, fga_audit = fga.check_permission("fin-guard", "viewer", "financial_api")
    agent.audit_log.append(fga_audit)
    if not allowed:
        raise HTTPException(status_code=403, detail="FGA: read not permitted")
    try:
        return _get_account_transactions(account_id, days)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/accounts/{account_id}/balance-history")
async def account_balance_history(account_id: str, days: int = 7):
    """Get daily closing balance history for an account."""
    allowed, fga_audit = fga.check_permission("fin-guard", "viewer", "financial_api")
    agent.audit_log.append(fga_audit)
    if not allowed:
        raise HTTPException(status_code=403, detail="FGA: read not permitted")
    try:
        return _get_balance_history(account_id, days)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── User Profile ────────────────────────────────────────────────────────


@router.get("/user/profile")
async def user_profile():
    """Get the current user profile."""
    allowed, fga_audit = fga.check_permission("fin-guard", "viewer", "financial_api")
    agent.audit_log.append(fga_audit)
    if not allowed:
        raise HTTPException(status_code=403, detail="FGA: read not permitted")
    return _get_profile()


@router.post("/user/profile")
async def update_user_profile(updates: dict):
    """Update user profile fields (demo only)."""
    allowed, fga_audit = fga.check_permission("fin-guard", "viewer", "financial_api")
    agent.audit_log.append(fga_audit)
    if not allowed:
        raise HTTPException(status_code=403, detail="FGA: write not permitted")
    return _update_profile(updates)


# ── Demo Reset ───────────────────────────────────────────────────────────

@router.post("/reset")
async def reset_demo():
    """Reset all state for a fresh demo run."""
    agent.clear_audit_log()
    clear_alerts()
    return {"status": "reset"}
