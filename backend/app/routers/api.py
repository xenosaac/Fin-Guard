"""API routes for Fin-Guard backend.

All state (connections, audit log, profile) is per-session.
Each visitor gets a unique session with a randomly generated profile.
Session ID is stored in a cookie — closes with the browser.
"""
from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Response

from app.models.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    AuditEntry,
    DashboardState,
    ServiceConnection,
)
from app.session import get_session, Session
from app.tools.notifications import clear_alerts, get_alerts
from app.tools.ciba import ciba
from app.tools.fga import fga
from app.tools.scenarios import scenario_engine
from app.tools.security_score import scorer
from app.agents.chat import chat as agent_chat, get_history, clear_history

router = APIRouter(prefix="/api", tags=["api"])

COOKIE_NAME = "fg_session"


def _get_sess(request: Request, response: Response) -> Session:
    """Get or create a per-visitor session."""
    sid = request.cookies.get(COOKIE_NAME)
    sid, sess = get_session(sid)
    response.set_cookie(
        COOKIE_NAME, sid,
        httponly=True, samesite="lax", max_age=86400,
    )
    return sess


# ── Dashboard ────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard(request: Request, response: Response):
    """Get full dashboard state (per-session)."""
    sess = _get_sess(request, response)
    return {
        "connections": [c.model_dump() for c in sess.get_connections()],
        "recent_alerts": get_alerts()[-10:],
        "audit_log": [e.model_dump() for e in sess.audit_log[-30:]],
        "agent_status": "idle",
    }


# ── Connections (Token Vault) ────────────────────────────────────────────

@router.get("/connections")
async def list_connections(request: Request, response: Response):
    sess = _get_sess(request, response)
    return [c.model_dump() for c in sess.get_connections()]


@router.post("/connections/{service_id}/connect")
async def connect(service_id: str, request: Request, response: Response):
    """Connect a service via Auth0 Token Vault. All connections are READ-ONLY."""
    sess = _get_sess(request, response)
    try:
        return sess.connect_service(service_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/connections/{service_id}/disconnect")
async def disconnect(service_id: str, request: Request, response: Response):
    """Disconnect — revoke Token Vault access."""
    sess = _get_sess(request, response)
    if sess.disconnect_service(service_id):
        return {"status": "disconnected", "service_id": service_id}
    raise HTTPException(status_code=404, detail="Service not connected")


# ── Agent Analysis ───────────────────────────────────────────────────────

@router.post("/analyze")
async def run_analysis(request: Request, response: Response):
    """Trigger full analysis with FGA enforcement on every tool call."""
    from app.agents.guardian import agent
    sess = _get_sess(request, response)
    result = await agent.analyze()
    # Copy audit entries to session
    for entry in agent.audit_log[-20:]:
        if entry not in sess.audit_log:
            sess.audit_log.append(entry)
    return result


@router.post("/analyze/demo-blocked-write")
async def demo_blocked_write(request: Request, response: Response):
    """Demonstrate FGA-enforced write block."""
    sess = _get_sess(request, response)
    blocked_entry = fga.check_blocked("financial_api", "write_transaction")
    if blocked_entry:
        sess.audit_log.append(blocked_entry)
        return blocked_entry
    from app.agents.guardian import agent
    entry = agent.demonstrate_blocked_write()
    sess.audit_log.append(entry)
    return entry


# ── CIBA (Human-in-the-Loop) ────────────────────────────────────────────

@router.post("/ciba/request")
async def ciba_request(
    request: Request, response: Response,
    action: str = "escalate_alert",
    reason: str = "High-risk anomaly detected",
):
    sess = _get_sess(request, response)
    request_id, audit = await ciba.request_approval(action, reason)
    sess.audit_log.append(audit)
    return {"request_id": request_id, "status": "pending", "action": action}


@router.post("/ciba/{request_id}/approve")
async def ciba_approve(request_id: str, request: Request, response: Response):
    sess = _get_sess(request, response)
    success, audit = ciba.approve(request_id)
    sess.audit_log.append(audit)
    if not success:
        raise HTTPException(status_code=404, detail="No pending request")
    return {"status": "approved", "request_id": request_id}


@router.post("/ciba/{request_id}/deny")
async def ciba_deny(request_id: str, request: Request, response: Response):
    sess = _get_sess(request, response)
    success, audit = ciba.deny(request_id)
    sess.audit_log.append(audit)
    if not success:
        raise HTTPException(status_code=404, detail="No pending request")
    return {"status": "denied", "request_id": request_id}


@router.get("/ciba/pending")
async def ciba_pending():
    return ciba.get_pending()


# ── FGA (Fine-Grained Authorization) ────────────────────────────────────

@router.get("/fga/model")
async def fga_model():
    return fga.get_model()


@router.get("/fga/permissions")
async def fga_permissions():
    return fga.get_permissions_display()


@router.post("/fga/check")
async def fga_check(
    request: Request, response: Response,
    agent_name: str = "fin-guard", relation: str = "viewer",
    service: str = "financial_api",
):
    sess = _get_sess(request, response)
    allowed, audit = fga.check_permission(agent_name, relation, service)
    sess.audit_log.append(audit)
    return {"allowed": allowed, "agent": agent_name, "relation": relation, "service": service}


# ── Chat (conversational agent) ──────────────────────────────────────────

@router.post("/chat")
async def chat_endpoint(message: str = "What can you do?"):
    return await agent_chat(message)


@router.get("/chat/history")
async def chat_history():
    return get_history()


@router.post("/chat/clear")
async def chat_clear():
    clear_history()
    return {"status": "cleared"}


# ── Threat Scenarios ────────────────────────────────────────────────

@router.get("/scenarios")
async def list_scenarios():
    return scenario_engine.list_scenarios()


@router.get("/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    try:
        return scenario_engine.get_scenario(scenario_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Scenario not found")


@router.post("/scenarios/{scenario_id}/step/{step_number}")
async def execute_scenario_step(
    scenario_id: str, step_number: int,
    request: Request, response: Response,
):
    sess = _get_sess(request, response)
    try:
        result = await scenario_engine.execute_step(scenario_id, step_number)
        for entry_data in result["audit_entries"]:
            sess.audit_log.append(AuditEntry(**entry_data))
        return result
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/scenarios/{scenario_id}/run")
async def run_full_scenario(
    scenario_id: str,
    request: Request, response: Response,
):
    sess = _get_sess(request, response)
    try:
        results = await scenario_engine.execute_full_scenario(scenario_id)
        for r in results:
            for entry_data in r["audit_entries"]:
                sess.audit_log.append(AuditEntry(**entry_data))
        return results
    except KeyError:
        raise HTTPException(status_code=404, detail="Scenario not found")


# ── Security Score ──────────────────────────────────────────────────

@router.get("/security-score")
async def security_score(request: Request, response: Response):
    sess = _get_sess(request, response)
    # Pass session connections to scorer
    return scorer.calculate_for_session(sess)


@router.get("/security-score/trend")
async def security_score_trend():
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

@router.get("/audit")
async def get_audit_trail(request: Request, response: Response):
    sess = _get_sess(request, response)
    return [e.model_dump() for e in sess.audit_log]


@router.post("/audit/clear")
async def clear_audit(request: Request, response: Response):
    sess = _get_sess(request, response)
    sess.audit_log.clear()
    return {"status": "cleared"}


# ── Accounts (per-session) ─────────────────────────────────────────────

@router.get("/accounts")
async def list_accounts(request: Request, response: Response):
    sess = _get_sess(request, response)
    allowed, fga_audit = fga.check_permission("fin-guard", "viewer", "financial_api")
    sess.audit_log.append(fga_audit)
    return sess.accounts


@router.get("/accounts/{account_id}")
async def get_single_account(account_id: str, request: Request, response: Response):
    sess = _get_sess(request, response)
    allowed, fga_audit = fga.check_permission("fin-guard", "viewer", "financial_api")
    sess.audit_log.append(fga_audit)
    acct = next((a for a in sess.accounts if a["id"] == account_id), None)
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    return acct


@router.get("/accounts/{account_id}/transactions")
async def account_transactions(account_id: str, request: Request, response: Response, days: int = 30):
    sess = _get_sess(request, response)
    allowed, fga_audit = fga.check_permission("fin-guard", "viewer", "financial_api")
    sess.audit_log.append(fga_audit)
    from app.tools.accounts import get_account_transactions as _txns
    try:
        return _txns(account_id, days)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/accounts/{account_id}/balance-history")
async def account_balance_history(account_id: str, request: Request, response: Response, days: int = 7):
    sess = _get_sess(request, response)
    allowed, fga_audit = fga.check_permission("fin-guard", "viewer", "financial_api")
    sess.audit_log.append(fga_audit)
    from app.tools.accounts import get_balance_history as _bh
    try:
        return _bh(account_id, days)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── User Profile (per-session) ─────────────────────────────────────────

@router.get("/user/profile")
async def user_profile(request: Request, response: Response):
    sess = _get_sess(request, response)
    return sess.profile


@router.post("/user/profile")
async def update_user_profile(updates: dict, request: Request, response: Response):
    sess = _get_sess(request, response)
    safe_keys = {"name", "nickname", "phone", "birthday", "address"}
    for key, value in updates.items():
        if key in safe_keys:
            sess.profile[key] = value
    return sess.profile


# ── Demo Reset ───────────────────────────────────────────────────────────

@router.post("/reset")
async def reset_demo(request: Request, response: Response):
    """Reset session state for a fresh demo run."""
    sess = _get_sess(request, response)
    sess.audit_log.clear()
    sess.connections.clear()
    clear_alerts()
    return {"status": "reset"}
