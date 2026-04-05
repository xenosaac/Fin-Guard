"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ── Types ─────────────────────────────────────────────────────────── */

interface AuditEntry {
  timestamp: string;
  service: string;
  action: string;
  success: boolean;
  details: string;
}

interface AgentMessage {
  id: number;
  type: "system" | "agent" | "user" | "step" | "card";
  text: string;
  status?: "pending" | "done" | "error";
  blocked?: boolean;
  data?: any;
  ts: number;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

let _msgId = 0;
const msg = (type: AgentMessage["type"], text: string, extra?: Partial<AgentMessage>): AgentMessage => ({
  id: ++_msgId, type, text, ts: Date.now(), ...extra,
});

function renderMd(raw: string) {
  return raw
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "• $1");
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [connCount, setConnCount] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [grade, setGrade] = useState("");
  const [profileName, setProfileName] = useState("");

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onboardingRef = useRef(false); // sync guard — prevents double-fire in StrictMode

  const scrollChat = () => {
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 100);
  };

  const addMsg = (m: AgentMessage) => {
    setMessages(prev => [...prev, m]);
    scrollChat();
  };

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  /* ── Auto-onboard on first visit ──────────────────────────────── */

  const runOnboarding = useCallback(async () => {
    if (onboarded || onboardingRef.current) return;
    onboardingRef.current = true;

    // Check if session already has chat history (returning user)
    try {
      const histRes = await fetch("/api/chat/history");
      if (histRes.ok) {
        const hist = await histRes.json();
        if (Array.isArray(hist) && hist.length > 0) {
          // Restore previous chat
          const restored: AgentMessage[] = hist.map((h: any, i: number) => ({
            id: i + 1,
            type: h.role === "user" ? "user" as const : "agent" as const,
            text: h.content,
            ts: Date.now() - (hist.length - i) * 1000,
          }));
          _msgId = restored.length;
          setMessages(restored);
          setOnboarded(true);
          // Fetch dashboard state
          try {
            const dRes = await fetch("/api/dashboard");
            if (dRes.ok) {
              const d = await dRes.json();
              setAuditLog(d.audit_log || []);
              setConnCount(d.connections?.filter((c: any) => c.connected).length || 0);
            }
            const sRes = await fetch("/api/security-score");
            if (sRes.ok) { const s = await sRes.json(); setScore(s.overall_score); setGrade(s.grade); }
            const pRes = await fetch("/api/user/profile");
            if (pRes.ok) { const p = await pRes.json(); setProfileName(p.name || ""); }
          } catch {}
          return;
        }
      }
    } catch {}

    // Fresh session — run onboarding
    try {
      const pRes = await fetch("/api/user/profile");
      if (pRes.ok) {
        const p = await pRes.json();
        setProfileName(p.name || "");
        addMsg(msg("agent",
          `Welcome. I'm **Fin-Guard**, your read-only AI financial guardian.\n\nI'll connect your accounts, scan your transactions, and flag anything unusual — but I can **never** modify your data. Every action I take is verified by Auth0 FGA before execution.\n\nLet me set things up for you, ${p.nickname || p.name?.split(" ")[0] || "there"}...`
        ));
      }
    } catch {}

    await delay(1200);

    // Call onboard endpoint
    try {
      addMsg(msg("step", "Connecting to financial services via Token Vault...", { status: "pending" }));
      await delay(600);

      const res = await fetch("/api/agent/onboard", { method: "POST" });
      if (!res.ok) throw new Error("Onboard failed");
      const data = await res.json();

      // Show connection steps
      for (const step of data.steps) {
        if (step.step.startsWith("connect_")) {
          setMessages(prev => {
            const updated = [...prev];
            const pendingIdx = updated.findLastIndex(m => m.type === "step" && m.status === "pending");
            if (pendingIdx >= 0) updated[pendingIdx] = { ...updated[pendingIdx], status: "done", text: step.message };
            return updated;
          });
          await delay(500);
          if (step.step !== "connect_slack") {
            addMsg(msg("step", "Connecting next service...", { status: "pending" }));
            await delay(400);
          }
        }
      }

      // Show analysis step
      addMsg(msg("step", "All services connected. Running financial analysis...", { status: "pending" }));
      await delay(800);

      const analyzeStep = data.steps.find((s: any) => s.step === "analyze");
      if (analyzeStep) {
        setMessages(prev => {
          const updated = [...prev];
          const pendingIdx = updated.findLastIndex(m => m.type === "step" && m.status === "pending");
          if (pendingIdx >= 0) updated[pendingIdx] = { ...updated[pendingIdx], status: "done", text: analyzeStep.message };
          return updated;
        });
      }

      await delay(600);

      // Show summary as agent message
      const summary = data.analysis?.summary || "Analysis complete.";
      addMsg(msg("agent", summary));

      await delay(400);

      // Suggestion cards
      addMsg(msg("card", "", {
        data: {
          title: "What would you like to do?",
          suggestions: [
            { label: "Show me suspicious transactions", icon: "🔍" },
            { label: "Check my budget status", icon: "📊" },
            { label: "Run a security threat test", icon: "🛡️" },
            { label: "Try to transfer money (I'll block it)", icon: "⚠️" },
          ]
        }
      }));

      setConnCount(3);
      // Fetch score
      try {
        const sRes = await fetch("/api/security-score");
        if (sRes.ok) {
          const s = await sRes.json();
          setScore(s.overall_score);
          setGrade(s.grade);
        }
      } catch {}

    } catch {
      addMsg(msg("agent", "Something went wrong during setup. Try refreshing the page."));
    }

    setOnboarded(true);

    // Fetch audit log
    try {
      const aRes = await fetch("/api/dashboard");
      if (aRes.ok) {
        const d = await aRes.json();
        setAuditLog(d.audit_log || []);
        setConnCount(d.connections?.filter((c: any) => c.connected).length || 0);
      }
    } catch {}
  }, [onboarded]);

  useEffect(() => {
    runOnboarding();
  }, []);

  // Poll audit log
  useEffect(() => {
    if (!onboarded) return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const d = await res.json();
          setAuditLog(d.audit_log || []);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(iv);
  }, [onboarded]);

  /* ── Send chat message ───────────────────────────────────────── */

  const sendChat = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    addMsg(msg("user", text));
    setLoading(true);

    try {
      const res = await fetch(`/api/chat?message=${encodeURIComponent(text)}`, { method: "POST" });
      const body = await res.json();
      addMsg(msg("agent", body.response || "No response.", {
        blocked: body.blocked,
        data: body.tools_used?.length ? { tools: body.tools_used } : undefined,
      }));

      // Refresh audit
      const aRes = await fetch("/api/dashboard");
      if (aRes.ok) {
        const d = await aRes.json();
        setAuditLog(d.audit_log || []);
      }
    } catch {
      addMsg(msg("agent", "Connection error. Backend may be offline."));
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleSuggestion = async (text: string) => {
    if (loading) return;
    addMsg(msg("user", text));
    setLoading(true);
    try {
      const res = await fetch(`/api/chat?message=${encodeURIComponent(text)}`, { method: "POST" });
      const body = await res.json();
      addMsg(msg("agent", body.response || "No response.", {
        blocked: body.blocked,
        data: body.tools_used?.length ? { tools: body.tools_used } : undefined,
      }));
      const aRes = await fetch("/api/dashboard");
      if (aRes.ok) { const d = await aRes.json(); setAuditLog(d.audit_log || []); }
    } catch {
      addMsg(msg("agent", "Connection error."));
    }
    setLoading(false);
  };

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050505]">

      {/* ── Top Bar ────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-4 px-5 py-3 bg-[#080808] border-b border-[#111]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#00ffa3] shield-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[11px] font-bold tracking-[0.1em] text-[#00ffa3] uppercase" style={{ fontFamily: "'Space Grotesk'" }}>
            Agent Active
          </span>
        </div>

        <div className="w-px h-4 bg-[#1a1a1a]" />

        {score !== null && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-bold text-[#00ffa3]" style={{ fontFamily: "'Space Grotesk'" }}>{score}</span>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-[#00ffa3] border border-[#00ffa3]/20">{grade}</span>
            </div>
            <div className="w-px h-4 bg-[#1a1a1a]" />
          </>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-white" style={{ fontFamily: "'Space Grotesk'" }}>{connCount}/3</span>
          <span className="text-[9px] text-zinc-600 font-mono uppercase">Vault</span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setAuditOpen(!auditOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider text-zinc-500 border border-[#1a1a1a] rounded-lg hover:border-zinc-600 hover:text-zinc-300 active:scale-[0.97] transition-all"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ffa3] animate-pulse" />
          Audit Trail ({auditLog.length})
        </button>
      </header>

      {/* ── Main Area ──────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Chat (Agent-First) ───────────────────────────────── */}
        <div className="flex-1 flex flex-col">

          <div ref={chatRef} className="flex-1 overflow-y-auto px-4 lg:px-8 py-6">
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((m) => {

                /* System / Step messages */
                if (m.type === "step") {
                  return (
                    <div key={m.id} className="flex items-center gap-3 fade-in">
                      {m.status === "pending" ? (
                        <div className="w-4 h-4 border-2 border-[#00ffa3]/30 border-t-[#00ffa3] rounded-full animate-spin shrink-0" />
                      ) : (
                        <svg className="w-4 h-4 text-[#00ffa3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                      <span className={`text-[11px] font-mono ${m.status === "done" ? "text-zinc-400" : "text-zinc-500"}`}>
                        {m.text}
                      </span>
                    </div>
                  );
                }

                /* Agent messages */
                if (m.type === "agent") {
                  return (
                    <div key={m.id} className="fade-in">
                      <div className={`p-4 rounded-2xl ${m.blocked ? "bg-red-950/20 border border-red-500/20" : "bg-[#0a0a0a] border border-[#1a1a1a]"}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <svg className={`w-3.5 h-3.5 ${m.blocked ? "text-red-400" : "text-[#00ffa3]"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          <span className={`text-[9px] font-bold tracking-[0.15em] uppercase ${m.blocked ? "text-red-400" : "text-[#00ffa3]"}`}>
                            {m.blocked ? "Fin-Guard — Access Denied" : "Fin-Guard"}
                          </span>
                          {m.data?.tools && (
                            <span className="text-[8px] font-mono text-zinc-600 ml-auto">
                              tools: {m.data.tools.join(", ")}
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-zinc-300 leading-relaxed whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: renderMd(m.text) }} />
                      </div>
                    </div>
                  );
                }

                /* User messages */
                if (m.type === "user") {
                  return (
                    <div key={m.id} className="flex justify-end fade-in">
                      <div className="max-w-[75%] px-4 py-3 bg-[#00ffa3]/8 border border-[#00ffa3]/15 rounded-2xl">
                        <p className="text-[12px] text-zinc-200 leading-relaxed">{m.text}</p>
                      </div>
                    </div>
                  );
                }

                /* Suggestion cards */
                if (m.type === "card" && m.data?.suggestions) {
                  return (
                    <div key={m.id} className="fade-in">
                      <p className="text-[11px] text-zinc-500 mb-2 font-medium">{m.data.title}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {m.data.suggestions.map((s: any) => (
                          <button key={s.label}
                            onClick={() => handleSuggestion(s.label)}
                            className="flex items-center gap-2.5 px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl hover:border-[#00ffa3]/30 hover:bg-[#0a0a0a] active:scale-[0.97] transition-all text-left group"
                          >
                            <span className="text-lg">{s.icon}</span>
                            <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 transition-colors leading-snug">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {loading && (
                <div className="fade-in">
                  <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-[#00ffa3]/30 border-t-[#00ffa3] rounded-full animate-spin" />
                      <span className="text-[10px] text-zinc-500 font-mono">Agent is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Input ──────────────────────────────────────────── */}
          <div className="shrink-0 px-4 lg:px-8 py-4 border-t border-[#111] bg-[#080808]">
            <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="max-w-2xl mx-auto">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your financial guardian anything..."
                  className="flex-1 px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl text-[12px] text-zinc-200 placeholder-zinc-700 focus:border-[#00ffa3]/30 focus:outline-none transition-all"
                />
                <button type="submit" disabled={loading || !input.trim()}
                  className="px-5 py-3 bg-[#00ffa3] text-black text-[10px] font-bold tracking-[0.15em] uppercase rounded-xl disabled:opacity-30 hover:bg-[#00ef99] active:scale-[0.97] transition-all"
                  style={{ fontFamily: "'Space Grotesk'" }}>
                  Send
                </button>
              </div>
              <div className="flex items-center gap-4 mt-2 px-1">
                <span className="text-[9px] text-zinc-700 font-mono">Every tool call verified by Auth0 FGA</span>
                <span className="text-[9px] text-zinc-700 font-mono">•</span>
                <span className="text-[9px] text-zinc-700 font-mono">Read-only by design</span>
                <span className="flex-1" />
                <button onClick={async () => {
                  await fetch("/api/chat/clear", { method: "POST" });
                  setMessages([]);
                  setOnboarded(false);
                  onboardingRef.current = false;
                  _msgId = 0;
                }} className="text-[9px] text-zinc-700 font-mono hover:text-zinc-400 transition">
                  Clear chat
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Audit Trail Panel (collapsible) ───────────────────── */}
        {auditOpen && (
          <div className="w-80 shrink-0 border-l border-[#111] bg-[#080808] flex flex-col overflow-hidden fade-in">
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[#111]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffa3] opacity-40" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ffa3]" />
              </span>
              <span className="text-[9px] text-[#00ffa3] uppercase tracking-widest font-mono font-bold">Live</span>
              <span className="flex-1" />
              <button onClick={() => setAuditOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {auditLog.map((entry, i) => (
                <div key={i} className={`px-3 py-2 rounded-lg text-[9px] font-mono ${!entry.success ? "bg-red-500/5 border-l-2 border-red-500" : "bg-[#0a0a0a]"}`}>
                  <div className="flex items-center gap-1.5">
                    {entry.success ? (
                      <span className="text-[#00ffa3]">✓</span>
                    ) : (
                      <span className="text-red-400 font-bold">✗</span>
                    )}
                    <span className="text-zinc-300 truncate flex-1">{entry.service}.{entry.action}</span>
                    <span className={`text-[7px] px-1 py-0.5 rounded-full ${entry.success ? "text-[#00ffa3] bg-[#00ffa3]/10" : "text-red-400 bg-red-500/10"}`}>
                      {entry.success ? "READ" : "BLOCKED"}
                    </span>
                  </div>
                  <p className="text-zinc-600 mt-0.5 truncate">{entry.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
