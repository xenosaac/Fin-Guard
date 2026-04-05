"""Bank account tools — READ-ONLY by design.

Mock account data simulating Auth0 Token Vault connection.
These tools can NEVER create, modify, or delete account data.
All access is audited by FGA.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta


# ── Mock Account Data ───────────────────────────────────────────────────────

MOCK_ACCOUNTS: list[dict] = [
    {
        "id": "checking_1234",
        "name": "Primary Checking",
        "type": "checking",
        "last_four": "1234",
        "balance": 12847.32,
        "routing_masked": "****4921",
        "opened_date": "2019-03-15",
        "status": "active",
    },
    {
        "id": "savings_5678",
        "name": "Emergency Savings",
        "type": "savings",
        "last_four": "5678",
        "balance": 45230.00,
        "routing_masked": "****4921",
        "opened_date": "2020-01-08",
        "status": "active",
    },
    {
        "id": "investment_9012",
        "name": "Brokerage",
        "type": "investment",
        "last_four": "9012",
        "balance": 128459.67,
        "routing_masked": "****7310",
        "opened_date": "2021-06-22",
        "status": "active",
    },
]

_ACCOUNTS_BY_ID = {a["id"]: a for a in MOCK_ACCOUNTS}


# ── Mock User Profile ──────────────────────────────────────────────────────

MOCK_USER_PROFILE = {
    "id": "user_001",
    "name": "Isaac Zhang",
    "nickname": "Isaac",
    "email": "isaac@xiangliu.net",
    "phone": "+1 (555) 123-4567",
    "birthday": "1995-06-15",
    "address": "123 Tech Street, San Francisco, CA 94107",
    "member_since": "2025-03-01",
    "auth_provider": "google-oauth2",
    "fico_score": 742,
    "credit_utilization": 0.23,
}


# ── Merchant pools per account type ────────────────────────────────────────

_CHECKING_MERCHANTS = [
    ("Whole Foods Market", "groceries", -18.0, -125.0),
    ("Shell Gas Station", "transport", -32.0, -78.0),
    ("Netflix Subscription", "subscriptions", -15.99, -15.99),
    ("Spotify Premium", "subscriptions", -9.99, -9.99),
    ("Amazon Purchase", "shopping", -12.0, -245.0),
    ("Uber Ride", "transport", -9.0, -42.0),
    ("Starbucks Coffee", "food_drink", -4.50, -11.0),
    ("Target Store", "shopping", -18.0, -155.0),
    ("CVS Pharmacy", "health", -6.0, -72.0),
    ("Electric Co. Bill", "utilities", -85.0, -195.0),
    ("Water Bill", "utilities", -30.0, -58.0),
    ("Payroll Direct Deposit", "income", 3200.0, 3200.0),
    ("Venmo Transfer In", "transfer", 25.0, 150.0),
    ("Unknown Overseas Merchant", "unknown", -847.32, -847.32),
]

_SAVINGS_MERCHANTS = [
    ("Interest Payment", "income", 12.50, 38.0),
    ("Transfer from Checking", "transfer", 500.0, 2000.0),
    ("Transfer to Checking", "transfer", -200.0, -800.0),
    ("Bonus Deposit", "income", 250.0, 1000.0),
    ("Emergency Withdrawal", "transfer", -1500.0, -3000.0),
]

_INVESTMENT_MERCHANTS = [
    ("AAPL Dividend", "dividends", 42.0, 185.0),
    ("VTSAX Purchase", "investment", -500.0, -2500.0),
    ("Bond Coupon Payment", "income", 75.0, 320.0),
    ("SPY Purchase", "investment", -1000.0, -5000.0),
    ("MSFT Dividend", "dividends", 28.0, 95.0),
    ("Account Fee", "fees", -4.95, -4.95),
    ("Transfer from Bank", "transfer", 1000.0, 5000.0),
    ("CryptoExchange Ltd", "crypto", -2500.0, -2500.0),
]

_MERCHANT_POOLS: dict[str, list[tuple]] = {
    "checking": _CHECKING_MERCHANTS,
    "savings": _SAVINGS_MERCHANTS,
    "investment": _INVESTMENT_MERCHANTS,
}


# ── Public API ──────────────────────────────────────────────────────────────

def get_accounts() -> list[dict]:
    """READ-ONLY: Return all connected bank accounts."""
    return [a.copy() for a in MOCK_ACCOUNTS]


def get_account(account_id: str) -> dict:
    """READ-ONLY: Return a single account by ID.

    Raises:
        ValueError: If account_id is not found.
    """
    account = _ACCOUNTS_BY_ID.get(account_id)
    if account is None:
        raise ValueError(
            f"Account '{account_id}' not found. "
            f"Valid IDs: {list(_ACCOUNTS_BY_ID.keys())}"
        )
    return account.copy()


def get_account_transactions(
    account_id: str, days: int = 30
) -> list[dict]:
    """READ-ONLY: Generate mock transactions for an account.

    Uses a seeded RNG keyed on account_id for deterministic output.
    Returns 15-20 transactions sorted newest-first.

    Each transaction dict has:
        date, description, merchant, category, amount (positive=credit,
        negative=debit), is_anomaly, anomaly_reason
    """
    account = get_account(account_id)  # validates ID
    account_type = account["type"]

    seed_map = {
        "checking_1234": 101,
        "savings_5678": 202,
        "investment_9012": 303,
    }
    rng = random.Random(seed_map.get(account_id, 42))

    pool = _MERCHANT_POOLS.get(account_type, _CHECKING_MERCHANTS)
    now = datetime.now()
    count = rng.randint(15, 20)
    transactions: list[dict] = []

    for i in range(count):
        days_ago = rng.randint(0, days - 1)
        date = now - timedelta(days=days_ago)
        merchant, category, lo, hi = rng.choice(pool)
        amount = round(rng.uniform(min(lo, hi), max(lo, hi)), 2)

        is_anomaly = False
        anomaly_reason = ""

        if category == "unknown":
            is_anomaly = True
            anomaly_reason = "Unknown merchant — possible fraud"
        elif category == "crypto":
            is_anomaly = True
            anomaly_reason = "Unusually large crypto purchase"
        elif abs(amount) > 1000:
            is_anomaly = True
            anomaly_reason = (
                f"Amount ${abs(amount):.2f} exceeds $1,000 threshold"
            )

        transactions.append({
            "id": f"txn_{account_id}_{i:03d}",
            "date": date.strftime("%Y-%m-%d"),
            "description": (
                f"{'Charge from' if amount < 0 else 'Payment from'} "
                f"{merchant}"
            ),
            "merchant": merchant,
            "category": category,
            "amount": amount,
            "is_anomaly": is_anomaly,
            "anomaly_reason": anomaly_reason,
        })

    transactions.sort(key=lambda t: t["date"], reverse=True)
    return transactions


def get_balance_history(
    account_id: str, days: int = 7
) -> list[dict]:
    """READ-ONLY: Return daily closing balances for the past N days.

    Uses a seeded RNG for deterministic daily drift (max +/-1.5% of balance).

    Each entry dict has: date, balance
    """
    account = get_account(account_id)  # validates ID
    base = account["balance"]

    seed_map = {
        "checking_1234": 1001,
        "savings_5678": 2002,
        "investment_9012": 3003,
    }
    rng = random.Random(seed_map.get(account_id, 999))

    now = datetime.now()
    history: list[dict] = []

    for i in range(days - 1, -1, -1):
        date = now - timedelta(days=i)
        drift = (rng.random() - 0.5) * base * 0.03
        balance = round(base + drift * (days - i), 2)
        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "balance": balance,
        })

    return history


# ── Profile helpers (preserved from prior version) ─────────────────────────

def get_profile() -> dict:
    """Return the mock user profile."""
    return dict(MOCK_USER_PROFILE)


def update_profile(updates: dict) -> dict:
    """Merge updates into the mock profile (client-side demo only)."""
    allowed_keys = {"name", "nickname", "email", "phone", "address"}
    for key, value in updates.items():
        if key in allowed_keys:
            MOCK_USER_PROFILE[key] = value
    return dict(MOCK_USER_PROFILE)
