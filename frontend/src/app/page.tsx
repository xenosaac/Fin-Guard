"use client";

import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: "3", label: "Security Layers", desc: "Token Vault + FGA + CIBA" },
  { value: "100%", label: "Read-Only", desc: "Zero write access, ever" },
  { value: "\u221E", label: "Every Call Audited", desc: "Full transparency trail" },
  { value: "You", label: "Human-in-the-Loop", desc: "CIBA approval required" },
];

const FEATURES = [
  {
    title: "Token Vault",
    desc: "Read-only OAuth tokens via Auth0. Your agent gets scoped access — never raw credentials.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <circle cx="12" cy="16.5" r="1.5" />
      </svg>
    ),
  },
  {
    title: "Fine-Grained Auth",
    desc: "Every tool call is pre-checked against an FGA permission model. Write access is permanently blocked.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "CIBA Approval",
    desc: "High-risk detections trigger push notifications. The AI pauses and waits for your explicit approval.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    title: "Audit Trail",
    desc: "Every API call, every permission check, every blocked attempt — logged with timestamps.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    ),
  },
  {
    title: "AI Analysis",
    desc: "LLM-powered spending analysis, anomaly detection, and budget monitoring. Read-only, always.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: "Threat Lab",
    desc: "Run attack scenarios yourself. Watch every security layer respond in real-time.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M9 3h6l2 4H7l2-4z" />
        <rect x="5" y="7" width="14" height="14" rx="2" />
        <circle cx="9" cy="14" r="1.5" />
        <circle cx="15" cy="14" r="1.5" />
        <path d="M9 18h6" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    num: "01",
    title: "Connect your accounts",
    desc: "Auth0 Token Vault manages OAuth tokens. Your agent gets read-only scoped tokens — never raw credentials. RFC 8693 token exchange ensures minimal privilege.",
  },
  {
    num: "02",
    title: "AI monitors your finances",
    desc: "The agent reads transactions, analyzes spending patterns, checks budgets, and flags anomalies. Every tool call is verified by FGA before execution.",
  },
  {
    num: "03",
    title: "High-risk findings trigger CIBA",
    desc: "Transactions over $1,000 or unusual patterns require your approval. Auth0 CIBA sends a push notification to your device. The AI waits.",
  },
  {
    num: "04",
    title: "Full transparency",
    desc: "Every API call, every FGA check, every blocked write attempt — logged and visible. You see exactly what your AI agent did and why.",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <>
      {/* --- Embedded keyframes ------------------------------------ */}
      <style>{`
        @keyframes ring-expand {
          0%   { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes shield-pulse {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(0,255,163,0.25)); }
          50%      { filter: drop-shadow(0 0 50px rgba(0,255,163,0.55)); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-line {
          0%   { opacity: 0; transform: scaleX(0); }
          50%  { opacity: 1; transform: scaleX(1); }
          100% { opacity: 0; transform: scaleX(0); }
        }
        .ring {
          position: absolute;
          border-radius: 9999px;
          border: 1px solid rgba(0,255,163,0.15);
          animation: ring-expand 4s ease-out infinite;
          pointer-events: none;
        }
        .ring-1 { width: 260px; height: 260px; animation-delay: 0s; }
        .ring-2 { width: 380px; height: 380px; animation-delay: 1s; }
        .ring-3 { width: 500px; height: 500px; animation-delay: 2s; }
        .ring-4 { width: 620px; height: 620px; animation-delay: 3s; }
        .hero-shield {
          animation: shield-pulse 4s ease-in-out infinite, float 6s ease-in-out infinite;
        }
        .fade-up-1 { animation: fade-up 0.8s ease-out both; animation-delay: 0.15s; }
        .fade-up-2 { animation: fade-up 0.8s ease-out both; animation-delay: 0.35s; }
        .fade-up-3 { animation: fade-up 0.8s ease-out both; animation-delay: 0.55s; }
        .fade-up-4 { animation: fade-up 0.8s ease-out both; animation-delay: 0.75s; }
        .glass-card {
          background: rgba(10,10,10,0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.04);
          transition: all 0.3s ease;
        }
        .glass-card:hover {
          border-color: rgba(0,255,163,0.2);
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(0,255,163,0.06);
        }
        .glow-line {
          animation: glow-line 3s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>

      <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">

        {/* ====== HEADER ====== */}
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 py-4 border-b border-white/[0.04] bg-[#050505]/80 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <svg className="w-7 h-7 text-[#00ffa3] shield-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span
              className="text-lg font-bold tracking-[-0.04em] text-[#00ffa3]"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              FIN—GUARD
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline px-3 py-1 text-[9px] font-bold tracking-[0.2em] text-[#00ffa3] border border-[#00ffa3]/20 bg-[#00ffa3]/5 uppercase rounded-full">
              Zero-Trust
            </span>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 text-[10px] font-bold tracking-[0.15em] bg-[#00ffa3] text-black uppercase rounded-xl hover:bg-[#00ef99] active:scale-[0.97] transition-all duration-150"
            >
              Launch App
            </Link>
          </div>
        </header>

        {/* ====== HERO ====== */}
        <section className="relative flex flex-col items-center justify-center min-h-[92vh] pt-20 px-6 lg:px-12 overflow-hidden">

          {/* Ambient radial glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(0,255,163,0.06) 0%, rgba(0,255,163,0.02) 30%, transparent 70%)",
            }}
          />

          {/* Concentric rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
            <div className="ring ring-1" />
            <div className="ring ring-2" />
            <div className="ring ring-3" />
            <div className="ring ring-4" />
          </div>

          {/* Shield SVG */}
          <div className="relative hero-shield mb-10 fade-up-1">
            <svg
              viewBox="0 0 120 140"
              fill="none"
              className="w-28 h-32 lg:w-36 lg:h-40"
            >
              {/* Outer glow */}
              <defs>
                <radialGradient id="shieldGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00ffa3" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00ffa3" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="shieldFill" x1="60" y1="0" x2="60" y2="140" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00ffa3" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#00ffa3" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <ellipse cx="60" cy="70" rx="55" ry="60" fill="url(#shieldGlow)" />
              <path
                d="M60 8 L108 30 L108 70 C108 100 60 132 60 132 C60 132 12 100 12 70 L12 30 Z"
                fill="url(#shieldFill)"
                stroke="#00ffa3"
                strokeWidth="1.2"
                strokeOpacity="0.5"
              />
              {/* Inner shield detail */}
              <path
                d="M60 24 L94 40 L94 68 C94 90 60 116 60 116 C60 116 26 90 26 68 L26 40 Z"
                fill="none"
                stroke="#00ffa3"
                strokeWidth="0.5"
                strokeOpacity="0.2"
              />
              {/* Checkmark */}
              <path
                d="M44 68 L55 80 L78 56"
                fill="none"
                stroke="#00ffa3"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.8"
              />
            </svg>
          </div>

          {/* Headline */}
          <h1
            className="relative text-center fade-up-2"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            <span className="block text-5xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.04em] text-white">
              Your Money.
            </span>
            <span className="block text-5xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.04em] text-[#00ffa3] mt-1">
              Our Watch.
            </span>
          </h1>

          {/* Subtext */}
          <p
            className="relative mt-6 text-sm lg:text-base text-zinc-500 text-center max-w-xl leading-relaxed fade-up-3"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Read-only AI guardian. Zero write access. Full transparency.
          </p>

          {/* CTA Buttons */}
          <div className="relative flex flex-col sm:flex-row gap-4 mt-10 fade-up-4">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 text-[11px] font-bold tracking-[0.2em] bg-[#00ffa3] text-black uppercase rounded-xl hover:bg-[#00ef99] active:scale-[0.97] transition-all duration-150"
              style={{ boxShadow: "0 0 40px rgba(0,255,163,0.2), 0 0 80px rgba(0,255,163,0.08)" }}
            >
              Open Dashboard
            </Link>
            <Link
              href="/security"
              className="px-8 py-3.5 text-[11px] font-bold tracking-[0.2em] text-[#00ffa3] border border-[#00ffa3]/30 uppercase rounded-xl hover:bg-[#00ffa3]/10 hover:border-[#00ffa3]/50 active:scale-[0.97] transition-all duration-150"
            >
              Try Threat Lab
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-600">
            <span className="text-[9px] tracking-[0.3em] uppercase font-mono">Scroll</span>
            <svg className="w-4 h-4 animate-bounce" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </div>
        </section>

        {/* ====== STATS STRIP ====== */}
        <section
          className="relative py-16 px-6 lg:px-12 border-t border-white/[0.04]"
          style={{
            background: "linear-gradient(180deg, rgba(0,255,163,0.02) 0%, transparent 100%)",
          }}
        >
          <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className="text-3xl lg:text-4xl font-bold text-[#00ffa3] mb-2"
                  style={{ fontFamily: "'Space Grotesk'" }}
                >
                  {s.value}
                </div>
                <div
                  className="text-[11px] font-semibold text-zinc-300 uppercase tracking-[0.15em] mb-1"
                  style={{ fontFamily: "'Space Grotesk'" }}
                >
                  {s.label}
                </div>
                <div className="text-[10px] text-zinc-600 font-mono">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ====== FEATURES GRID ====== */}
        <section className="py-24 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[10px] font-bold tracking-[0.3em] text-[#00ffa3]/50 uppercase mb-4 font-mono">
                Security Stack
              </p>
              <h2
                className="text-3xl lg:text-4xl font-bold tracking-[-0.03em] text-white"
                style={{ fontFamily: "'Space Grotesk'" }}
              >
                Three layers between
                <br />
                your AI and your data.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((feat) => (
                <div
                  key={feat.title}
                  className="glass-card rounded-2xl p-6 group cursor-default"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#00ffa3]/[0.06] border border-[#00ffa3]/10 flex items-center justify-center text-[#00ffa3] mb-5 group-hover:bg-[#00ffa3]/[0.1] transition-all">
                    {feat.icon}
                  </div>
                  <h3
                    className="text-sm font-semibold text-zinc-200 mb-2 group-hover:text-[#00ffa3] transition-colors"
                    style={{ fontFamily: "'Space Grotesk'" }}
                  >
                    {feat.title}
                  </h3>
                  <p className="text-[11px] text-zinc-600 font-mono leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====== HOW IT WORKS ====== */}
        <section className="py-24 px-6 lg:px-12 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[10px] font-bold tracking-[0.3em] text-[#00ffa3]/50 uppercase mb-4 font-mono">
                How It Works
              </p>
              <h2
                className="text-3xl lg:text-4xl font-bold tracking-[-0.03em] text-white"
                style={{ fontFamily: "'Space Grotesk'" }}
              >
                From connect to protected
                <br />
                in four steps.
              </h2>
            </div>

            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-[23px] top-4 bottom-4 w-px bg-gradient-to-b from-[#00ffa3]/20 via-[#00ffa3]/10 to-transparent hidden md:block" />

              <div className="space-y-6">
                {STEPS.map((step, i) => (
                  <div key={step.num} className="flex gap-6 group">
                    {/* Step number */}
                    <div className="shrink-0 relative">
                      <div
                        className="w-12 h-12 rounded-xl bg-[#0a0a0a] border border-white/[0.06] flex items-center justify-center text-[#00ffa3] text-sm font-bold group-hover:border-[#00ffa3]/30 group-hover:bg-[#00ffa3]/[0.04] transition-all"
                        style={{ fontFamily: "'Space Grotesk'" }}
                      >
                        {step.num}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="absolute left-1/2 top-12 w-px h-6 bg-white/[0.04] -translate-x-1/2 md:hidden" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pt-1 pb-2">
                      <h3
                        className="text-sm font-semibold text-zinc-200 mb-1.5 group-hover:text-[#00ffa3] transition-colors"
                        style={{ fontFamily: "'Space Grotesk'" }}
                      >
                        {step.title}
                      </h3>
                      <p className="text-[11px] text-zinc-600 font-mono leading-relaxed max-w-lg">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ====== BOTTOM CTA ====== */}
        <section className="relative py-32 px-6 lg:px-12 border-t border-white/[0.04] overflow-hidden">
          {/* Background glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(ellipse, rgba(0,255,163,0.05) 0%, transparent 70%)",
            }}
          />

          <div className="relative text-center max-w-2xl mx-auto">
            <h2
              className="text-4xl lg:text-5xl font-bold tracking-[-0.04em] text-white mb-4"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              See it in action.
            </h2>
            <p className="text-sm text-zinc-600 font-mono mb-10 max-w-md mx-auto leading-relaxed">
              Run attack scenarios. Watch every Auth0 security layer fire in real-time. Break nothing.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-10 py-4 text-[11px] font-bold tracking-[0.2em] bg-[#00ffa3] text-black uppercase rounded-xl hover:bg-[#00ef99] active:scale-[0.97] transition-all duration-150"
              style={{
                boxShadow: "0 0 50px rgba(0,255,163,0.25), 0 0 100px rgba(0,255,163,0.1)",
              }}
            >
              Launch Fin-Guard
            </Link>
          </div>
        </section>

        {/* ====== FOOTER ====== */}
        <footer className="px-6 lg:px-12 py-6 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[#00ffa3]/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-[9px] text-zinc-700 uppercase font-mono tracking-[0.15em]">
                Fin-Guard // Read-Only AI Financial Guardian
              </span>
            </div>
            <span className="text-[9px] text-zinc-700 uppercase font-mono tracking-[0.15em]">
              Built for Auth0 &quot;Authorized to Act&quot; Hackathon 2025
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
