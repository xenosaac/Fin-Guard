"""Notification tools — the ONLY write-like action Fin-Guard performs.

Fin-Guard can send alerts to the user via Slack or in-app notifications.
This is the only "output" the agent produces. It cannot modify financial
data, budgets, or any external service state.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
import uuid

from app.models.schemas import Alert, AuditEntry, PermissionLevel, Transaction


# ── In-memory alert store (for hackathon — would be DB in production) ────────

_alerts: list[Alert] = []


def get_alerts() -> list[Alert]:
    """Get all alerts."""
    return list(_alerts)


def clear_alerts() -> None:
    """Clear all alerts (for demo reset)."""
    _alerts.clear()


def create_alert_from_anomaly(txn: Transaction) -> Alert:
    """Create an alert from a detected anomalous transaction."""
    alert = Alert(
        id=f"alert_{uuid.uuid4().hex[:8]}",
        timestamp=datetime.now(),
        title=f"Unusual transaction: ${txn.amount:.2f} at {txn.merchant}",
        description=txn.anomaly_reason,
        severity="high" if txn.amount > 1000 else "medium",
        transaction_id=txn.id,
        notified_via=["in_app"],
    )
    _alerts.append(alert)
    return alert


def send_slack_notification(alert: Alert) -> tuple[bool, AuditEntry]:
    """Send alert to Slack via Token Vault.

    In production, this uses Auth0 Token Vault to get a Slack OAuth token
    and posts to the user's configured channel. For the hackathon demo,
    we simulate the Token Vault flow and log the audit trail.
    """
    # Simulate Token Vault → Slack API flow
    success = True  # Would be actual Slack API call in production

    if "slack" not in alert.notified_via:
        alert.notified_via.append("slack")

    audit = AuditEntry(
        timestamp=datetime.now(),
        service="slack",
        action="send_alert",
        permission_used=PermissionLevel.READ,  # We only READ the token, then POST a notification
        success=success,
        details=f"Sent alert '{alert.title}' to Slack channel",
    )
    return success, audit


def send_notification_batch(anomalies: list[Transaction]) -> tuple[list[Alert], list[AuditEntry]]:
    """Process anomalies: create alerts and send notifications."""
    alerts = []
    audits = []

    for txn in anomalies:
        alert = create_alert_from_anomaly(txn)
        success, audit = send_slack_notification(alert)
        alerts.append(alert)
        audits.append(audit)

    return alerts, audits
