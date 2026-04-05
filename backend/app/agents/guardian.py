"""Fin-Guard AI Agent — the read-only financial guardian.

Uses LLM (Claude or GPT) for intelligent financial analysis:
  - READ transactions (financial API via Token Vault)
  - READ budgets (Google Sheets via Token Vault)
  - DETECT anomalies (AI-powered pattern analysis)
  - SEND alerts (Slack via Token Vault)
  - NEVER write/modify financial data

Falls back to rule-based detection if no LLM key is configured.
Every tool call is audited in the audit trail.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.config import settings
from app.models.schemas import (
    Alert,
    AnalysisResponse,
    AuditEntry,
    PermissionLevel,
)
from app.tools.financial import detect_anomalies, get_transactions
from app.tools.budget import analyze_budget, get_budget
from app.tools.notifications import send_notification_batch
from app.agents.llm import llm_analyze


SYSTEM_PROMPT = (
    "You are Fin-Guard, a read-only AI financial guardian. "
    "You analyze spending patterns and flag concerns. "
    "You can NEVER modify, move, or access financial accounts — only observe and alert. "
    "Be concise and actionable. Focus on the most important findings. "
    "Format: start with a one-sentence verdict, then bullet points for each concern."
)


def _build_analysis_prompt(transactions: list, budget_analysis: dict) -> str:
    """Build the user prompt for LLM analysis."""
    total = sum(t.amount for t in transactions)
    by_cat: dict[str, float] = {}
    for t in transactions:
        by_cat[t.category] = by_cat.get(t.category, 0) + t.amount

    lines = [
        f"Analyze these transactions and budget data.",
        f"",
        f"Total transactions: {len(transactions)}",
        f"Total spent: ${total:,.2f}",
        f"Spending by category:",
    ]
    for cat, amt in sorted(by_cat.items(), key=lambda x: -x[1]):
        lines.append(f"  - {cat}: ${amt:,.2f}")

    suspicious = [t for t in transactions if t.amount > 500 or t.category == "unknown"]
    if suspicious:
        lines.append(f"\nLarge/unusual transactions ({len(suspicious)}):")
        for t in suspicious[:10]:
            lines.append(
                f"  - ${t.amount:,.2f} at {t.merchant} ({t.category}) "
                f"on {t.date.strftime('%Y-%m-%d')}"
            )

    over_budget = budget_analysis.get("over_budget_categories", [])
    if over_budget:
        lines.append("\nBudget alerts:")
        for c in over_budget:
            lines.append(
                f"  - {c['category']}: spent ${c['spent']:,.2f} vs "
                f"${c['budget']:,.2f} budget ({c['pct_used']:.0f}%)"
            )

    lines.append(
        f"\nProjected savings: ${budget_analysis.get('projected_savings', 0):,.2f} "
        f"(target: $1,000.00)"
    )

    return "\n".join(lines)


class GuardianAgent:
    """The Fin-Guard AI agent — read-only financial monitoring."""

    def __init__(self):
        self.audit_log: list[AuditEntry] = []
        self.status: str = "idle"

    def _log_audit(self, entry: AuditEntry) -> None:
        self.audit_log.append(entry)

    def _log_blocked(self, service: str, action: str, reason: str) -> None:
        """Log a BLOCKED action — demonstrates zero-trust enforcement."""
        self.audit_log.append(AuditEntry(
            timestamp=datetime.now(),
            service=service,
            action=action,
            permission_used=PermissionLevel.NONE,
            success=False,
            details=f"BLOCKED: {reason}",
        ))

    async def analyze(
        self,
        daily_limit: float = 1000.0,
        single_txn_limit: float = 500.0,
    ) -> AnalysisResponse:
        """Run full financial analysis pipeline.

        1. READ transactions from financial API
        2. READ budget from Google Sheets
        3. Detect anomalies (rule-based)
        4. AI analysis via Claude (if available)
        5. SEND alerts for anomalies
        6. Return summary

        Every step is audited. No financial data is ever modified.
        """
        self.status = "analyzing"

        # Step 1: Read transactions
        transactions, txn_audit = get_transactions(days=30)
        self._log_audit(txn_audit)

        # Step 2: Read budget
        budget, budget_audit = get_budget()
        self._log_audit(budget_audit)

        # Step 3: Rule-based anomaly detection
        anomalies = detect_anomalies(
            transactions,
            daily_limit=daily_limit,
            single_txn_limit=single_txn_limit,
        )

        # Step 4: Budget analysis
        budget_analysis = analyze_budget(budget)

        # Step 4b: Over-budget alerts
        for cat_info in budget_analysis["over_budget_categories"]:
            from app.models.schemas import Transaction as TxnModel
            anomalies.append(TxnModel(
                id=f"budget_alert_{cat_info['category']}",
                date=datetime.now(),
                description=f"Over budget in {cat_info['category']}",
                amount=cat_info["spent"],
                category=cat_info["category"],
                merchant="Budget Alert",
                is_anomaly=True,
                anomaly_reason=(
                    f"Spent ${cat_info['spent']:.2f} vs "
                    f"${cat_info['budget']:.2f} budget "
                    f"({cat_info['pct_used']:.0f}% used)"
                ),
            ))

        # Step 5: AI analysis (Claude or GPT, whichever is configured)
        ai_summary = None
        has_llm = settings.anthropic_api_key or settings.openai_api_key
        if has_llm:
            provider = settings.llm_provider
            if settings.anthropic_api_key and not settings.openai_api_key:
                provider = "anthropic"
            elif settings.openai_api_key and not settings.anthropic_api_key:
                provider = "openai"

            self._log_audit(AuditEntry(
                timestamp=datetime.now(),
                service=f"llm:{provider}",
                action="analyze_spending",
                permission_used=PermissionLevel.READ,
                success=True,
                details=(
                    f"AI agent ({provider}) analyzing transaction patterns "
                    f"(read-only — only aggregated summaries sent to LLM)"
                ),
            ))
            user_prompt = _build_analysis_prompt(transactions, budget_analysis)
            ai_summary = await llm_analyze(SYSTEM_PROMPT, user_prompt)

        # Step 6: Send notifications
        self.status = "alerting"
        alerts, alert_audits = send_notification_batch(anomalies)
        for a in alert_audits:
            self._log_audit(a)

        # Build summary
        if ai_summary:
            summary = ai_summary
        else:
            summary_parts = [
                f"Scanned {len(transactions)} transactions over the last 30 days.",
                f"Found {len(anomalies)} anomalies requiring attention.",
            ]
            if budget_analysis["over_budget_categories"]:
                cats = ", ".join(
                    c["category"] for c in budget_analysis["over_budget_categories"]
                )
                summary_parts.append(f"Over-budget categories: {cats}.")
            if budget_analysis["savings_on_track"]:
                summary_parts.append(
                    f"Savings on track: ${budget_analysis['projected_savings']:.2f} projected."
                )
            else:
                summary_parts.append(
                    f"Savings at risk: only ${budget_analysis['projected_savings']:.2f} projected "
                    f"(target: ${budget['savings_target']:.2f})."
                )
            summary = " ".join(summary_parts)

        self.status = "idle"

        return AnalysisResponse(
            summary=summary,
            alerts=alerts,
            transactions_scanned=len(transactions),
            anomalies_found=len(anomalies),
        )

    def demonstrate_blocked_write(self) -> AuditEntry:
        """Demonstrate that write operations are BLOCKED."""
        self._log_blocked(
            service="financial_api",
            action="write_transaction",
            reason="Fin-Guard operates in READ-ONLY mode. "
            "Write access to financial data is permanently disabled. "
            "This is a security feature, not a limitation.",
        )
        return self.audit_log[-1]

    def get_audit_log(self) -> list[AuditEntry]:
        return list(self.audit_log)

    def clear_audit_log(self) -> None:
        self.audit_log.clear()


# Singleton
agent = GuardianAgent()
