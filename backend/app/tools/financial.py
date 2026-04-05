"""Financial data tools — READ-ONLY by design.

These tools fetch transaction data. They can NEVER create, modify,
or delete any financial data. This is the core security model of Fin-Guard.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Optional

from app.models.schemas import AuditEntry, PermissionLevel, Transaction


# ── Mock transaction generator (replaces Plaid in hackathon) ─────────────────

_MERCHANTS = [
    ("Whole Foods", "groceries", (15.0, 120.0)),
    ("Shell Gas Station", "transportation", (30.0, 80.0)),
    ("Netflix", "subscriptions", (15.99, 15.99)),
    ("Spotify", "subscriptions", (9.99, 9.99)),
    ("Amazon", "shopping", (10.0, 250.0)),
    ("Uber", "transportation", (8.0, 45.0)),
    ("Starbucks", "food_drink", (4.0, 12.0)),
    ("Target", "shopping", (15.0, 150.0)),
    ("CVS Pharmacy", "health", (5.0, 80.0)),
    ("Electric Company", "utilities", (80.0, 200.0)),
    ("Water Bill", "utilities", (30.0, 60.0)),
    ("Rent Payment", "housing", (1800.0, 1800.0)),
]

# Anomalous transactions — these should trigger alerts
_ANOMALIES = [
    ("Unknown Overseas Merchant", "unknown", 847.32, "Large overseas transaction from unknown merchant"),
    ("CryptoExchange Ltd", "crypto", 2500.00, "Unusually large crypto purchase"),
    ("Luxury Store Paris", "shopping", 1299.99, "High-value purchase outside normal spending pattern"),
]


def generate_mock_transactions(days: int = 30, seed: int = 42) -> list[Transaction]:
    """Generate realistic mock transactions with embedded anomalies."""
    rng = random.Random(seed)
    transactions = []
    now = datetime.now()

    for day_offset in range(days):
        date = now - timedelta(days=day_offset)
        # 2-5 normal transactions per day
        for _ in range(rng.randint(2, 5)):
            merchant, category, (lo, hi) = rng.choice(_MERCHANTS)
            amount = round(rng.uniform(lo, hi), 2)
            transactions.append(Transaction(
                id=f"txn_{len(transactions):04d}",
                date=date.replace(
                    hour=rng.randint(6, 22),
                    minute=rng.randint(0, 59),
                ),
                description=f"Purchase at {merchant}",
                amount=amount,
                category=category,
                merchant=merchant,
            ))

    # Inject anomalies in recent days
    for i, (merchant, category, amount, reason) in enumerate(_ANOMALIES):
        date = now - timedelta(days=rng.randint(0, 5))
        transactions.append(Transaction(
            id=f"txn_anomaly_{i:02d}",
            date=date.replace(hour=rng.randint(0, 23)),
            description=f"Charge from {merchant}",
            amount=amount,
            category=category,
            merchant=merchant,
            is_anomaly=True,
            anomaly_reason=reason,
        ))

    transactions.sort(key=lambda t: t.date, reverse=True)
    return transactions


def get_transactions(days: int = 30) -> tuple[list[Transaction], AuditEntry]:
    """READ-ONLY: Fetch recent transactions.

    Returns transactions AND an audit entry logging this access.
    Every data access is audited — this is the Fin-Guard security model.
    """
    txns = generate_mock_transactions(days=days)
    audit = AuditEntry(
        timestamp=datetime.now(),
        service="financial_api",
        action="read_transactions",
        permission_used=PermissionLevel.READ,
        success=True,
        details=f"Read {len(txns)} transactions (last {days} days)",
    )
    return txns, audit


def detect_anomalies(
    transactions: list[Transaction],
    daily_limit: float = 1000.0,
    single_txn_limit: float = 500.0,
) -> list[Transaction]:
    """Detect anomalous transactions based on thresholds and patterns."""
    anomalies = []
    daily_totals: dict[str, float] = {}

    for txn in transactions:
        day_key = txn.date.strftime("%Y-%m-%d")
        daily_totals[day_key] = daily_totals.get(day_key, 0) + txn.amount

        is_anomaly = False
        reasons = []

        # Pre-marked anomalies
        if txn.is_anomaly:
            is_anomaly = True
            reasons.append(txn.anomaly_reason)

        # Single transaction exceeds limit
        if txn.amount > single_txn_limit:
            is_anomaly = True
            reasons.append(f"Amount ${txn.amount:.2f} exceeds ${single_txn_limit:.2f} limit")

        # Unknown category
        if txn.category == "unknown":
            is_anomaly = True
            reasons.append("Unknown merchant category")

        if is_anomaly:
            txn.is_anomaly = True
            txn.anomaly_reason = "; ".join(reasons)
            anomalies.append(txn)

    # Check daily totals
    for day_key, total in daily_totals.items():
        if total > daily_limit:
            # Find the biggest transaction that day and flag it
            day_txns = [t for t in transactions if t.date.strftime("%Y-%m-%d") == day_key]
            biggest = max(day_txns, key=lambda t: t.amount)
            if not biggest.is_anomaly:
                biggest.is_anomaly = True
                biggest.anomaly_reason = f"Daily total ${total:.2f} exceeds ${daily_limit:.2f} limit"
                anomalies.append(biggest)

    return anomalies
