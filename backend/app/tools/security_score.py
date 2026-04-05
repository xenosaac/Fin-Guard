"""Dynamic Security Posture Scoring for Fin-Guard.

A real-time score (0-100) reflecting the system's current security state.
Displayed as a prominent gauge in the UI, it gamifies the security experience:
connecting a service raises the score, blocking an attack keeps it high.

Dimensions:
  1. Token Vault      (25%) — service connection coverage
  2. FGA Enforcement   (30%) — permission model completeness + active blocks
  3. CIBA Human-in-Loop (20%) — CIBA readiness and recent activity
  4. Audit Completeness (15%) — audit trail coverage
  5. Zero-Trust Posture (10%) — read-only design + blocked write proof
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta

from app.auth import get_connections
from app.tools.fga import fga, AGENT_PERMISSIONS, BLOCKED_ACTIONS
from app.tools.notifications import get_alerts


# ── Grade thresholds ────────────────────────────────────────────────────────

_GRADE_MAP = [
    (90, "A"),
    (80, "B"),
    (70, "C"),
    (60, "D"),
    (0, "F"),
]

_TOTAL_SERVICES = 3  # financial_api, google_sheets, slack


def _grade(score: int) -> str:
    for threshold, letter in _GRADE_MAP:
        if score >= threshold:
            return letter
    return "F"


# ── Service feature descriptions ────────────────────────────────────────────

_SERVICE_FEATURES = {
    "financial_api": "transaction monitoring",
    "google_sheets": "budget monitoring",
    "slack": "real-time Slack alerts",
}


class SecurityScorer:
    """Computes a dynamic security posture score from live system state."""

    # ── Public API ──────────────────────────────────────────────────────────

    def calculate_for_session(self, session) -> dict:
        """Calculate score using per-session state."""
        connections = session.get_connections()
        audit_log = session.audit_log
        return self._calculate(connections, audit_log)

    def calculate(self) -> dict:
        """Fallback: calculate with global state."""
        from app.auth import get_connections
        connections = get_connections()
        audit_log = self._get_audit_log()
        return self._calculate(connections, audit_log)

    def _calculate(self, connections, audit_log) -> dict:
        """Return the full security score breakdown."""
        dims = [
            self._score_token_vault(connections),
            self._score_fga_enforcement(audit_log),
            self._score_ciba(),
            self._score_audit_completeness(audit_log),
            self._score_zero_trust(audit_log),
        ]

        overall = round(sum(d["score"] * d["_weight"] for d in dims))
        overall = max(0, min(100, overall))

        # Strip internal weight key before returning
        for d in dims:
            del d["_weight"]

        return {
            "overall_score": overall,
            "grade": _grade(overall),
            "dimensions": dims,
            "recent_events": self._recent_events(audit_log),
            "recommendations": self._recommendations(connections),
        }

    def get_trend(self) -> list[dict]:
        """Return seven synthetic daily data points for a sparkline.

        Simulates a score climbing from ~60 to the current score as
        services are connected and security tests pass.
        """
        current = self.calculate()["overall_score"]
        start = 60
        points: list[dict] = []
        today = datetime.now().date()

        for i in range(7):
            day = today - timedelta(days=6 - i)
            # Smooth climb with slight jitter
            t = i / 6  # 0 .. 1
            base = start + (current - start) * t
            jitter = random.uniform(-2, 2) if i < 6 else 0
            points.append({
                "date": day.isoformat(),
                "score": max(0, min(100, round(base + jitter))),
            })

        # Last point always equals the live score
        points[-1]["score"] = current
        return points

    # ── Dimension scorers ───────────────────────────────────────────────────

    def _score_token_vault(self, connections=None) -> dict:
        if connections is None:
            from app.auth import get_connections
            connections = get_connections()
        connected = [c for c in connections if c.connected]
        n = len(connected)

        score_map = {0: 10, 1: 40, 2: 70, 3: 100}
        score = score_map.get(n, 100)

        if n == _TOTAL_SERVICES:
            detail = f"{n}/{_TOTAL_SERVICES} services connected via read-only Token Vault"
        elif n == 0:
            detail = "No services connected yet"
        else:
            names = ", ".join(c.service_name for c in connected)
            detail = f"{n}/{_TOTAL_SERVICES} connected ({names})"

        return {
            "name": "Token Vault",
            "score": score,
            "max": 100,
            "detail": detail,
            "icon": "vault",
            "_weight": 0.25,
        }

    def _score_fga_enforcement(self, audit_log=None) -> dict:
        # Base: permission model completeness
        defined_perms = len(AGENT_PERMISSIONS)
        defined_blocks = len(BLOCKED_ACTIONS)
        has_perms = defined_perms > 0
        has_blocks = defined_blocks > 0

        if has_perms and has_blocks:
            base = 80
        elif has_perms:
            base = 50
        else:
            base = 20

        # Bonus: recent successful blocks prove enforcement is active
        if audit_log is None:
            audit_log = self._get_audit_log()
        recent_blocks = [
            e for e in audit_log
            if not e.success and "fga" in e.service.lower()
        ]
        block_bonus = min(20, len(recent_blocks) * 5)

        score = min(100, base + block_bonus)
        detail = (
            f"{defined_perms} permissions + {defined_blocks} blocked actions defined"
        )
        if recent_blocks:
            detail += f"; {len(recent_blocks)} recent enforcement events"

        return {
            "name": "FGA Enforcement",
            "score": score,
            "max": 100,
            "detail": detail,
            "icon": "shield",
            "_weight": 0.30,
        }

    def _score_ciba(self) -> dict:
        from app.tools.ciba import ciba

        all_requests = ciba.get_all()
        pending = ciba.get_pending()

        if not all_requests:
            # CIBA configured but no activity yet
            score = 60
            detail = "CIBA enabled — no approval activity yet"
        else:
            approved = [r for r in all_requests if r.get("status") == "approved"]
            denied = [r for r in all_requests if r.get("status") == "denied"]
            base = 80  # CIBA is active
            activity_bonus = min(20, (len(approved) + len(denied)) * 5)
            score = min(100, base + activity_bonus)

            parts = []
            if approved:
                parts.append(f"{len(approved)} approved")
            if denied:
                parts.append(f"{len(denied)} denied")
            if pending:
                parts.append(f"{len(pending)} pending")
            detail = f"CIBA active: {', '.join(parts)}"

        return {
            "name": "CIBA Human-in-Loop",
            "score": score,
            "max": 100,
            "detail": detail,
            "icon": "fingerprint",
            "_weight": 0.20,
        }

    def _score_audit_completeness(self, audit_log=None) -> dict:
        if audit_log is None:
            audit_log = self._get_audit_log()
        total_entries = len(audit_log)

        if total_entries == 0:
            score = 50  # Audit infrastructure exists but no entries
            detail = "Audit system ready — no actions logged yet"
        else:
            logged_actions = total_entries
            # In Fin-Guard every tool call is logged, so coverage is 100%
            # when any entries exist. Score scales with volume to reward usage.
            score = min(100, 70 + min(30, logged_actions * 3))
            detail = f"{logged_actions} actions logged with full coverage"

        return {
            "name": "Audit Completeness",
            "score": score,
            "max": 100,
            "detail": detail,
            "icon": "clipboard-list",
            "_weight": 0.15,
        }

    def _score_zero_trust(self, audit_log=None) -> dict:
        # Fin-Guard is read-only by design — base is always 100
        score = 100

        if audit_log is None:
            audit_log = self._get_audit_log()
        blocked_writes = [
            e for e in audit_log
            if not e.success and "blocked" in e.action.lower()
        ]

        if blocked_writes:
            detail = (
                f"Read-only enforced; {len(blocked_writes)} write attempt(s) "
                f"blocked — system is working"
            )
        else:
            detail = "Read-only by design — no write permissions exist"

        return {
            "name": "Zero-Trust Posture",
            "score": score,
            "max": 100,
            "detail": detail,
            "icon": "lock",
            "_weight": 0.10,
        }

    # ── Recent events ───────────────────────────────────────────────────────

    def _recent_events(self, audit_log=None) -> list[dict]:
        """Last 5 audit entries formatted with security impact."""
        if audit_log is None:
            audit_log = self._get_audit_log()
        events: list[dict] = []

        for entry in audit_log[-5:]:
            if not entry.success and "blocked" in entry.action.lower():
                events.append({
                    "type": "block",
                    "text": f"Blocked: {entry.details}",
                    "impact": "+5",
                })
            elif not entry.success:
                events.append({
                    "type": "deny",
                    "text": f"Denied: {entry.details}",
                    "impact": "+3",
                })
            elif "ciba" in entry.service.lower():
                events.append({
                    "type": "ciba",
                    "text": entry.details,
                    "impact": "+2",
                })
            else:
                events.append({
                    "type": "allow",
                    "text": entry.details,
                    "impact": "0",
                })

        return events

    # ── Recommendations ─────────────────────────────────────────────────────

    def _recommendations(self, connections=None) -> list[str]:
        recs: list[str] = []

        # Unconnected services
        if connections is None:
            from app.auth import get_connections
            connections = get_connections()
        for conn in connections:
            if not conn.connected:
                feature = _SERVICE_FEATURES.get(conn.service_id, "additional features")
                recs.append(f"Connect {conn.service_name} to enable {feature}")

        # CIBA activity
        from app.tools.ciba import ciba
        if not ciba.get_all():
            recs.append("Test CIBA approval flow for high-risk scenarios")

        # Blocked attempts
        audit_log = self._get_audit_log()
        blocked = [e for e in audit_log if not e.success and "blocked" in e.action.lower()]
        if not blocked:
            recs.append("Run a threat scenario to verify security layers")

        # Alerts
        alerts = get_alerts()
        if not alerts:
            recs.append("Run an analysis to generate your first security alerts")

        return recs

    # ── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _get_audit_log() -> list:
        from app.agents.guardian import agent
        return agent.audit_log


# ── Singleton ───────────────────────────────────────────────────────────────

scorer = SecurityScorer()
