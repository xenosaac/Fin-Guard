"""Fin-Guard AI Agent — the read-only financial guardian.

Uses LangGraph to orchestrate tool calls across connected services.
The agent can:
  - READ transactions (financial API)
  - READ budgets (Google Sheets)
  - SEND alerts (Slack)
  - NEVER write/modify financial data

Every tool call is audited in the audit trail.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from app.models.schemas import (
    Alert,
    AnalysisResponse,
    AuditEntry,
    PermissionLevel,
)
from app.tools.financial import detect_anomalies, get_transactions
from app.tools.budget import analyze_budget, get_budget
from app.tools.notifications import send_notification_batch


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

        Steps:
        1. READ transactions from financial API
        2. READ budget from Google Sheets
        3. Detect anomalies
        4. SEND alerts for anomalies
        5. Return summary

        Every step is audited. No financial data is ever modified.
        """
        self.status = "analyzing"

        # Step 1: Read transactions
        transactions, txn_audit = get_transactions(days=30)
        self._log_audit(txn_audit)

        # Step 2: Read budget
        budget, budget_audit = get_budget()
        self._log_audit(budget_audit)

        # Step 3: Detect anomalies
        anomalies = detect_anomalies(
            transactions,
            daily_limit=daily_limit,
            single_txn_limit=single_txn_limit,
        )

        # Step 4: Analyze budget
        budget_analysis = analyze_budget(budget)

        # Step 4b: Check for over-budget categories
        for cat_info in budget_analysis["over_budget_categories"]:
            # Create a synthetic anomaly for over-budget alert
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

        # Step 5: Send notifications
        self.status = "alerting"
        alerts, alert_audits = send_notification_batch(anomalies)
        for a in alert_audits:
            self._log_audit(a)

        # Build summary
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

        self.status = "idle"

        return AnalysisResponse(
            summary=" ".join(summary_parts),
            alerts=alerts,
            transactions_scanned=len(transactions),
            anomalies_found=len(anomalies),
        )

    def demonstrate_blocked_write(self) -> AuditEntry:
        """Demonstrate that write operations are BLOCKED.

        This is for the demo — shows that the agent respects
        its read-only permissions even when asked to write.
        """
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


# Singleton agent instance
agent = GuardianAgent()
