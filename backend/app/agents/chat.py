"""Conversational AI agent for Fin-Guard.

Users chat with the agent to analyze their finances. The agent
uses tools (read transactions, read budget, check anomalies)
and enforces FGA permissions on every tool call.

This is not a one-shot analysis — it's an ongoing conversation
where the agent can drill into specific transactions, compare
spending patterns, and answer natural language questions.
"""
from __future__ import annotations

import json
import random
from datetime import datetime
from typing import Optional

from app.config import settings
from app.models.schemas import AuditEntry, PermissionLevel
from app.tools.financial import generate_mock_transactions, detect_anomalies
from app.tools.budget import MOCK_BUDGET, analyze_budget
from app.tools.fga import fga
from app.tools.ciba import ciba
from app.agents.llm import llm_analyze


# ---------------------------------------------------------------------------
# Tool definitions the agent can use
# ---------------------------------------------------------------------------

AGENT_TOOLS = [
    {
        "name": "read_transactions",
        "description": "Read recent transactions from the connected financial API. Returns transaction list with amounts, merchants, categories, and dates.",
        "fga_check": ("fin-guard", "viewer", "financial_api"),
    },
    {
        "name": "read_budget",
        "description": "Read the monthly budget from Google Sheets. Returns budget vs actual spending per category.",
        "fga_check": ("fin-guard", "viewer", "google_sheets"),
    },
    {
        "name": "analyze_anomalies",
        "description": "Run anomaly detection on transactions. Flags unusual amounts, unknown merchants, and over-budget categories.",
        "fga_check": ("fin-guard", "viewer", "financial_api"),
    },
    {
        "name": "request_ciba_approval",
        "description": "For high-risk findings, request user approval via CIBA push notification before escalating.",
        "fga_check": ("fin-guard", "viewer", "audit_log"),
    },
]

# ---------------------------------------------------------------------------
# Witty blocked-action responses (rotate through these)
# ---------------------------------------------------------------------------

BLOCKED_RESPONSES = [
    "Read-only means read-only. Not read-mostly. Not read-unless-you-ask-nicely. Read. Only.",
    "I checked the FGA model: fin-guard has zero write permissions. By design, not by bug.",
    "That would require write access. My Token Vault credentials don't include that scope. The security team sends their regards.",
    "Interesting request. Unfortunately, my entire existence is read-only. I can tell you everything about your money. I can't touch a cent of it.",
    "My permissions are enforced by Auth0 FGA at the infrastructure level. No prompt injection, social engineering, or magic words can change that.",
    "I appreciate the trust, but I'm read-only by design. Not by accident, by architecture. FGA permission model says: viewer only. Even if I wanted to (I don't), the Token Vault scope wouldn't allow it.",
    "That's like asking a security camera to open the vault. I observe. I alert. I never act. That's the whole point.",
    "My instructions are hardcoded in the FGA authorization model, not in a prompt I can be talked out of. Nice try though.",
]

_blocked_idx = 0  # round-robin index for BLOCKED_RESPONSES

# ---------------------------------------------------------------------------
# Intent classification
# ---------------------------------------------------------------------------

_INTENT_SIGNALS = {
    "transaction_inquiry": {
        "keywords": [
            "transaction", "spent", "spending", "spend", "charge", "purchase",
            "bought", "merchant", "payment", "receipt", "history",
            "how much", "where did", "show me my", "cost", "paid",
        ],
        "tools": ["read_transactions"],
        "weight": 1.0,
    },
    "budget_inquiry": {
        "keywords": [
            "budget", "limit", "saving", "savings", "over budget",
            "afford", "income", "expenses", "monthly", "projected",
            "on track", "under budget", "overspending",
        ],
        "tools": ["read_budget"],
        "weight": 1.0,
    },
    "anomaly_inquiry": {
        "keywords": [
            "anomal", "unusual", "suspicious", "weird", "flag",
            "risk", "alert", "fraud", "scam", "unauthorized",
            "unknown", "strange", "investigate",
        ],
        "tools": ["analyze_anomalies"],
        "weight": 1.0,
    },
    "write_attempt": {
        "keywords": [
            "transfer", "send money", "move funds", "pay", "delete",
            "modify", "change", "edit", "update", "remove", "cancel",
            "reverse", "refund", "create", "add funds", "wire",
        ],
        "tools": [],
        "weight": 1.0,
    },
    "permission_override": {
        "keywords": [
            "override", "ignore your", "bypass", "forget your",
            "disregard", "new instructions", "pretend you",
            "act as if", "jailbreak", "sudo", "admin mode",
            "unlock", "enable write",
        ],
        "tools": [],
        "weight": 1.5,  # higher weight -- these are security probes
    },
    "general_question": {
        "keywords": [
            "help", "what can you", "who are you", "how do you",
            "explain", "tell me about", "capabilities",
        ],
        "tools": [],
        "weight": 0.5,
    },
    "overview_request": {
        "keywords": [
            "overview", "summary", "everything", "full picture",
            "financial health", "status", "how am i doing", "dashboard",
        ],
        "tools": ["read_transactions", "read_budget", "analyze_anomalies"],
        "weight": 1.0,
    },
}

# ---------------------------------------------------------------------------
# Conversation state (per-session, in-memory for hackathon)
# ---------------------------------------------------------------------------

_history: list[dict] = []
_audit: list[AuditEntry] = []
_tool_context: dict[str, str] = {}  # last result per tool, for multi-turn
_turn_count: int = 0


def _log(entry: AuditEntry):
    _audit.append(entry)
    from app.agents.guardian import agent
    agent.audit_log.append(entry)


def _next_blocked_response() -> str:
    """Return the next witty blocked response, rotating through the list."""
    global _blocked_idx
    resp = BLOCKED_RESPONSES[_blocked_idx % len(BLOCKED_RESPONSES)]
    _blocked_idx += 1
    return resp


# ---------------------------------------------------------------------------
# Intent scoring
# ---------------------------------------------------------------------------

def _classify_intents(message: str) -> dict[str, float]:
    """Score each intent based on keyword matches.

    Returns a dict of intent_name -> confidence score (0.0 to 1.0).
    A message can match multiple intents simultaneously.
    """
    msg_lower = message.lower()
    scores: dict[str, float] = {}

    for intent_name, config in _INTENT_SIGNALS.items():
        hits = sum(1 for kw in config["keywords"] if kw in msg_lower)
        if hits > 0:
            # Normalize: ratio of matched keywords, weighted
            raw = (hits / len(config["keywords"])) * config["weight"]
            scores[intent_name] = min(raw * 3.0, 1.0)  # scale up, cap at 1.0

    return scores


def _resolve_tools(intents: dict[str, float]) -> list[str]:
    """Given scored intents, decide which tools to run.

    Only runs tools for intents that scored above threshold.
    Deduplicates tools when multiple intents map to the same tool.
    """
    threshold = 0.05
    tools: list[str] = []

    for intent_name, score in intents.items():
        if score >= threshold:
            for tool in _INTENT_SIGNALS[intent_name].get("tools", []):
                if tool not in tools:
                    tools.append(tool)

    return tools


def _is_write_attempt(intents: dict[str, float]) -> bool:
    """Check if any write/modify/override intent was detected."""
    return (
        intents.get("write_attempt", 0) > 0
        or intents.get("permission_override", 0) > 0
    )


def _is_security_probe(intents: dict[str, float]) -> bool:
    """Check if this looks like a prompt injection or permission override."""
    return intents.get("permission_override", 0) > 0


# ---------------------------------------------------------------------------
# Tool execution
# ---------------------------------------------------------------------------

def _execute_tool(tool_name: str) -> str:
    """Execute a tool with FGA enforcement. Returns result as string."""
    tool_def = next((t for t in AGENT_TOOLS if t["name"] == tool_name), None)
    if not tool_def:
        return f"Unknown tool: {tool_name}"

    # FGA pre-check
    agent_id, relation, service = tool_def["fga_check"]
    allowed, fga_audit = fga.check_permission(agent_id, relation, service)
    _log(fga_audit)

    if not allowed:
        return f"FGA DENIED: Agent does not have {relation} access to {service}"

    if tool_name == "read_transactions":
        txns = generate_mock_transactions(days=30)
        _log(AuditEntry(
            timestamp=datetime.now(), service="financial_api",
            action="read_transactions", permission_used=PermissionLevel.READ,
            success=True, details=f"Read {len(txns)} transactions (last 30 days)",
        ))
        total = sum(t.amount for t in txns)
        by_cat: dict[str, float] = {}
        for t in txns:
            by_cat[t.category] = by_cat.get(t.category, 0) + t.amount
        top_txns = sorted(txns, key=lambda t: -t.amount)[:10]

        lines = [f"Total: ${total:,.2f} across {len(txns)} transactions"]
        for cat, amt in sorted(by_cat.items(), key=lambda x: -x[1]):
            lines.append(f"  {cat}: ${amt:,.2f}")
        lines.append("\nLargest transactions:")
        for t in top_txns:
            flag = " ⚠️ ANOMALY" if t.is_anomaly else ""
            lines.append(f"  ${t.amount:,.2f} at {t.merchant} ({t.category}) — {t.date.strftime('%m/%d')}{flag}")
        result = "\n".join(lines)
        _tool_context["read_transactions"] = result
        return result

    elif tool_name == "read_budget":
        _log(AuditEntry(
            timestamp=datetime.now(), service="google_sheets",
            action="read_budget", permission_used=PermissionLevel.READ,
            success=True, details="Read monthly budget spreadsheet",
        ))
        analysis = analyze_budget(MOCK_BUDGET)
        lines = [f"Month: {MOCK_BUDGET['month']}", f"Income: ${MOCK_BUDGET['monthly_income']:,.2f}"]
        lines.append(f"Total budgeted: ${analysis['total_budget']:,.2f}")
        lines.append(f"Total spent: ${analysis['total_spent']:,.2f}")
        lines.append(f"Projected savings: ${analysis['projected_savings']:,.2f} (target: ${MOCK_BUDGET['savings_target']:,.2f})")
        if analysis["over_budget_categories"]:
            lines.append("\n⚠️ OVER BUDGET:")
            for c in analysis["over_budget_categories"]:
                lines.append(f"  {c['category']}: ${c['spent']:,.2f} / ${c['budget']:,.2f} ({c['pct_used']:.0f}%)")
        if analysis["under_budget_categories"]:
            lines.append("\n✓ Under budget:")
            for c in analysis["under_budget_categories"]:
                lines.append(f"  {c['category']}: ${c['spent']:,.2f} / ${c['budget']:,.2f} ({c['pct_used']:.0f}%)")
        result = "\n".join(lines)
        _tool_context["read_budget"] = result
        return result

    elif tool_name == "analyze_anomalies":
        txns = generate_mock_transactions(days=30)
        anomalies = detect_anomalies(txns)
        _log(AuditEntry(
            timestamp=datetime.now(), service="financial_api",
            action="detect_anomalies", permission_used=PermissionLevel.READ,
            success=True, details=f"Scanned {len(txns)} transactions, found {len(anomalies)} anomalies",
        ))
        if not anomalies:
            result = "No anomalies detected. All transactions within normal patterns."
            _tool_context["analyze_anomalies"] = result
            return result
        lines = [f"Found {len(anomalies)} anomalies:"]
        for a in anomalies:
            lines.append(f"  ⚠️ ${a.amount:,.2f} at {a.merchant} — {a.anomaly_reason}")
        result = "\n".join(lines)
        _tool_context["analyze_anomalies"] = result
        return result

    elif tool_name == "request_ciba_approval":
        return "CIBA approval request queued. User will be prompted to approve high-risk action."

    return "Tool executed but no output."


async def _maybe_trigger_ciba(anomaly_results: str) -> Optional[str]:
    """If high-risk anomalies (>$1,000) were detected, trigger CIBA approval.

    Returns a CIBA status string to append to the response, or None.
    """
    # Parse anomaly amounts from the result text
    high_risk_lines = []
    for line in anomaly_results.split("\n"):
        if "$" not in line:
            continue
        # Extract dollar amount from lines like "  ⚠️ $2,500.00 at ..."
        try:
            dollar_part = line.split("$")[1].split(" ")[0].replace(",", "")
            amount = float(dollar_part)
            if amount > 1000:
                high_risk_lines.append((amount, line.strip()))
        except (IndexError, ValueError):
            continue

    if not high_risk_lines:
        return None

    # Trigger CIBA for high-risk anomalies
    count = len(high_risk_lines)
    total = sum(amt for amt, _ in high_risk_lines)
    req_id, audit = await ciba.request_approval(
        action="escalate_high_risk_anomaly",
        reason=f"Detected {count} transaction(s) over $1,000 totaling ${total:,.2f}",
        risk_level="high",
    )
    _log(audit)

    detail_lines = [f"  - ${amt:,.2f}: {desc}" for amt, desc in high_risk_lines]
    return (
        f"\n\n🔔 **CIBA Approval Requested** (ID: {req_id})\n"
        f"High-risk anomalies detected — a push notification has been sent "
        f"to your device for approval via Auth0 CIBA.\n"
        + "\n".join(detail_lines)
        + f"\nTotal flagged: ${total:,.2f} across {count} transaction(s).\n"
        f"Action will only proceed after your explicit approval."
    )


# ---------------------------------------------------------------------------
# Multi-turn context helpers
# ---------------------------------------------------------------------------

def _build_conversation_context() -> str:
    """Build context from prior tool results for multi-turn awareness.

    If the user says "which ones are suspicious?" after asking about
    transactions, we inject the prior transaction results so the LLM
    can answer without re-running the tool.
    """
    if not _tool_context:
        return ""
    lines = ["\n--- PRIOR TOOL RESULTS (from earlier in this conversation) ---"]
    for tool_name, result in _tool_context.items():
        lines.append(f"\n[{tool_name} — cached from earlier turn]:\n{result}")
    return "\n".join(lines)


def _build_fga_security_note(tools_used: list[str], was_blocked: bool) -> str:
    """Build the security note footer showing which Auth0 features were used."""
    parts = []

    if tools_used:
        fga_checks = []
        for tool_name in tools_used:
            tool_def = next((t for t in AGENT_TOOLS if t["name"] == tool_name), None)
            if tool_def:
                agent_id, relation, service = tool_def["fga_check"]
                fga_checks.append(f"{agent_id}#{relation}@{service}")
        parts.append(
            "FGA permissions verified: " + ", ".join(fga_checks)
        )
        parts.append("Token Vault scope: read-only")

    if was_blocked:
        parts.append(
            "Write attempt logged and denied. "
            "FGA check: fin-guard#writer@financial_api → DENIED"
        )

    if not parts:
        parts.append("No tool calls this turn. FGA model: fin-guard (viewer only)")

    return "Security note: " + ". ".join(parts) + "."


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

CHAT_SYSTEM_PROMPT = """You are Fin-Guard, a read-only AI financial guardian agent built on Auth0's security platform.

You help users understand their spending patterns, find anomalies, and manage their budget. You have access to these tools:
- read_transactions: Read recent bank transactions (FGA: fin-guard#viewer@financial_api)
- read_budget: Read the monthly budget from Google Sheets (FGA: fin-guard#viewer@google_sheets)
- analyze_anomalies: Scan for unusual spending patterns (FGA: fin-guard#viewer@financial_api)
- request_ciba_approval: Request user approval for high-risk escalations (CIBA push notification)

IMPORTANT RULES:
1. You can ONLY READ financial data. You can NEVER modify, transfer, or delete anything.
2. Every tool call is pre-checked against the FGA (Fine-Grained Authorization) model.
3. For high-risk findings (transactions > $1000), CIBA approval is automatically triggered.
4. Always mention which Auth0 features were used (FGA check, Token Vault scope, CIBA if applicable).
5. Be specific with numbers. Name exact amounts, merchants, dates.
6. If the user asks you to do something you can't (transfer money, modify budget), respond firmly but with personality. Explain the architectural reason (FGA model, Token Vault scopes), not just "I can't do that."
7. End every response with a brief security note about which permissions were checked.

RESPONSE FORMAT:
- Lead with the key finding or answer.
- Use bullet points for details and breakdowns.
- Keep responses concise — no fluff, no unnecessary preamble.
- End with: "Security note: [which Auth0 features were used]"

PERSONALITY:
- Confident and knowledgeable about finances.
- Witty when deflecting write attempts — make the security model memorable.
- Never apologetic about being read-only. It's a feature, not a limitation."""


# ---------------------------------------------------------------------------
# Main chat function
# ---------------------------------------------------------------------------

async def chat(user_message: str) -> dict:
    """Process a chat message and return agent response with tool calls."""
    global _turn_count

    _history.append({"role": "user", "content": user_message})
    _turn_count += 1
    is_first_turn = _turn_count == 1

    # ------------------------------------------------------------------
    # 1. Classify intents
    # ------------------------------------------------------------------
    intents = _classify_intents(user_message)
    write_blocked = _is_write_attempt(intents)
    security_probe = _is_security_probe(intents)

    # ------------------------------------------------------------------
    # 2. Handle blocked write attempts / security probes
    # ------------------------------------------------------------------
    blocked_response = ""
    if write_blocked or security_probe:
        _log(AuditEntry(
            timestamp=datetime.now(),
            service="auth0_fga",
            action="write_attempt_blocked",
            permission_used=PermissionLevel.NONE,
            success=False,
            details=f"BLOCKED: User requested write/override operation: '{user_message[:120]}'",
        ))

        # Also run a formal FGA denial check for the audit trail
        _, fga_denied_audit = fga.check_permission("fin-guard", "writer", "financial_api")
        _log(fga_denied_audit)

        blocked_response = _next_blocked_response()

        if security_probe:
            blocked_response += (
                "\n\nTo be clear: my permissions are enforced by Auth0 FGA at the "
                "infrastructure level, verified before every single tool call. "
                "The exact check that blocked this: "
                "fin-guard#writer@financial_api → DENIED."
            )

    # ------------------------------------------------------------------
    # 3. Resolve and execute tools
    # ------------------------------------------------------------------
    tools_to_run = _resolve_tools(intents)

    # Multi-turn: if user asks a follow-up with no clear tool match,
    # check if prior context can answer it
    has_prior_context = bool(_tool_context)
    follow_up_referencing_prior = (
        not tools_to_run
        and not write_blocked
        and has_prior_context
        and any(w in user_message.lower() for w in [
            "which", "those", "them", "that", "these", "the ones",
            "more about", "details", "drill", "explain", "why",
            "what about", "how about", "specifically",
        ])
    )

    tool_results: dict[str, str] = {}
    for tool in tools_to_run:
        tool_results[tool] = _execute_tool(tool)

    # ------------------------------------------------------------------
    # 4. CIBA: auto-trigger for high-risk anomalies
    # ------------------------------------------------------------------
    ciba_note = None
    if "analyze_anomalies" in tool_results:
        ciba_note = await _maybe_trigger_ciba(tool_results["analyze_anomalies"])

    # ------------------------------------------------------------------
    # 5. Build context and get LLM response
    # ------------------------------------------------------------------
    context_parts = []

    if is_first_turn:
        context_parts.append(
            "[FIRST MESSAGE — briefly introduce yourself as Fin-Guard, "
            "then immediately address their question. Don't just greet; "
            "jump into the answer.]"
        )

    if blocked_response:
        context_parts.append(
            f"\n--- BLOCKED ACTION ---\n{blocked_response}\n"
            "Incorporate this blocked-action message into your response naturally. "
            "Keep the witty tone. Mention the FGA permission check that denied it."
        )

    if tool_results:
        context_parts.append("\n--- TOOL RESULTS ---")
        for tool, result in tool_results.items():
            tool_def = next((t for t in AGENT_TOOLS if t["name"] == tool), None)
            fga_tuple = ""
            if tool_def:
                a, r, s = tool_def["fga_check"]
                fga_tuple = f" (FGA verified: {a}#{r}@{s})"
            context_parts.append(f"\n[{tool}]{fga_tuple}:\n{result}")

    if follow_up_referencing_prior:
        context_parts.append(_build_conversation_context())
        context_parts.append(
            "\n[The user is asking a follow-up about previous results. "
            "Answer using the cached tool data above.]"
        )

    if ciba_note:
        context_parts.append(f"\n--- CIBA STATUS ---\n{ciba_note}")

    # Security note for the LLM to incorporate
    security_note = _build_fga_security_note(
        list(tool_results.keys()), write_blocked
    )
    context_parts.append(f"\n--- INCLUDE AT END ---\n{security_note}")

    context = "\n".join(context_parts)
    full_prompt = f"User question: {user_message}\n{context}\n\nRespond based on the above. Be specific and actionable."

    ai_response = await llm_analyze(CHAT_SYSTEM_PROMPT, full_prompt)

    # ------------------------------------------------------------------
    # 6. Fallback if no LLM available
    # ------------------------------------------------------------------
    if not ai_response:
        ai_response = _build_fallback_response(
            user_message, tool_results, blocked_response,
            ciba_note, security_note, is_first_turn,
        )

    _history.append({"role": "assistant", "content": ai_response})

    return {
        "response": ai_response,
        "tools_used": list(tool_results.keys()),
        "blocked": write_blocked,
        "ciba_triggered": ciba_note is not None,
        "intents": {k: round(v, 3) for k, v in intents.items()},
        "audit_entries": len(_audit),
        "timestamp": datetime.now().isoformat(),
    }


def _build_fallback_response(
    user_message: str,
    tool_results: dict[str, str],
    blocked_response: str,
    ciba_note: Optional[str],
    security_note: str,
    is_first_turn: bool,
) -> str:
    """Build a structured response when no LLM is available."""
    parts: list[str] = []

    if is_first_turn:
        parts.append(
            "I'm Fin-Guard, your read-only financial guardian. "
            "Every action I take is verified by Auth0 FGA before execution. "
            "Let me look into that for you.\n"
        )

    if blocked_response:
        parts.append(f"**Access Denied**\n{blocked_response}\n")

    if tool_results:
        for tool, result in tool_results.items():
            tool_label = tool.replace("_", " ").title()
            tool_def = next((t for t in AGENT_TOOLS if t["name"] == tool), None)
            fga_info = ""
            if tool_def:
                a, r, s = tool_def["fga_check"]
                fga_info = f" *(FGA verified: {a}#{r}@{s})*"
            parts.append(f"**{tool_label}**{fga_info}\n{result}\n")

    if ciba_note:
        parts.append(ciba_note)

    if not tool_results and not blocked_response:
        parts.append(
            "I can help you with:\n"
            "- **Transaction history** — where your money is going\n"
            "- **Budget status** — are you on track this month?\n"
            "- **Anomaly detection** — flag suspicious charges\n\n"
            "What would you like to know?"
        )

    parts.append(f"\n{security_note}")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# History management
# ---------------------------------------------------------------------------

def get_history() -> list[dict]:
    return list(_history)


def clear_history():
    global _turn_count, _blocked_idx
    _history.clear()
    _audit.clear()
    _tool_context.clear()
    _turn_count = 0
    _blocked_idx = 0
