"use client";

import Link from "next/link";

const FEATURES = [
  {
    title: "Token Vault",
    desc: "Read-only OAuth tokens managed by Auth0. Your agent gets scoped access, never raw credentials.",
    icon: "🔐",
  },
  {
    title: "Fine-Grained Authorization",
    desc: "Every tool call is pre-checked against an FGA permission model. Write access? Permanently blocked.",
    icon: "🛡️",
  },
  {
    title: "CIBA Human-in-Loop",
    desc: "High-risk detections trigger push notifications to your device. The AI waits for your approval.",
    icon: "⚡",
  },
  {
    title: "Full Audit Trail",
    desc: "Every API call, every permission check, every blocked attempt. Complete transparency.",
    icon: "📋",
  },
  {
    title: "AI Financial Analysis",
    desc: "GPT-powered spending analysis, anomaly detection, and budget monitoring. Read-only, always.",
    icon: "🤖",
  },
  {
    title: "Interactive Threat Lab",
    desc: "Test the security model yourself. Run attack scenarios and watch every layer respond in real-time.",
    icon: "🧪",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2.5">
          <svg className="w-7 h-7 text-[#00ffa3] shield-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-lg font-bold tracking-[-0.04em] text-[#00ffa3]" style={{ fontFamily: "'Space Grotesk'" }}>
            FIN—GUARD
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline px-3 py-1 text-[9px] font-bold tracking-[0.2em] text-[#00ffa3] border border-[#00ffa3]/20 bg-[#00ffa3]/5 uppercase">
            Zero-Trust
          </span>
          <Link href="/dashboard"
            className="px-4 py-2 text-[10px] font-bold tracking-[0.15em] bg-[#00ffa3] text-black uppercase hover:bg-[#00ef99] transition">
            Launch App →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 lg:px-12 py-16 lg:py-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-[9px] font-mono text-zinc-500 border border-[#1a1a1a] bg-[#0a0a0a]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ffa3]" />
          Powered by Auth0 Token Vault + FGA + CIBA
        </div>

        <h1 className="text-4xl lg:text-6xl font-bold tracking-[-0.04em] mb-6 leading-tight" style={{ fontFamily: "'Space Grotesk'" }}>
          Your AI Financial Guardian.
          <br />
          <span className="text-[#00ffa3]">Read-Only. By Design.</span>
        </h1>

        <p className="text-sm lg:text-base text-zinc-500 max-w-2xl mx-auto mb-8 leading-relaxed font-mono">
          Fin-Guard monitors your finances using AI, but can never modify your data.
          Every tool call is authorized by Auth0 FGA. Every high-risk finding requires
          your explicit approval via CIBA. Zero trust, full transparency.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard"
            className="px-6 py-3 text-[11px] font-bold tracking-[0.2em] bg-[#00ffa3] text-black uppercase hover:bg-[#00ef99] transition"
            style={{ boxShadow: "0 0 30px rgba(0,255,163,0.15)" }}>
            Open Dashboard
          </Link>
          <Link href="/security"
            className="px-6 py-3 text-[11px] font-bold tracking-[0.2em] text-[#00ffa3] border border-[#00ffa3]/30 uppercase hover:bg-[#00ffa3]/10 transition">
            Try Threat Lab
          </Link>
        </div>
      </section>

      {/* Security Stack */}
      <section className="px-6 lg:px-12 py-12 border-t border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.3em] text-zinc-600 uppercase text-center mb-8">
            Auth0 Security Stack
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feat) => (
              <div key={feat.title} className="p-5 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#00ffa3]/20 transition group">
                <div className="text-xl mb-3">{feat.icon}</div>
                <h3 className="text-[12px] font-bold text-zinc-200 mb-2 group-hover:text-[#00ffa3] transition" style={{ fontFamily: "'Space Grotesk'" }}>
                  {feat.title}
                </h3>
                <p className="text-[10px] text-zinc-600 font-mono leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 lg:px-12 py-12 border-t border-[#1a1a1a]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.3em] text-zinc-600 uppercase text-center mb-8">
            How It Works
          </h2>
          <div className="space-y-4">
            {[
              { step: "01", title: "Connect your accounts", desc: "Auth0 Token Vault manages OAuth tokens. Your agent gets read-only scoped tokens, never raw credentials. RFC 8693 token exchange ensures minimal privilege." },
              { step: "02", title: "AI monitors your finances", desc: "The agent reads transactions, analyzes spending patterns, checks budgets, and flags anomalies. Every tool call is verified by FGA before execution." },
              { step: "03", title: "High-risk findings trigger CIBA", desc: "When the agent detects transactions over $1,000 or unusual patterns, it cannot act alone. Auth0 CIBA sends a push notification to your device for approval." },
              { step: "04", title: "Full audit trail", desc: "Every API call, every FGA permission check, every blocked write attempt is logged. Complete transparency into what your AI agent did and why." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 p-4 bg-[#0a0a0a] border border-[#1a1a1a]">
                <span className="text-[20px] font-bold text-[#00ffa3]/30 shrink-0" style={{ fontFamily: "'Space Grotesk'" }}>{item.step}</span>
                <div>
                  <h3 className="text-[11px] font-bold text-zinc-200 mb-1" style={{ fontFamily: "'Space Grotesk'" }}>{item.title}</h3>
                  <p className="text-[10px] text-zinc-600 font-mono leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-12 py-16 border-t border-[#1a1a1a] text-center">
        <h2 className="text-2xl font-bold tracking-[-0.03em] mb-4" style={{ fontFamily: "'Space Grotesk'" }}>
          See it in action.
        </h2>
        <p className="text-[11px] text-zinc-600 font-mono mb-6">
          Try the interactive Threat Lab. Run attack scenarios. Watch every Auth0 security layer fire.
        </p>
        <Link href="/dashboard"
          className="inline-block px-8 py-3 text-[11px] font-bold tracking-[0.2em] bg-[#00ffa3] text-black uppercase hover:bg-[#00ef99] transition"
          style={{ boxShadow: "0 0 40px rgba(0,255,163,0.2)" }}>
          Launch Fin-Guard
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-12 py-4 border-t border-[#1a1a1a] flex flex-col sm:flex-row justify-between text-[9px] text-zinc-700 uppercase font-mono tracking-[0.15em]">
        <span>Fin-Guard // Read-Only AI Financial Guardian</span>
        <span>Built for Auth0 &quot;Authorized to Act&quot; Hackathon 2025</span>
      </footer>
    </div>
  );
}
