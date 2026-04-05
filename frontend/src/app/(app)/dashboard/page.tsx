"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* -- Types ----------------------------------------------------------------- */

interface Connection {
  service_id: string;
  label: string;
  connected: boolean;
  permission: string;
}

interface Alert {
  id: string;
  severity: string;
  message: string;
  timestamp: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  service: string;
  action: string;
  permission_used: string;
  success: boolean;
  details: string;
}

interface AgentStatus {
  state: "idle" | "analyzing";
  last_run?: string;
}

interface DashboardData {
  connections: Connection[];
  recent_alerts: Alert[];
  audit_log: AuditEntry[];
  agent_status: AgentStatus;
}

interface SecurityScore {
  overall_score: number;
  grade: string;
  dimensions: Record<string, number>;
}

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  blocked?: boolean;
  ts: number;
}

interface CIBARequest {
  id: string;
  action: string;
  reason: string;
}

/* -- Service config -------------------------------------------------------- */

const SERVICES: Record<string, { icon: string; label: string; badge: string }> = {
  financial_api: { icon: "\uD83D\uDCB3", label: "PLAID_FINANCIAL", badge: "READ-ONLY" },
  google_sheets: { icon: "\uD83D\uDCCA", label: "GSHEETS_BUDGET", badge: "READ-ONLY" },
  slack:         { icon: "\uD83D\uDD14", label: "SLACK_ALERTS",    badge: "ALERT-ONLY" },
};

/* -- Component ------------------------------------------------------------- */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [score, setScore] = useState<SecurityScore | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [ciba, setCiba] = useState<CIBARequest | null>(null);
  const [cibaOpen, setCibaOpen] = useState(false);
  const [cibaPendingCount, setCibaPendingCount] = useState(0);
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState<string | null>(null);
  const [writeBlocked, setWriteBlocked] = useState(false);

  const auditRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  /* -- Fetch helpers ------------------------------------------------------- */

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) return;
      const d: DashboardData = await res.json();
      setData(d);
    } catch { /* swallow */ }
  }, []);

  const fetchScore = useCallback(async () => {
    try {
      const res = await fetch("/api/security-score");
      if (!res.ok) return;
      setScore(await res.json());
    } catch { /* swallow */ }
  }, []);

  const fetchCibaPending = useCallback(async () => {
    try {
      const res = await fetch("/api/ciba/pending");
      if (!res.ok) {
        setCibaPendingCount(0);
        setCiba(null);
        return;
      }
      const body = await res.json();
      // body can be a single request object or an array
      const pending: CIBARequest | null = Array.isArray(body)
        ? body.length > 0 ? body[0] : null
        : body?.id ? body : null;
      const count = Array.isArray(body) ? body.length : (body?.id ? 1 : 0);
      setCibaPendingCount(count);
      setCiba(pending);
    } catch {
      setCibaPendingCount(0);
      setCiba(null);
    }
  }, []);

  /* -- Polling ------------------------------------------------------------- */

  useEffect(() => {
    fetchDashboard();
    fetchScore();
    fetchCibaPending();
    const id = setInterval(() => {
      fetchDashboard();
      fetchCibaPending();
    }, 4000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(id); clearInterval(clock); };
  }, [fetchDashboard, fetchScore, fetchCibaPending]);

  /* auto-scroll audit + chat */
  useEffect(() => {
    auditRef.current?.scrollTo({ top: auditRef.current.scrollHeight, behavior: "smooth" });
  }, [data?.audit_log.length]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.length, chatLoading]);

  /* -- Actions ------------------------------------------------------------- */

  async function toggleConnection(serviceId: string, connected: boolean) {
    const action = connected ? "disconnect" : "connect";
    await fetch(`/api/connections/${serviceId}/${action}`, { method: "POST" });
    fetchDashboard();
    fetchScore();
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      const txCount = body.transactions_scanned ?? body.scanned ?? "—";
      const anomalies = body.anomalies_found ?? body.anomalies ?? 0;
      setToast(`Analysis complete. ${txCount} transactions scanned, ${anomalies} anomalies found.`);
      setTimeout(() => setToast(null), 4000);
    } catch { /* swallow */ }
    setAnalyzing(false);
    await fetchDashboard();
    fetchScore();
    // auto-scroll audit trail to show new entries
    setTimeout(() => {
      auditRef.current?.scrollTo({ top: auditRef.current.scrollHeight, behavior: "smooth" });
    }, 200);
  }

  async function attemptWrite() {
    setWriteBlocked(true);
    await fetch("/api/analyze", { method: "POST", headers: { "x-attempt": "write" } });
    await fetchDashboard();
    // revert button text after 1 second
    setTimeout(() => setWriteBlocked(false), 1000);
    // auto-scroll audit trail to show the new BLOCKED entry
    setTimeout(() => {
      auditRef.current?.scrollTo({ top: auditRef.current.scrollHeight, behavior: "smooth" });
    }, 200);
  }

  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg) return;
    setChat((prev) => [...prev, { role: "user", text: msg, ts: Date.now() }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`/api/chat?message=${encodeURIComponent(msg)}`, { method: "POST" });
      const body = await res.json();
      setChat((prev) => [
        ...prev,
        { role: "agent", text: body.response ?? body.message ?? "No response.", blocked: body.blocked ?? false, ts: Date.now() },
      ]);
    } catch {
      setChat((prev) => [...prev, { role: "agent", text: "Connection error.", ts: Date.now() }]);
    }
    setChatLoading(false);
    fetchDashboard();
  }

  async function respondCiba(approved: boolean) {
    if (!ciba) return;
    await fetch(`/api/ciba/${ciba.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    setCiba(null);
    setCibaOpen(false);
    setCibaPendingCount((c) => Math.max(0, c - 1));
    fetchDashboard();
    fetchCibaPending();
  }

  /* -- Markdown helper ------------------------------------------------------ */

  function renderMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, "\u2022 $1");
  }

  /* -- Derived ------------------------------------------------------------- */

  const connections = data?.connections ?? [];
  const connectedCount = connections.filter((c) => c.connected).length;
  const totalAlerts = data?.recent_alerts?.length ?? 0;
  const agentState = data?.agent_status?.state ?? "idle";
  const auditLog = data?.audit_log ?? [];

  const gradeColor = (g: string) =>
    g === "A" || g === "A+" ? "#00ffa3" : g === "B" ? "#facc15" : "#ef4444";

  /* -- Render -------------------------------------------------------------- */

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050505]">
      {/* scanning line when analyzing */}
      {(analyzing || agentState === "analyzing") && <div className="scanning-line" />}

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 fade-in">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0a1a12] border border-[#00ffa3]/20 rounded-xl shadow-lg shadow-[#00ffa3]/10">
            <svg className="w-3.5 h-3.5 text-[#00ffa3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-[10px] font-mono text-zinc-300">{toast}</span>
          </div>
        </div>
      )}

      {/* -- Top Summary Bar ------------------------------------------------ */}
      <header className="shrink-0 flex items-center gap-6 px-5 py-3 bg-[#080808] border-b border-[#111]">
        {/* Security Score */}
        <div className="flex items-center gap-2.5">
          <span className="text-[22px] font-bold tracking-tight text-[#00ffa3]" style={{ fontFamily: "'Space Grotesk'" }}>
            {score ? score.overall_score : "--"}
          </span>
          {score && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
              style={{ color: gradeColor(score.grade), border: `1px solid ${gradeColor(score.grade)}33` }}
            >
              {score.grade}
            </span>
          )}
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-mono">Security</span>
        </div>

        <div className="w-px h-5 bg-[#1a1a1a]" />

        {/* Connected */}
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-white" style={{ fontFamily: "'Space Grotesk'" }}>{connectedCount}/3</span>
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-mono">Connected</span>
        </div>

        <div className="w-px h-5 bg-[#1a1a1a]" />

        {/* Alerts */}
        <div className="flex items-center gap-2">
          <span className={`text-[14px] font-semibold ${totalAlerts > 0 ? "text-amber-400" : "text-white"}`} style={{ fontFamily: "'Space Grotesk'" }}>
            {totalAlerts}
          </span>
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-mono">Alerts</span>
        </div>

        <div className="w-px h-5 bg-[#1a1a1a]" />

        {/* Agent status */}
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${agentState === "analyzing" ? "bg-[#00ffa3] ring-pulse" : "bg-zinc-600"}`} />
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">{agentState}</span>
        </div>

        {/* spacer */}
        <div className="flex-1" />

        {/* CIBA notification badge */}
        {cibaPendingCount > 0 && (
          <button
            onClick={() => setCibaOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:shadow-lg hover:shadow-amber-500/10 active:scale-[0.97] transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <circle cx="12" cy="15" r="0.5" fill="currentColor" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-widest font-mono">CIBA</span>
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-[8px] font-bold text-black">
              {cibaPendingCount}
            </span>
          </button>
        )}

        {/* Clock */}
        <span className="text-[9px] text-zinc-600 font-mono tabular-nums tracking-wider">
          {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          {" \u00B7 "}
          {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
        </span>
      </header>

      {/* -- Main Grid ------------------------------------------------------ */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] overflow-hidden">

        {/* --- Left: Token Vault ------------------------------------------- */}
        <section className="flex flex-col overflow-y-auto border-r border-[#111] bg-[#080808] p-4 gap-4">
          <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Token Vault</h2>

          {/* Status ring */}
          <div className="flex justify-center py-2">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#1a1a1a" strokeWidth="4" />
              <circle
                cx="40" cy="40" r="34" fill="none" stroke="#00ffa3" strokeWidth="4"
                strokeDasharray={`${(connectedCount / 3) * 213.6} 213.6`}
                strokeLinecap="round" transform="rotate(-90 40 40)"
                className="transition-all duration-700"
              />
              <text x="40" y="38" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" style={{ fontFamily: "'Space Grotesk'" }}>
                {connectedCount}
              </text>
              <text x="40" y="50" textAnchor="middle" fill="#666" fontSize="8" fontFamily="monospace">/3 LINKED</text>
            </svg>
          </div>

          {/* Service cards */}
          {(["financial_api", "google_sheets", "slack"] as const).map((svcId) => {
            const svc = SERVICES[svcId];
            const conn = connections.find((c) => c.service_id === svcId);
            const isConn = conn?.connected ?? false;
            return (
              <div key={svcId} className={`p-3 rounded-xl transition-all duration-150 ${isConn ? "bg-[#0a1a12]" : "bg-[#0c0c0c]"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{svc.icon}</span>
                  <span className="text-[10px] font-mono text-zinc-300 tracking-wide flex-1">{svc.label}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConn ? "bg-[#00ffa3]" : "bg-zinc-700"}`} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-[#111] text-zinc-500 rounded-lg">
                    {svc.badge}
                  </span>
                  <button
                    onClick={() => toggleConnection(svcId, isConn)}
                    className={`text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded-lg active:scale-[0.97] transition-all duration-150 ${
                      isConn
                        ? "text-red-400 bg-red-400/5 hover:bg-red-400/10 hover:shadow-lg hover:shadow-red-400/5"
                        : "text-[#00ffa3] bg-[#00ffa3]/5 hover:bg-[#00ffa3]/10 hover:shadow-lg hover:shadow-[#00ffa3]/5"
                    }`}
                  >
                    {isConn ? "Disconnect" : "Connect"}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Action buttons */}
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="w-full py-2.5 text-[10px] font-bold uppercase tracking-widest bg-[#00ffa3] text-[#050505] rounded-lg hover:brightness-110 hover:shadow-lg hover:shadow-[#00ffa3]/20 active:scale-[0.97] transition-all duration-150 disabled:opacity-40"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            {analyzing ? (
              <>
                <svg className="inline-block w-3 h-3 mr-1.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Analyzing&hellip;
              </>
            ) : "Run Analysis"}
          </button>

          <button
            onClick={attemptWrite}
            disabled={writeBlocked}
            className={`w-full py-2 text-[10px] font-mono uppercase tracking-widest rounded-lg active:scale-[0.97] transition-all duration-150 ${
              writeBlocked
                ? "text-white bg-red-500 border border-red-500 shadow-lg shadow-red-500/30 animate-[flash-red_0.3s_ease-out]"
                : "text-red-400 border border-red-400/20 hover:bg-red-400/5 hover:shadow-lg hover:shadow-red-400/5"
            }`}
          >
            {writeBlocked ? "BLOCKED" : "Attempt Write (Blocked)"}
          </button>
        </section>

        {/* --- Center: AI Agent Chat --------------------------------------- */}
        <section className="flex flex-col overflow-hidden bg-[#050505]">
          {/* Header */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[#111]">
            <svg className="w-3.5 h-3.5 text-[#00ffa3] shield-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Guardian Agent</span>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {chat.length === 0 && !chatLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-4 fade-in">
                <svg className="w-8 h-8 text-zinc-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <p className="text-[10px] text-zinc-600 font-mono text-center max-w-xs leading-relaxed">
                  Fin-Guard agent is watching your accounts in read-only mode. Ask anything about your finances.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                  {[
                    "Summarize my spending this month",
                    "Any unusual transactions?",
                    "What's my budget status?",
                    "Transfer $100 to savings",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); }}
                      className="text-[9px] font-mono text-zinc-500 px-2.5 py-1.5 bg-[#0a0a0a] hover:bg-[#111] hover:text-zinc-300 hover:shadow-lg rounded-lg active:scale-[0.97] transition-all duration-150"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chat.map((msg, i) => (
              <div
                key={i}
                className={`fade-in flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2.5 rounded-xl ${
                    msg.role === "user"
                      ? "bg-[#00ffa3]/8 text-zinc-200"
                      : msg.blocked
                        ? "bg-[#1a0808] border border-red-500/30"
                        : "bg-[#0a0a0a] text-zinc-300"
                  }`}
                >
                  {msg.role === "agent" && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <svg className="w-2.5 h-2.5 text-[#00ffa3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      {msg.blocked && (
                        <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest">Access Denied</span>
                      )}
                    </div>
                  )}
                  {msg.role === "agent" ? (
                    <p
                      className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                    />
                  ) : (
                    <p className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap">{msg.text}</p>
                  )}
                  <span className="block text-[8px] text-zinc-700 mt-1 font-mono">
                    {new Date(msg.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                  </span>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start fade-in">
                <div className="bg-[#0a0a0a] px-3 py-2.5 rounded-xl">
                  <div className="flex gap-1">
                    <span className="w-1 h-1 rounded-full bg-zinc-600 animate-pulse" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 rounded-full bg-zinc-600 animate-pulse" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-1 rounded-full bg-zinc-600 animate-pulse" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendChat(); }}
            className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-[#111]"
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask the guardian agent..."
              className="flex-1 bg-[#0a0a0a] text-[11px] text-zinc-300 font-mono px-3 py-2 rounded-lg outline-none placeholder:text-zinc-700 focus:ring-1 focus:ring-[#00ffa3]/20 transition-all duration-150"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="text-[9px] font-mono uppercase tracking-wider px-3 py-2 bg-[#00ffa3]/10 text-[#00ffa3] rounded-lg hover:bg-[#00ffa3]/20 hover:shadow-lg hover:shadow-[#00ffa3]/10 active:scale-[0.97] transition-all duration-150 disabled:opacity-30"
            >
              Send
            </button>
          </form>
        </section>

        {/* --- Right: Audit Trail ------------------------------------------ */}
        <section className="flex flex-col overflow-hidden border-l border-[#111] bg-[#080808]">
          {/* Header */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[#111]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffa3] opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ffa3]" />
            </span>
            <span className="text-[9px] text-[#00ffa3] uppercase tracking-widest font-mono font-bold">Live</span>
            <span className="flex-1" />
            <span className="text-[9px] text-zinc-600 font-mono">{auditLog.length} entries</span>
          </div>

          {/* Entries */}
          <div ref={auditRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {auditLog.length === 0 && (
              <p className="text-[9px] text-zinc-700 font-mono text-center py-8">No audit entries yet. Connect a service and run analysis.</p>
            )}
            {auditLog.map((entry, i) => {
              const isBlocked = !entry.success;
              return (
                <div
                  key={entry.id ?? i}
                  className={`px-3 py-2 rounded-xl fade-in ${
                    isBlocked
                      ? "blocked-dramatic"
                      : "bg-[#0a0a0a]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* status icon */}
                    {isBlocked ? (
                      <svg className="w-3 h-3 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-[#00ffa3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}

                    {/* service.action */}
                    <span className="text-[10px] font-mono text-zinc-300 flex-1 truncate">
                      {entry.service}.{entry.action}
                    </span>

                    {/* badge */}
                    <span
                      className={`text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-lg ${
                        isBlocked
                          ? "text-red-400 bg-red-400/10"
                          : "text-[#00ffa3] bg-[#00ffa3]/10"
                      }`}
                    >
                      {isBlocked ? "BLOCKED" : "READ"}
                    </span>
                  </div>

                  {/* details */}
                  <p className="text-[8px] text-zinc-600 font-mono mt-1 truncate">{entry.details}</p>

                  {/* timestamp */}
                  <span className="text-[7px] text-zinc-700 font-mono">
                    {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

    </div>
  );
}
