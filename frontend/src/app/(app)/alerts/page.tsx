"use client";

import { useCallback, useEffect, useState } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface CIBARequest {
  request_id: string;
  action: string;
  reason: string;
  risk_level: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
}

type Tab = "pending" | "approved" | "denied" | "all";

/* ── Helpers ───────────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function riskColor(level: string): string {
  switch (level.toLowerCase()) {
    case "high":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "medium":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "low":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    default:
      return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  }
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function AlertsPage() {
  const [pending, setPending] = useState<CIBARequest[]>([]);
  const [resolved, setResolved] = useState<CIBARequest[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  /* ── Fetch pending from backend ──────────────────────────────────────── */

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/ciba/pending");
      if (res.ok) {
        const data: CIBARequest[] = await res.json();
        setPending(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const iv = setInterval(fetchPending, 5000);
    return () => clearInterval(iv);
  }, [fetchPending]);

  /* ── Approve / Deny ──────────────────────────────────────────────────── */

  const handleAction = async (id: string, action: "approve" | "deny") => {
    setFadingOut((prev) => new Set(prev).add(id));

    try {
      await fetch(`/api/ciba/${id}/${action}`, { method: "POST" });
    } catch {
      /* ignore */
    }

    // After fade animation, move to resolved
    setTimeout(() => {
      setPending((prev) => {
        const item = prev.find((r) => r.request_id === id);
        if (item) {
          setResolved((old) => [
            { ...item, status: action === "approve" ? "approved" : "denied" },
            ...old,
          ]);
        }
        return prev.filter((r) => r.request_id !== id);
      });
      setFadingOut((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  };

  /* ── Derived lists ───────────────────────────────────────────────────── */

  const approved = resolved.filter((r) => r.status === "approved");
  const denied = resolved.filter((r) => r.status === "denied");

  const displayList = (() => {
    switch (activeTab) {
      case "pending":
        return pending;
      case "approved":
        return approved;
      case "denied":
        return denied;
      case "all":
        return [...pending, ...resolved];
    }
  })();

  /* ── Tab config ──────────────────────────────────────────────────────── */

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: pending.length },
    { key: "approved", label: "Approved", count: approved.length },
    { key: "denied", label: "Denied", count: denied.length },
    { key: "all", label: "All", count: pending.length + resolved.length },
  ];

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="flex-1 overflow-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-xl font-bold tracking-[-0.03em] text-white"
          style={{ fontFamily: "'Space Grotesk'" }}
        >
          Alerts &amp; Approvals
        </h1>
        <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider mt-1">
          CIBA — Human-in-the-Loop
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === tab.key
                ? "bg-[#00ffa3]/10 text-[#00ffa3]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  activeTab === tab.key
                    ? "bg-[#00ffa3]/20 text-[#00ffa3]"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alert rows */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-5 h-5 border-2 border-[#00ffa3]/30 border-t-[#00ffa3] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-600 text-xs">Loading alerts...</p>
        </div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#00ffa3]/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-[#00ffa3]">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <p className="text-zinc-400 text-sm font-medium">All clear.</p>
          <p className="text-zinc-600 text-xs mt-1">No pending approvals.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayList.map((item, idx) => {
            const isFading = fadingOut.has(item.request_id);
            const isPending = item.status === "pending";
            const isApproved = item.status === "approved";
            const isDenied = item.status === "denied";

            return (
              <div
                key={`${item.request_id}-${item.status}-${idx}`}
                className={`group bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl px-5 py-3.5
                  flex items-center gap-4 transition-all duration-400
                  ${isFading ? "opacity-0 scale-[0.98] translate-x-4" : "opacity-100"}
                  ${!isPending ? "opacity-60" : "hover:border-[#222]"}`}
                style={{ transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
              >
                {/* Left: icon + text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px]">
                      {isPending ? "\u26A1" : isApproved ? "\u2705" : "\u274C"}
                    </span>
                    <span className="text-[13px] font-semibold text-white truncate">
                      {item.action}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed truncate pl-[22px]">
                    {item.reason}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5 pl-[22px]">
                    {timeAgo(item.created_at)}
                  </p>
                </div>

                {/* Right: badge + actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Risk badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${riskColor(
                      item.risk_level
                    )}`}
                  >
                    {item.risk_level}
                  </span>

                  {/* Status or action buttons */}
                  {isPending ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAction(item.request_id, "approve")}
                        className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                          bg-emerald-500/15 text-emerald-400 border border-emerald-500/30
                          hover:bg-emerald-500/25 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(item.request_id, "deny")}
                        className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                          text-red-400 border border-red-500/30
                          hover:bg-red-500/15 transition-colors"
                      >
                        Deny
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        isApproved
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
