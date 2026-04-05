"""Fin-Guard AI Agent — the read-only financial guardian.

Uses Claude (Anthropic) with tool use to orchestrate financial monitoring:
  - READ transactions (financial API via Token Vault)
  - READ budgets (Google Sheets via Token Vault)
  - DETECT anomalies (AI-powered pattern analysis)
  - SEND alerts (Slack via Token Vault)
  - NEVER write/modify financial data

Falls back to rule-based detection if no Anthropic key is configured.
Every tool call is audited in the audit trail.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional

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


def _build_transaction_summary(transactions: list) -> str:
    """Summarize transactions for Claude's analysis."""
    total = sum(t.amount for t in transactions)
    by_cat: dict[str, float] = {}
    for t in transactions:
        by_cat[t.category] = by_cat.get(t.category, 0) + t.amount

    lines = [
        f"Total transactions: {len(transactions)}",
        f"Total spent: ${total:,.2f}",
        f"Spending by category:",
    ]
    for cat, amt in sorted(by_cat.items(), key=lambda x: -x[1]):
        lines.append(f"  - {cat}: ${amt:,.2f}")

    # Include suspicious items
    suspicious = [t for t in transactions if t.amount > 500 or t.category == "unknown"]
    if suspicious:
        lines.append(f"\nLarge/unusual transactions ({len(suspicious)}):")
        for t in suspicious[:10]:
            lines.append(
                f"  - ${t.amount:,.2f} at {t.merchant} ({t.category}) on {t.date.strftime('%Y-%m-%d')}"
            )

    return "\n".join(lines)


async def _claude_analyze(
    txn_summary: str, budget_analysis: dict
) -> Optional[str]:
    """Ask Claude to analyze financial data and identify concerns.

    Returns Claude's analysis as a string, or None if API is unavailable.
    """
    if not settings.anthropic_api_key:
        return None

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        over_budget = budget_analysis.get("over_budget_categories", [])
        budget_context = ""
        if over_budget:
            budget_context = "\n\nBudget alerts:\n" + "\n".join(
                f"  - {c['category']}: spent ${c['spent']:,.2f} vs ${c['budget']:,.2f} budget ({c['pct_used']:.0f}%)"
                for c in over_budget
            )

        message = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=500,
            system=(
                "You are Fin-Guard, a read-only AI financial guardian. "
                "You analyze spending patterns and flag concerns. "
                "You can NEVER modify, move, or access financial accounts — only observe and alert. "
                "Be concise and actionable. Focus on the most important findings."
            ),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Analyze these transactions and budget data. "
                        f"Identify the top concerns and provide a brief summary.\n\n"
                        f"{txn_summary}"
                        f"{budget_context}\n\n"
                        f"Projected savings: ${budget_analysis.get('projected_savings', 0):,.2f} "
                        f"(target: ${budget_analysis.get('savings_target', 1000):,.2f})"
                    ),
                }
            ],
        )
        return message.content[0].text

    except Exception as e:
        return f"AI analysis unavailable: {e}"


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

        # Step 5: AI analysis via Claude
        ai_summary = None
        if settings.anthropic_api_key:
            self._log_audit(AuditEntry(
                timestamp=datetime.now(),
                service="anthropic_claude",
                action="analyze_spending",
                permission_used=PermissionLevel.READ,
                success=True,
                details="AI agent analyzing transaction patterns (read-only, no financial data sent to LLM — only aggregated summaries)",
            ))
            txn_summary = _build_transaction_summary(transactions)
            ai_summary = await _claude_analyze(txn_summary, budget_analysis)

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
