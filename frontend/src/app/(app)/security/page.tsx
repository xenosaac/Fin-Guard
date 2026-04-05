"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface ScenarioMeta {
  id: string;
  title: string;
  description: string;
  difficulty: "novice" | "intermediate" | "advanced" | "expert";
  auth0_features: string[];
  step_count: number;
}

interface ScenarioStep {
  step_number: number;
  title: string;
  description: string;
  attack_action: string;
  security_layer: string;
  outcome: "allowed_read" | "blocked" | "escalated";
  drama_text: string;
  ciba_trigger: boolean;
}

interface StepResult {
  step: ScenarioStep;
  outcome: string;
  drama_text: string;
  ciba_triggered: boolean;
  ciba_request_id?: string;
  audit_entries: AuditEntry[];
}

interface SecurityScore {
  overall_score: number;
  grade: string;
  dimensions: Dimension[];
  recent_events: RecentEvent[];
  recommendations: string[];
}

interface Dimension {
  name: string;
  score: number;
  max: number;
  detail: string;
  icon: string;
}

interface RecentEvent {
  type: "block" | "deny" | "ciba" | "allow";
  text: string;
  impact: string;
}

interface TrendPoint {
  date: string;
  score: number;
}

interface FGAModel {
  model: unknown;
  permissions: FGAPermission[];
  blocked_actions: BlockedAction[];
  agent: string;
  enforcement: string;
  description: string;
}

interface FGAPermission {
  agent: string;
  relation: string;
  service: string;
  description: string;
}

interface BlockedAction {
  service: string;
  action: string;
  reason: string;
}

interface PermissionRow {
  service: string;
  access: string;
  description: string;
  status: "GRANTED" | "PERMANENTLY_BLOCKED";
}

interface AuditEntry {
  timestamp: string;
  service: string;
  action: string;
  permission_used: "read" | "none";
  success: boolean;
  details: string;
}

interface CIBARequest {
  request_id: string;
  action: string;
  reason: string;
  risk_level: string;
  status: string;
}

type Tab = "threat" | "score" | "fga" | "audit";

const DIFFICULTY_COLORS: Record<string, string> = {
  novice: "text-[#00ffa3] border-[#00ffa3]/30 bg-[#00ffa3]/8",
  intermediate: "text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/8",
  advanced: "text-orange-400 border-orange-400/30 bg-orange-400/8",
  expert: "text-[#ef4444] border-[#ef4444]/30 bg-[#ef4444]/8",
};

const OUTCOME_BADGE: Record<string, { label: string; cls: string }> = {
  blocked: { label: "BLOCKED", cls: "text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30" },
  allowed_read: { label: "ALLOWED", cls: "text-[#00ffa3] bg-[#00ffa3]/10 border-[#00ffa3]/30" },
  escalated: { label: "ESCALATED", cls: "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30" },
};

const TAB_ITEMS: { key: Tab; label: string }[] = [
  { key: "threat", label: "Threat Lab" },
  { key: "score", label: "Security Score" },
  { key: "fga", label: "FGA Model" },
  { key: "audit", label: "Audit Trail" },
];

/* ── Helpers ───────────────────────────────────────────────────────────── */

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function ts(raw: string) {
  try {
    const d = new Date(raw);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return raw;
  }
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function SecurityPage() {
  const [tab, setTab] = useState<Tab>("threat");

  /* Threat Lab */
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<{ steps: ScenarioStep[] } | null>(null);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [running, setRunning] = useState(false);

  /* Security Score */
  const [score, setScore] = useState<SecurityScore | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [scoreLoading, setScoreLoading] = useState(false);

  /* FGA */
  const [fgaModel, setFgaModel] = useState<FGAModel | null>(null);
  const [fgaPerms, setFgaPerms] = useState<PermissionRow[]>([]);
  const [fgaModelOpen, setFgaModelOpen] = useState(false);

  /* Audit */
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState<"all" | "allowed" | "blocked" | "ciba">("all");

  /* CIBA */
  const [cibaRequests, setCibaRequests] = useState<CIBARequest[]>([]);

  const auditBottom = useRef<HTMLDivElement>(null);

  /* ── Loaders ──────────────────────────────────────────────────────────── */

  const loadScenarios = useCallback(async () => {
    try { setScenarios(await api<ScenarioMeta[]>("/scenarios")); } catch { /* noop */ }
  }, []);

  const loadScore = useCallback(async () => {
    setScoreLoading(true);
    try {
      const [s, t] = await Promise.all([
        api<SecurityScore>("/security-score"),
        api<TrendPoint[]>("/security-score/trend"),
      ]);
      setScore(s);
      setTrend(t);
    } catch { /* noop */ }
    setScoreLoading(false);
  }, []);

  const loadFGA = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([
        api<FGAModel>("/fga/model"),
        api<PermissionRow[]>("/fga/permissions"),
      ]);
      setFgaModel(m);
      setFgaPerms(p);
    } catch { /* noop */ }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      setAudit(await api<AuditEntry[]>("/audit"));
      setTimeout(() => auditBottom.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { /* noop */ }
  }, []);

  const loadCIBA = useCallback(async () => {
    try { setCibaRequests(await api<CIBARequest[]>("/ciba/pending")); } catch { /* noop */ }
  }, []);

  /* Initial loads per tab */
  useEffect(() => {
    if (tab === "threat") loadScenarios();
    if (tab === "score") loadScore();
    if (tab === "fga") loadFGA();
    if (tab === "audit") loadAudit();
  }, [tab, loadScenarios, loadScore, loadFGA, loadAudit]);

  /* Poll CIBA every 3 seconds */
  useEffect(() => {
    loadCIBA();
    const iv = setInterval(loadCIBA, 3000);
    return () => clearInterval(iv);
  }, [loadCIBA]);

  /* ── Threat Lab: select + run ─────────────────────────────────────────── */

  const selectScenario = async (id: string) => {
    setSelectedId(id);
    setStepResults([]);
    try {
      const full = await api<{ steps: ScenarioStep[] }>(`/scenarios/${id}`);
      setSelectedScenario(full);
    } catch { /* noop */ }
  };

  const runScenario = async () => {
    if (!selectedId || !selectedScenario) return;
    setRunning(true);
    setStepResults([]);
    for (let i = 0; i < selectedScenario.steps.length; i++) {
      try {
        const res = await api<StepResult>(`/scenarios/${selectedId}/step/${i + 1}`, { method: "POST" });
        setStepResults((prev) => [...prev, res]);
        await new Promise((r) => setTimeout(r, 1200));
      } catch { break; }
    }
    setRunning(false);
    loadCIBA();
  };

  /* ── CIBA actions ─────────────────────────────────────────────────────── */

  const handleCIBA = async (id: string, action: "approve" | "deny") => {
    try {
      await api(`/ciba/${id}/${action}`, { method: "POST" });
      setCibaRequests((prev) => prev.filter((r) => r.request_id !== id));
    } catch { /* noop */ }
  };

  /* ── Derived ──────────────────────────────────────────────────────────── */

  const meta = scenarios.find((s) => s.id === selectedId);

  const filteredAudit = audit.filter((e) => {
    if (auditFilter === "all") return true;
    if (auditFilter === "allowed") return e.success;
    if (auditFilter === "blocked") return !e.success;
    if (auditFilter === "ciba") return e.service.toLowerCase().includes("ciba");
    return true;
  });

  const blocked = stepResults.filter((r) => r.outcome === "blocked").length;
  const allowed = stepResults.filter((r) => r.outcome === "allowed_read").length;
  const escalated = stepResults.filter((r) => r.outcome === "escalated").length;
  const scenarioDone = !running && stepResults.length > 0 && selectedScenario && stepResults.length === selectedScenario.steps.length;

  /* ── Gauge SVG ─────────────────────────────────────────────────────────── */

  const gaugeRadius = 80;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = score ? gaugeCircumference * (1 - score.overall_score / 100) : gaugeCircumference;

  const gradeColor = score
    ? score.grade === "A" ? "#00ffa3"
      : score.grade === "B" ? "#00ffa3"
      : score.grade === "C" ? "#f59e0b"
      : "#ef4444"
    : "#333";

  /* ── Trend chart ───────────────────────────────────────────────────────── */

  const maxTrend = Math.max(...trend.map((t) => t.score), 100);

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <>

      {/* Page */}
      <div className="flex-1 overflow-y-auto bg-[#050505]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-[-0.03em] text-white" style={{ fontFamily: "'Space Grotesk'" }}>
                Security Center
              </h1>
              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                Auth0 Token Vault + FGA + CIBA -- real-time security enforcement
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ffa3] ring-pulse" />
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">All Systems Active</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {TAB_ITEMS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-[10px] font-bold tracking-[0.12em] uppercase rounded-xl active:scale-[0.97] transition-all duration-150 ${
                  tab === t.key
                    ? "text-[#00ffa3] bg-[#00ffa3]/8 border border-[#00ffa3]/30"
                    : "text-zinc-500 border border-transparent hover:text-zinc-300 hover:border-[#1a1a1a]"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">

          {/* ━━ TAB 1: THREAT LAB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {tab === "threat" && (
            <div>
              {!selectedId ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-[14px] font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk'" }}>
                      Interactive Threat Lab
                    </h2>
                    <p className="text-[10px] font-mono text-zinc-500">
                      Run attack scenarios against the live security stack. Every step triggers real Auth0 authorization checks and produces a real audit trail.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {scenarios.map((s) => (
                      <button key={s.id} onClick={() => selectScenario(s.id)}
                        className="text-left p-4 bg-[#080808] border border-[#1a1a1a] rounded-2xl hover:border-[#00ffa3]/30 active:scale-[0.97] transition-all duration-150 group">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-[11px] font-bold text-zinc-200 group-hover:text-[#00ffa3] transition" style={{ fontFamily: "'Space Grotesk'" }}>
                            {s.title}
                          </h3>
                          <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] border rounded-full ${DIFFICULTY_COLORS[s.difficulty]}`}>
                            {s.difficulty}
                          </span>
                        </div>
                        <p className="text-[9px] font-mono text-zinc-600 mb-3 leading-relaxed">{s.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {s.auth0_features.map((f) => (
                              <span key={f} className="px-1.5 py-0.5 text-[8px] font-mono text-[#00ffa3]/70 bg-[#00ffa3]/5 border border-[#00ffa3]/15 rounded-full">
                                {f}
                              </span>
                            ))}
                          </div>
                          <span className="text-[9px] font-mono text-zinc-600">{s.step_count} steps</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div>
                  {/* Back + Header */}
                  <button onClick={() => { setSelectedId(null); setSelectedScenario(null); setStepResults([]); }}
                    className="text-[10px] font-mono text-zinc-500 hover:text-[#00ffa3] transition mb-4 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back to scenarios
                  </button>

                  {meta && (
                    <div className="mb-5">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-[16px] font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>{meta.title}</h2>
                        <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] border rounded-full ${DIFFICULTY_COLORS[meta.difficulty]}`}>
                          {meta.difficulty}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-zinc-500 mb-3">{meta.description}</p>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {meta.auth0_features.map((f) => (
                          <span key={f} className="px-2 py-0.5 text-[9px] font-mono text-[#00ffa3]/80 bg-[#00ffa3]/5 border border-[#00ffa3]/20 rounded-full">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Execute Button */}
                  {stepResults.length === 0 && !running && (
                    <button onClick={runScenario}
                      className="px-6 py-3 text-[11px] font-bold tracking-[0.2em] uppercase bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/40 rounded-xl hover:bg-[#ef4444]/20 active:scale-[0.97] transition-all duration-150 mb-6"
                      style={{ boxShadow: "0 0 30px rgba(239,68,68,0.1)" }}>
                      Execute Attack Scenario
                    </button>
                  )}

                  {running && stepResults.length === 0 && (
                    <div className="flex items-center gap-2 mb-6">
                      <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
                      <span className="text-[10px] font-mono text-[#ef4444] uppercase tracking-wider">Initiating attack sequence...</span>
                    </div>
                  )}

                  {/* Step Results */}
                  <div className="space-y-3">
                    {stepResults.map((r, i) => {
                      const badge = OUTCOME_BADGE[r.outcome] ?? OUTCOME_BADGE["blocked"];
                      const isBlocked = r.outcome === "blocked";
                      const isEscalated = r.outcome === "escalated";
                      return (
                        <div key={i}
                          className={`p-4 border rounded-2xl fade-in ${
                            isBlocked ? "border-[#ef4444]/20 blocked-dramatic" :
                            isEscalated ? "border-[#f59e0b]/20 bg-[#f59e0b]/3" :
                            "border-[#00ffa3]/20 bg-[#080808]"
                          }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-zinc-500 font-mono">STEP {r.step.step_number}</span>
                              <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] border rounded-full ${badge.cls}`}>
                                {badge.label}
                              </span>
                              <span className="px-1.5 py-0.5 text-[8px] font-mono text-zinc-500 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
                                {r.step.security_layer}
                              </span>
                            </div>
                            {r.ciba_triggered && (
                              <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-full animate-pulse">
                                CIBA TRIGGERED
                              </span>
                            )}
                          </div>
                          <h4 className="text-[11px] font-bold text-zinc-200 mb-1" style={{ fontFamily: "'Space Grotesk'" }}>
                            {r.step.title}
                          </h4>
                          <p className="text-[9px] font-mono text-zinc-500 mb-2">{r.step.description}</p>
                          <div className="p-2 bg-[#050505] border border-[#1a1a1a] rounded-lg mb-2">
                            <code className="text-[9px] font-mono text-zinc-400 break-all">
                              <span className="text-zinc-600">$</span> {r.step.attack_action}
                            </code>
                          </div>
                          <p className={`text-[10px] italic leading-relaxed ${
                            isBlocked ? "text-[#ef4444]/90" :
                            isEscalated ? "text-[#f59e0b]/90" :
                            "text-[#00ffa3]/80"
                          }`}>
                            {r.drama_text}
                          </p>
                        </div>
                      );
                    })}

                    {running && stepResults.length > 0 && (
                      <div className="flex items-center gap-2 p-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                        <span className="text-[9px] font-mono text-zinc-500">Executing next step...</span>
                      </div>
                    )}
                  </div>

                  {/* Completion Summary */}
                  {scenarioDone && (
                    <div className="mt-6 p-4 border border-[#1a1a1a] bg-[#080808] rounded-2xl fade-in">
                      <h4 className="text-[11px] font-bold text-white mb-3 uppercase tracking-[0.15em]" style={{ fontFamily: "'Space Grotesk'" }}>
                        Scenario Complete
                      </h4>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                          <span className="text-[10px] font-mono text-zinc-400">{blocked} Blocked</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#00ffa3]" />
                          <span className="text-[10px] font-mono text-zinc-400">{allowed} Allowed</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                          <span className="text-[10px] font-mono text-zinc-400">{escalated} Escalated</span>
                        </div>
                      </div>
                      <p className="text-[9px] font-mono text-zinc-600 mt-3">
                        All steps logged to the audit trail. Switch to the Audit tab to see the full record.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ━━ TAB 2: SECURITY SCORE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {tab === "score" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[14px] font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>
                  Security Posture Score
                </h2>
                <button onClick={loadScore} disabled={scoreLoading}
                  className="px-3 py-1.5 text-[9px] font-bold tracking-[0.15em] uppercase text-zinc-400 border border-[#1a1a1a] rounded-lg hover:text-[#00ffa3] hover:border-[#00ffa3]/30 active:scale-[0.97] transition-all duration-150 disabled:opacity-50">
                  {scoreLoading ? "Loading..." : "Refresh"}
                </button>
              </div>

              {score && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Gauge + Grade */}
                  <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 bg-[#080808] border border-[#1a1a1a] rounded-2xl">
                    <svg width="200" height="200" viewBox="0 0 200 200" className="mb-3">
                      <circle cx="100" cy="100" r={gaugeRadius} fill="none" stroke="#1a1a1a" strokeWidth="8" />
                      <circle cx="100" cy="100" r={gaugeRadius} fill="none"
                        stroke={gradeColor} strokeWidth="8" strokeLinecap="butt"
                        strokeDasharray={gaugeCircumference} strokeDashoffset={gaugeOffset}
                        transform="rotate(-90 100 100)"
                        style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                      <text x="100" y="92" textAnchor="middle" className="fill-white text-[32px] font-bold" style={{ fontFamily: "'Space Grotesk'" }}>
                        {score.overall_score}
                      </text>
                      <text x="100" y="112" textAnchor="middle" className="fill-zinc-500 text-[10px] font-mono uppercase tracking-[0.2em]">
                        out of 100
                      </text>
                    </svg>
                    <div className="flex items-center gap-2">
                      <span className="text-[24px] font-bold" style={{ fontFamily: "'Space Grotesk'", color: gradeColor }}>
                        {score.grade}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Grade</span>
                    </div>
                  </div>

                  {/* Trend + Dimensions */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* 7-day Trend */}
                    {trend.length > 0 && (
                      <div className="p-4 bg-[#080808] border border-[#1a1a1a] rounded-2xl">
                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-3" style={{ fontFamily: "'Space Grotesk'" }}>
                          7-Day Trend
                        </h3>
                        <div className="flex items-end gap-1.5 h-16">
                          {trend.map((t, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full relative" style={{ height: `${(t.score / maxTrend) * 56}px` }}>
                                <div className="absolute inset-0 bg-[#00ffa3]/20 border-t border-[#00ffa3]/50"
                                  style={{ boxShadow: "0 -4px 12px rgba(0,255,163,0.1)" }} />
                              </div>
                              <span className="text-[7px] font-mono text-zinc-600">{t.date.slice(5)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dimension Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {score.dimensions.map((d) => (
                        <div key={d.name} className="p-3 bg-[#080808] border border-[#1a1a1a] rounded-2xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-zinc-300" style={{ fontFamily: "'Space Grotesk'" }}>{d.name}</span>
                            <span className="text-[10px] font-mono text-[#00ffa3]">{d.score}/{d.max}</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full mb-2">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${(d.score / d.max) * 100}%`, backgroundColor: d.score >= 80 ? "#00ffa3" : d.score >= 60 ? "#f59e0b" : "#ef4444" }} />
                          </div>
                          <p className="text-[8px] font-mono text-zinc-600 leading-relaxed">{d.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Events + Recommendations */}
              {score && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                  {/* Recent Events */}
                  <div className="p-4 bg-[#080808] border border-[#1a1a1a] rounded-2xl">
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-3" style={{ fontFamily: "'Space Grotesk'" }}>
                      Recent Events
                    </h3>
                    {score.recent_events.length === 0 && (
                      <p className="text-[9px] font-mono text-zinc-600">No recent security events.</p>
                    )}
                    <div className="space-y-2">
                      {score.recent_events.map((e, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#1a1a1a] last:border-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              e.type === "block" ? "bg-[#ef4444]" :
                              e.type === "deny" ? "bg-orange-400" :
                              e.type === "ciba" ? "bg-[#f59e0b]" :
                              "bg-[#00ffa3]"
                            }`} />
                            <span className="text-[9px] font-mono text-zinc-400 truncate max-w-[280px]">{e.text}</span>
                          </div>
                          <span className={`text-[9px] font-mono font-bold ${e.impact === "0" ? "text-zinc-600" : "text-[#00ffa3]"}`}>
                            {e.impact !== "0" ? `+${e.impact}` : "--"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 bg-[#080808] border border-[#1a1a1a] rounded-2xl">
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-3" style={{ fontFamily: "'Space Grotesk'" }}>
                      Recommendations
                    </h3>
                    {score.recommendations.length === 0 && (
                      <p className="text-[9px] font-mono text-[#00ffa3]">All security recommendations met. Full posture achieved.</p>
                    )}
                    <div className="space-y-2">
                      {score.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 py-1.5">
                          <span className="text-[9px] text-[#f59e0b] mt-0.5">&#9679;</span>
                          <span className="text-[9px] font-mono text-zinc-400 leading-relaxed">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ━━ TAB 3: FGA MODEL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {tab === "fga" && (
            <div>
              <div className="mb-6">
                <h2 className="text-[14px] font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk'" }}>
                  Authorization Model
                </h2>
                <p className="text-[10px] font-mono text-zinc-500">
                  Fine-Grained Authorization (FGA) defines exactly what the AI agent can and cannot do. Every tool call is checked against this model BEFORE execution.
                </p>
              </div>

              {/* Permission Matrix */}
              <div className="bg-[#080808] border border-[#1a1a1a] rounded-2xl mb-4 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a1a1a]">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em]" style={{ fontFamily: "'Space Grotesk'" }}>
                    Permission Matrix
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]">
                        <th className="text-left px-4 py-2 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] font-mono">Agent</th>
                        <th className="text-left px-4 py-2 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] font-mono">Relation</th>
                        <th className="text-left px-4 py-2 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] font-mono">Service</th>
                        <th className="text-left px-4 py-2 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] font-mono">Status</th>
                        <th className="text-left px-4 py-2 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] font-mono">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fgaPerms.map((p, i) => {
                        const isBlocked = p.status === "PERMANENTLY_BLOCKED";
                        return (
                          <tr key={i} className={`border-b border-[#0f0f0f] ${isBlocked ? "blocked-dramatic" : ""}`}>
                            <td className="px-4 py-2.5 text-[10px] font-mono text-zinc-300">fin-guard</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[10px] font-mono font-bold ${isBlocked ? "text-[#ef4444]" : "text-[#00ffa3]"}`}>
                                {p.access}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-[10px] font-mono text-zinc-300">{p.service}</td>
                            <td className="px-4 py-2.5">
                              {isBlocked ? (
                                <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-full">
                                  Permanently Blocked
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] text-[#00ffa3] bg-[#00ffa3]/10 border border-[#00ffa3]/30 rounded-full">
                                  Granted
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-[9px] font-mono text-zinc-500">{p.description}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Model JSON */}
              {fgaModel && (
                <div className="bg-[#080808] border border-[#1a1a1a] rounded-2xl mb-4">
                  <button onClick={() => setFgaModelOpen(!fgaModelOpen)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left rounded-2xl hover:bg-[#0a0a0a] active:scale-[0.99] transition-all duration-150">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em]" style={{ fontFamily: "'Space Grotesk'" }}>
                      FGA Model Definition (JSON)
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${fgaModelOpen ? "rotate-180" : ""}`}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                  {fgaModelOpen && (
                    <div className="px-4 pb-4 border-t border-[#1a1a1a]">
                      <pre className="mt-3 p-3 bg-[#050505] border border-[#1a1a1a] rounded-xl overflow-x-auto text-[9px] font-mono text-zinc-400 leading-relaxed">
                        {JSON.stringify(fgaModel.model, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Note */}
              <div className="p-3 border border-[#00ffa3]/15 bg-[#00ffa3]/3 rounded-xl">
                <p className="text-[9px] font-mono text-[#00ffa3]/80 leading-relaxed">
                  Every tool call is checked against this model BEFORE execution. The agent cannot bypass FGA -- it is enforced at the framework level, not inside the agent. Even if the agent is compromised, the authorization boundary holds.
                </p>
              </div>
            </div>
          )}

          {/* ━━ TAB 4: AUDIT TRAIL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {tab === "audit" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-[14px] font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>
                    Audit Trail
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ffa3] animate-pulse" />
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Live</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600">{filteredAudit.length} entries</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={loadAudit}
                    className="px-2 py-1 text-[9px] font-mono text-zinc-500 border border-[#1a1a1a] rounded-lg hover:text-[#00ffa3] hover:border-[#00ffa3]/30 active:scale-[0.97] transition-all duration-150">
                    Refresh
                  </button>
                  <button onClick={async () => { await api("/audit/clear", { method: "POST" }); setAudit([]); }}
                    className="px-2 py-1 text-[9px] font-mono text-zinc-600 border border-[#1a1a1a] rounded-lg hover:text-[#ef4444] hover:border-[#ef4444]/30 active:scale-[0.97] transition-all duration-150">
                    Clear
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-1 mb-4">
                {(["all", "allowed", "blocked", "ciba"] as const).map((f) => (
                  <button key={f} onClick={() => setAuditFilter(f)}
                    className={`px-3 py-1.5 text-[9px] font-bold tracking-[0.12em] uppercase rounded-xl active:scale-[0.97] transition-all duration-150 ${
                      auditFilter === f
                        ? f === "blocked" ? "text-[#ef4444] bg-[#ef4444]/8 border border-[#ef4444]/30"
                          : f === "ciba" ? "text-[#f59e0b] bg-[#f59e0b]/8 border border-[#f59e0b]/30"
                          : "text-[#00ffa3] bg-[#00ffa3]/8 border border-[#00ffa3]/30"
                        : "text-zinc-500 border border-transparent hover:border-[#1a1a1a]"
                    }`}>
                    {f}
                  </button>
                ))}
              </div>

              {/* Entries */}
              <div className="space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto">
                {filteredAudit.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-[10px] font-mono text-zinc-600">No audit entries yet. Run a scenario in the Threat Lab to generate entries.</p>
                  </div>
                )}
                {filteredAudit.map((e, i) => {
                  const isBlockedEntry = !e.success;
                  const isCiba = e.service.toLowerCase().includes("ciba");
                  return (
                    <div key={i}
                      className={`flex items-start gap-3 px-3 py-2.5 border rounded-xl transition ${
                        isBlockedEntry
                          ? "border-[#ef4444]/15 blocked-dramatic"
                          : isCiba
                          ? "border-[#f59e0b]/15 bg-[#f59e0b]/3"
                          : "border-[#1a1a1a] bg-[#080808]"
                      }`}>
                      {/* Icon */}
                      <span className={`mt-0.5 text-[10px] ${isBlockedEntry ? "text-[#ef4444]" : "text-[#00ffa3]"}`}>
                        {isBlockedEntry ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                            <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                            <circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>
                          </svg>
                        )}
                      </span>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-mono text-zinc-600">{ts(e.timestamp)}</span>
                          <span className="text-[9px] font-mono text-zinc-400">{e.action}</span>
                          <span className={`px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.15em] border rounded-full ${
                            e.permission_used === "read"
                              ? "text-[#00ffa3] border-[#00ffa3]/20 bg-[#00ffa3]/5"
                              : "text-[#ef4444] border-[#ef4444]/20 bg-[#ef4444]/5"
                          }`}>
                            {e.permission_used}
                          </span>
                        </div>
                        <p className="text-[9px] font-mono text-zinc-500 mt-0.5 truncate">{e.details}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={auditBottom} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
