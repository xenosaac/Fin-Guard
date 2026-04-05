"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/* ── Types ───────────────────────────────────────────────────────────── */

interface Connection {
  id: string;
  name: string;
  description: string;
  scope: string;
  connected: boolean;
}

const DEFAULT_CONNECTIONS: Connection[] = [
  { id: "financial_api", name: "Financial API", description: "Read-only access to bank accounts and transactions", scope: "accounts:read transactions:read", connected: true },
  { id: "google_sheets", name: "Google Sheets", description: "Export budget reports to Google Sheets", scope: "spreadsheets:write", connected: false },
  { id: "slack", name: "Slack", description: "Send alerts and summaries to Slack channels", scope: "chat:write incoming-webhook", connected: true },
];

/* ── Reusable Components ─────────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold tracking-[-0.02em] text-white mb-4" style={{ fontFamily: "'Space Grotesk'" }}>
      {children}
    </h2>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "green" | "red" | "amber" }) {
  const colors = {
    default: "text-zinc-400 border-zinc-700 bg-zinc-800/50",
    green: "text-[#00ffa3] border-[#00ffa3]/20 bg-[#00ffa3]/5",
    red: "text-red-400/70 border-red-400/20 bg-red-400/5",
    amber: "text-amber-400/70 border-amber-400/20 bg-amber-400/5",
  };
  return (
    <span className={`px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] uppercase font-mono border ${colors[variant]}`}>
      {children}
    </span>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 items-center transition-colors ${checked ? "bg-[#00ffa3]/20 border-[#00ffa3]/40" : "bg-[#1a1a1a] border-zinc-700"} border ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className={`inline-block h-3 w-3 transform transition-transform ${checked ? "translate-x-[18px] bg-[#00ffa3]" : "translate-x-1 bg-zinc-500"}`} />
    </button>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const [connections, setConnections] = useState<Connection[]>(DEFAULT_CONNECTIONS);
  const [loading, setLoading] = useState<string | null>(null);

  /* Notification prefs (client-side mock) */
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackNotifs, setSlackNotifs] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);

  /* AI config (client-side mock) */
  const [analysisFreq, setAnalysisFreq] = useState("daily");
  const [sensitivity, setSensitivity] = useState(1); // 0=Low 1=Medium 2=High

  /* Session timeout mock */
  const [sessionTimeout, setSessionTimeout] = useState("30");

  /* Fetch connections on mount */
  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setConnections(data); })
      .catch(() => {});
  }, []);

  const toggleConnection = useCallback(async (id: string, connect: boolean) => {
    setLoading(id);
    try {
      const res = await fetch(`/api/connections/${id}/${connect ? "connect" : "disconnect"}`, { method: "POST" });
      if (res.ok) {
        setConnections((prev) => prev.map((c) => (c.id === id ? { ...c, connected: connect } : c)));
      }
    } catch { /* silent */ }
    setLoading(null);
  }, []);

  const slackConnected = connections.find((c) => c.id === "slack")?.connected ?? false;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="px-6 lg:px-10 py-6 border-b border-[#1a1a1a]">
        <h1 className="text-lg font-bold tracking-[-0.03em] text-white" style={{ fontFamily: "'Space Grotesk'" }}>
          Settings
        </h1>
        <p className="text-[11px] text-zinc-500 mt-1">Configure your Fin-Guard experience</p>
      </div>

      <div className="px-6 lg:px-10 py-8 space-y-10 max-w-3xl">

        {/* ── 1. Token Vault Connections ──────────────────────────────── */}
        <section>
          <SectionTitle>Token Vault Connections</SectionTitle>
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-semibold text-zinc-200" style={{ fontFamily: "'Space Grotesk'" }}>{conn.name}</span>
                    {conn.connected ? <Badge variant="green">Connected</Badge> : <Badge variant="red">Disconnected</Badge>}
                  </div>
                  <p className="text-[10px] text-zinc-500">{conn.description}</p>
                  <span className="text-[9px] font-mono text-zinc-600 mt-1 block">scope: {conn.scope}</span>
                </div>
                <button
                  onClick={() => toggleConnection(conn.id, !conn.connected)}
                  disabled={loading === conn.id}
                  className={`shrink-0 px-4 py-1.5 text-[10px] font-bold tracking-[0.1em] uppercase font-mono border transition-colors ${
                    conn.connected
                      ? "text-red-400/70 border-red-400/20 hover:bg-red-400/10"
                      : "text-[#00ffa3] border-[#00ffa3]/20 hover:bg-[#00ffa3]/10"
                  } ${loading === conn.id ? "opacity-50 cursor-wait" : ""}`}
                >
                  {loading === conn.id ? "..." : conn.connected ? "Disconnect" : "Connect"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── 2. Notification Preferences ─────────────────────────────── */}
        <section>
          <SectionTitle>Notification Preferences</SectionTitle>
          <div className="space-y-0 bg-[#0a0a0a] border border-[#1a1a1a] divide-y divide-[#1a1a1a]">
            <NotifRow label="Email Alerts" sub="Receive alerts via email" checked={emailAlerts} onChange={setEmailAlerts} />
            <NotifRow label="Slack Notifications" sub={slackConnected ? "Send alerts to connected Slack workspace" : "Requires Slack connection"} checked={slackNotifs && slackConnected} onChange={setSlackNotifs} disabled={!slackConnected} />
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-[11px] text-zinc-200 block">CIBA Push Approvals</span>
                <span className="text-[9px] text-zinc-600">Required by security policy</span>
              </div>
              <div className="flex items-center gap-2">
                <Toggle checked={true} disabled />
                <Badge variant="amber">Required</Badge>
              </div>
            </div>
            <NotifRow label="Daily Spending Summary" sub="End-of-day transaction recap" checked={dailySummary} onChange={setDailySummary} />
            <NotifRow label="Weekly Budget Report" sub="Sunday evening budget overview" checked={weeklyReport} onChange={setWeeklyReport} />
          </div>
        </section>

        {/* ── 3. AI Agent Configuration ───────────────────────────────── */}
        <section>
          <SectionTitle>AI Agent Configuration</SectionTitle>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] divide-y divide-[#1a1a1a]">
            {/* Analysis frequency */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] text-zinc-200">Analysis Frequency</span>
              <select
                value={analysisFreq}
                onChange={(e) => setAnalysisFreq(e.target.value)}
                className="bg-[#111] border border-[#1a1a1a] text-[10px] text-zinc-300 font-mono px-2 py-1 outline-none focus:border-[#00ffa3]/40"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            {/* Anomaly sensitivity */}
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-[11px] text-zinc-200 block">Anomaly Sensitivity</span>
                <span className="text-[9px] text-zinc-600 font-mono">{["Low", "Medium", "High"][sensitivity]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={1}
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-28 h-1 accent-[#00ffa3] bg-[#1a1a1a] cursor-pointer"
              />
            </div>
            {/* LLM Provider */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] text-zinc-200">LLM Provider</span>
              <Badge>OpenAI GPT-4</Badge>
            </div>
            {/* Read-only note */}
            <div className="px-4 py-3 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[#00ffa3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span className="text-[9px] font-mono text-zinc-500">Agent operates in READ-ONLY mode. This cannot be changed.</span>
            </div>
          </div>
        </section>

        {/* ── 4. Security Settings ────────────────────────────────────── */}
        <section>
          <SectionTitle>Security Settings</SectionTitle>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] divide-y divide-[#1a1a1a]">
            <div className="px-4 py-3">
              <span className="text-[11px] text-zinc-200 block mb-2">FGA Authorization Model</span>
              <div className="flex flex-col gap-1">
                <Link href="/security" className="text-[10px] text-[#00ffa3] hover:underline font-mono">View full FGA authorization model &rarr;</Link>
                <Link href="/security" className="text-[10px] text-[#00ffa3] hover:underline font-mono">View audit trail &rarr;</Link>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] text-zinc-200">Two-Factor Authentication</span>
              <Badge variant="green">Managed by Auth0</Badge>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] text-zinc-200">Session Timeout</span>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="bg-[#111] border border-[#1a1a1a] text-[10px] text-zinc-300 font-mono px-2 py-1 outline-none focus:border-[#00ffa3]/40"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── 5. Data & Privacy ───────────────────────────────────────── */}
        <section>
          <SectionTitle>Data & Privacy</SectionTitle>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] divide-y divide-[#1a1a1a]">
            <div className="px-4 py-3 flex flex-wrap gap-2">
              <ActionButton label="Export Audit Trail" onClick={() => { window.location.href = "/api/audit/export"; }} />
              <ActionButton label="Clear Chat History" variant="amber" onClick={async () => { await fetch("/api/chat/clear", { method: "POST" }); }} />
              <ActionButton label="Reset Demo State" variant="red" onClick={async () => { await fetch("/api/reset", { method: "POST" }); window.location.reload(); }} />
            </div>
            <div className="px-4 py-3 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[#00ffa3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span className="text-[9px] font-mono text-zinc-500">All financial data is read-only. Fin-Guard cannot access, modify, or export your raw financial credentials.</span>
            </div>
          </div>
        </section>

        {/* ── 6. About ────────────────────────────────────────────────── */}
        <section className="pb-10">
          <SectionTitle>About</SectionTitle>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>Fin-Guard</span>
              <Badge variant="green">v1.0.0</Badge>
            </div>
            <p className="text-[10px] text-zinc-500">Built for Auth0 &ldquo;Authorized to Act&rdquo; Hackathon</p>
            <div className="flex flex-wrap gap-1.5">
              {["Token Vault", "FGA", "CIBA"].map((f) => (
                <span key={f} className="px-2 py-0.5 text-[8px] font-bold tracking-[0.15em] text-[#00ffa3] border border-[#00ffa3]/20 bg-[#00ffa3]/5 uppercase font-mono">{f}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Next.js", "FastAPI", "Auth0"].map((t) => (
                <span key={t} className="px-2 py-0.5 text-[8px] font-bold tracking-[0.1em] text-zinc-400 border border-zinc-700 bg-zinc-800/50 uppercase font-mono">{t}</span>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

/* ── Helper Sub-Components ───────────────────────────────────────────── */

function NotifRow({ label, sub, checked, onChange, disabled }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <span className={`text-[11px] block ${disabled ? "text-zinc-500" : "text-zinc-200"}`}>{label}</span>
        <span className="text-[9px] text-zinc-600">{sub}</span>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function ActionButton({ label, variant = "default", onClick }: { label: string; variant?: "default" | "amber" | "red"; onClick: () => void }) {
  const colors = {
    default: "text-[#00ffa3] border-[#00ffa3]/20 hover:bg-[#00ffa3]/10",
    amber: "text-amber-400/70 border-amber-400/20 hover:bg-amber-400/10",
    red: "text-red-400/70 border-red-400/20 hover:bg-red-400/10",
  };
  return (
    <button onClick={onClick} className={`px-3 py-1.5 text-[10px] font-bold tracking-[0.1em] uppercase font-mono border transition-colors ${colors[variant]}`}>
      {label}
    </button>
  );
}
