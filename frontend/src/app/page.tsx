"use client";

import { useCallback, useEffect, useState, useRef } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface ServiceConnection {
  service_id: string;
  service_name: string;
  permission: "read" | "none";
  connected: boolean;
  scopes: string[];
}

interface Alert {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  notified_via: string[];
}

interface AuditEntry {
  timestamp: string;
  service: string;
  action: string;
  permission_used: "read" | "none";
  success: boolean;
  details: string;
}

interface DashboardState {
  connections: ServiceConnection[];
  recent_alerts: Alert[];
  audit_log: AuditEntry[];
  agent_status: string;
}

interface AnalysisResponse {
  summary: string;
  alerts: Alert[];
  transactions_scanned: number;
  anomalies_found: number;
}

/* ── API ───────────────────────────────────────────────────────────────── */

const API = "/api";
const f = async <T,>(path: string, opts?: RequestInit): Promise<T> => {
  const r = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
};

/* ── Utility ───────────────────────────────────────────────────────────── */

const ts = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--:--";
  }
};

const SERVICE_META: Record<string, { label: string; desc: string }> = {
  financial_api: {
    label: "PLAID_FINANCIAL",
    desc: "Read-only transaction stream. Zero write access.",
  },
  google_sheets: {
    label: "GSHEETS_BUDGET",
    desc: "Budget spreadsheet observer. Read-only scope.",
  },
  slack: {
    label: "SLACK_ALERTS",
    desc: "Outbound alert channel. Notification delivery only.",
  },
};

/* ── Main Dashboard ────────────────────────────────────────────────────── */

export default function Dashboard() {
  const [dash, setDash] = useState<DashboardState | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [offline, setOffline] = useState(false);
  const auditRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await f<DashboardState>("/dashboard");
      setDash(d);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 4000);
    return () => clearInterval(iv);
  }, [refresh]);

  useEffect(() => {
    auditRef.current?.scrollTo({ top: auditRef.current.scrollHeight, behavior: "smooth" });
  }, [dash?.audit_log?.length]);

  const connect = async (id: string) => {
    await f(`/connections/${id}/connect`, { method: "POST" });
    refresh();
  };
  const disconnect = async (id: string) => {
    await f(`/connections/${id}/disconnect`, { method: "POST" });
    refresh();
  };
  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const r = await f<AnalysisResponse>("/analyze", { method: "POST" });
      setAnalysis(r);
      refresh();
    } catch {}
    setAnalyzing(false);
  };
  const demoBlocked = async () => {
    await f("/analyze/demo-blocked-write", { method: "POST" });
    refresh();
  };
  const reset = async () => {
    await f("/reset", { method: "POST" });
    setAnalysis(null);
    refresh();
  };

  const alerts = dash?.recent_alerts ?? [];
  const audit = dash?.audit_log ?? [];
  const conns = dash?.connections ?? [];

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-white overflow-hidden selection:bg-[#00ffa3]/30">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#0c0c0c] border-b border-[#1a1a1a] shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold tracking-[-0.04em] text-[#00ffa3]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            FIN—GUARD
          </h1>
          <div className="hidden md:flex items-center gap-1 text-[10px] tracking-[0.15em] text-zinc-600 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ffa3] animate-pulse" />
            <span>System Active</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 text-[9px] font-bold tracking-[0.2em] text-[#00ffa3] border border-[#00ffa3]/20 bg-[#00ffa3]/5 uppercase">
            Zero-Trust
          </div>
          <button
            onClick={reset}
            className="px-2.5 py-1 text-[9px] tracking-[0.15em] text-zinc-600 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-400 transition uppercase"
          >
            Reset
          </button>
        </div>
      </header>

      {offline && (
        <div className="px-6 py-2 bg-red-950/40 text-red-400 text-[11px] font-mono text-center">
          Backend offline — run: cd backend && uvicorn app.main:app --reload
        </div>
      )}

      {/* ── Main Grid ───────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Vault Connections */}
        <section className="w-72 shrink-0 border-r border-[#1a1a1a] bg-[#0a0a0a] flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a1a1a]">
            <h2 className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
              Token Vault
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {conns.map((c) => {
              const meta = SERVICE_META[c.service_id] ?? { label: c.service_id.toUpperCase(), desc: "" };
              return (
                <div
                  key={c.service_id}
                  className={`p-4 transition-all ${
                    c.connected
                      ? "bg-[#0f0f0f] border-l-2 border-[#00ffa3]"
                      : "bg-[#0f0f0f] border-l-2 border-zinc-800 opacity-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-zinc-400 tracking-tight">{meta.label}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[8px] font-bold tracking-[0.15em] ${
                        c.connected
                          ? "text-[#00ffa3] bg-[#00ffa3]/10 border border-[#00ffa3]/20"
                          : "text-zinc-600 bg-zinc-900 border border-zinc-800"
                      }`}
                    >
                      {c.connected ? "READ-ONLY" : "OFFLINE"}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-600 font-mono leading-relaxed mb-3">{meta.desc}</p>
                  <div className="text-[9px] text-zinc-700 font-mono mb-3 break-all">
                    {c.scopes?.join(", ")}
                  </div>
                  {c.connected ? (
                    <button
                      onClick={() => disconnect(c.service_id)}
                      className="w-full py-1.5 text-[9px] font-bold tracking-[0.15em] text-zinc-600 border border-zinc-800 hover:border-red-800 hover:text-red-400 transition uppercase"
                    >
                      Revoke Access
                    </button>
                  ) : (
                    <button
                      onClick={() => connect(c.service_id)}
                      className="w-full py-1.5 text-[9px] font-bold tracking-[0.15em] text-[#00ffa3] border border-[#00ffa3]/30 hover:bg-[#00ffa3] hover:text-black transition uppercase"
                    >
                      Connect via Vault
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {/* Agent Controls */}
          <div className="p-4 border-t border-[#1a1a1a] space-y-2">
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="w-full py-3 text-[10px] font-bold tracking-[0.2em] uppercase transition-all disabled:opacity-30 bg-[#00ffa3] text-black hover:bg-[#00ef99] active:scale-[0.98]"
              style={{ boxShadow: analyzing ? "none" : "0 0 20px rgba(0,255,163,0.15)" }}
            >
              {analyzing ? "Analyzing..." : "Run Analysis"}
            </button>
            <button
              onClick={demoBlocked}
              className="w-full py-2 text-[9px] font-bold tracking-[0.15em] uppercase text-red-500/60 border border-red-900/30 hover:border-red-700 hover:text-red-400 transition"
            >
              Attempt Write (Blocked)
            </button>
          </div>
        </section>

        {/* Column 2: Alerts & Analysis */}
        <section className="flex-1 min-w-0 border-r border-[#1a1a1a] bg-[#080808] flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
            <h2 className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
              Agent Activity
            </h2>
            {alerts.length > 0 && (
              <span className="px-2 py-0.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">
                {alerts.length} ALERT{alerts.length !== 1 ? "S" : ""}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* AI Summary */}
            {analysis && (
              <div className="mx-4 mt-4 p-4 bg-[#0d0d0d] border-l-2 border-[#00ffa3]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ffa3]" />
                  <span className="text-[9px] font-bold tracking-[0.2em] text-[#00ffa3] uppercase">
                    AI Analysis Complete
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">
                  {analysis.summary}
                </p>
                <div className="flex gap-4 mt-3 text-[9px] text-zinc-600 font-mono">
                  <span>{analysis.transactions_scanned} txns</span>
                  <span>{analysis.anomalies_found} anomalies</span>
                </div>
              </div>
            )}

            {/* Alert Feed */}
            <div className="p-4 space-y-3">
              {alerts.length === 0 && !analysis && (
                <div className="text-center py-16 text-zinc-700 text-[11px] font-mono">
                  <div className="text-2xl mb-3 opacity-20">◇</div>
                  No alerts. Run analysis to scan transactions.
                </div>
              )}
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-4 transition-all ${
                    a.severity === "high"
                      ? "bg-[#0d0808] border-r-2 border-red-500"
                      : a.severity === "medium"
                      ? "bg-[#0d0c08] border-r-2 border-amber-500"
                      : "bg-[#0d0d0d] border-r-2 border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[9px] font-bold tracking-[0.2em] uppercase ${
                        a.severity === "high" ? "text-red-400" : a.severity === "medium" ? "text-amber-400" : "text-zinc-500"
                      }`}
                    >
                      {a.severity}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-700">{ts(a.timestamp)}</span>
                  </div>
                  <h3 className="text-[12px] font-semibold text-zinc-200 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {a.title}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">{a.description}</p>
                  {a.notified_via.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {a.notified_via.map((v) => (
                        <span key={v} className="px-1.5 py-0.5 text-[8px] text-zinc-500 bg-zinc-900 border border-zinc-800 font-mono">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Column 3: Audit Trail */}
        <section className="w-96 shrink-0 bg-[#050505] flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
            <h2 className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
              Audit Trail
            </h2>
            <span className="text-[9px] font-mono text-[#00ffa3] animate-pulse">LIVE</span>
          </div>
          <div ref={auditRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 font-mono text-[10px]">
            {audit.length === 0 && (
              <div className="text-center py-16 text-zinc-800 text-[10px]">
                Awaiting agent actions...
              </div>
            )}
            {audit.map((e, i) => (
              <div
                key={i}
                className={`flex gap-2 items-start py-1.5 px-2 transition-all ${
                  !e.success
                    ? "bg-red-950/20 border-l-2 border-red-500"
                    : "border-l-2 border-transparent hover:border-[#00ffa3]/20 hover:bg-[#0a0a0a]"
                }`}
              >
                <span className="text-zinc-700 shrink-0 w-14">{ts(e.timestamp)}</span>
                {e.success ? (
                  <span className="text-[#00ffa3] shrink-0">✓</span>
                ) : (
                  <span className="text-red-400 font-bold shrink-0">✗</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={e.success ? "text-zinc-300" : "text-red-300 font-bold"}>
                      {e.service}.{e.action}
                    </span>
                    <span
                      className={`px-1 py-0.5 text-[8px] tracking-wider ${
                        e.success
                          ? "text-[#00ffa3]/70 bg-[#00ffa3]/5"
                          : "text-red-400 bg-red-500/10 font-bold"
                      }`}
                    >
                      {e.success ? "READ" : "BLOCKED"}
                    </span>
                  </div>
                  <div className={`mt-0.5 leading-relaxed ${e.success ? "text-zinc-600" : "text-red-400/70"}`}>
                    {e.details}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="px-6 py-2 bg-[#050505] border-t border-[#1a1a1a] flex justify-between text-[9px] tracking-[0.15em] text-zinc-700 uppercase font-mono shrink-0">
        <span>
          Security: <span className="text-[#00ffa3]">Read-Only</span> // All access audited // Write operations permanently disabled
        </span>
        <span>Powered by Auth0 Token Vault</span>
      </footer>
    </div>
  );
}
