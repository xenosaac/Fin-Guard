"""Budget tools — READ-ONLY access to Google Sheets budget data.

Uses Auth0 Token Vault to get Google Sheets OAuth token, then reads
the user's budget spreadsheet. Can NEVER modify the spreadsheet.
"""
from __future__ import annotations

from datetime import datetime

from app.models.schemas import AuditEntry, PermissionLevel


# ── Mock budget data (replaces Google Sheets API in hackathon) ───────────────

MOCK_BUDGET = {
    "monthly_income": 6500.00,
    "categories": {
        "housing": {"budget": 1800.00, "spent": 1800.00},
        "groceries": {"budget": 600.00, "spent": 523.47},
        "transportation": {"budget": 300.00, "spent": 267.89},
        "subscriptions": {"budget": 100.00, "spent": 75.97},
        "shopping": {"budget": 400.00, "spent": 1847.31},  # Over budget!
        "food_drink": {"budget": 200.00, "spent": 156.23},
        "utilities": {"budget": 250.00, "spent": 238.00},
        "health": {"budget": 150.00, "spent": 45.00},
    },
    "savings_target": 1000.00,
    "month": "April 2026",
}


def get_budget() -> tuple[dict, AuditEntry]:
    """READ-ONLY: Fetch budget data from Google Sheets via Token Vault.

    Returns budget data AND an audit entry.
    """
    audit = AuditEntry(
        timestamp=datetime.now(),
        service="google_sheets",
        action="read_budget",
        permission_used=PermissionLevel.READ,
        success=True,
        details="Read monthly budget spreadsheet",
    )
    return MOCK_BUDGET, audit


def analyze_budget(budget: dict) -> dict:
    """Analyze budget vs actual spending. Pure computation, no API calls."""
    analysis = {
        "month": budget["month"],
        "total_budget": sum(c["budget"] for c in budget["categories"].values()),
        "total_spent": sum(c["spent"] for c in budget["categories"].values()),
        "over_budget_categories": [],
        "under_budget_categories": [],
        "savings_on_track": False,
    }

    for cat, data in budget["categories"].items():
        pct = data["spent"] / data["budget"] if data["budget"] > 0 else 0
        entry = {
            "category": cat,
            "budget": data["budget"],
            "spent": data["spent"],
            "remaining": data["budget"] - data["spent"],
            "pct_used": round(pct * 100, 1),
        }
        if data["spent"] > data["budget"]:
            analysis["over_budget_categories"].append(entry)
        else:
            analysis["under_budget_categories"].append(entry)

    remaining = budget["monthly_income"] - analysis["total_spent"]
    analysis["savings_on_track"] = remaining >= budget["savings_target"]
    analysis["projected_savings"] = round(remaining, 2)

    return analysis
