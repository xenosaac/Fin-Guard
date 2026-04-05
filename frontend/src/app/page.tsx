"use client";

import Link from "next/link";

const FEATURES = [
  { title: "Token Vault", desc: "Read-only OAuth tokens via Auth0. Scoped access, never raw credentials.", icon: "🔐" },
  { title: "Fine-Grained Auth", desc: "Every tool call pre-checked by FGA. Write access permanently blocked.", icon: "🛡️" },
  { title: "CIBA Approval", desc: "High-risk actions trigger push notifications. AI waits for your approval.", icon: "⚡" },
  { title: "Full Audit Trail", desc: "Every API call, every permission check, every blocked attempt logged.", icon: "📋" },
  { title: "AI Analysis", desc: "GPT-powered spending analysis, anomaly detection, budget monitoring.", icon: "🤖" },
  { title: "Threat Lab", desc: "Run attack scenarios and watch every security layer respond in real-time.", icon: "🧪" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 lg:px-12 py-4 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <svg className="w-7 h-7 text-[#00ffa3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-lg font-bold tracking-tight text-[#00ffa3]" style={{ fontFamily: "'Space Grotesk'" }}>
            FIN—GUARD
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline px-3 py-1 text-[9px] font-bold tracking-widest text-[#00ffa3] border border-[#00ffa3]/20 bg-[#00ffa3]/5 uppercase rounded-full">
            Zero-Trust
          </span>
          <Link href="/dashboard"
            className="px-5 py-2.5 text-[10px] font-bold tracking-widest bg-[#00ffa3] text-black uppercase rounded-xl hover:bg-[#00ef99] active:scale-95 transition-all">
            Launch App
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-[88vh] px-6 overflow-hidden">
        {/* Glow background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #00ffa3 0%, transparent 70%)" }} />
        </div>

        {/* Shield icon */}
        <div className="relative mb-8 animate-pulse">
          <svg className="w-24 h-28 lg:w-32 lg:h-36 text-[#00ffa3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(0,255,163,0.05)" />
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" strokeWidth="1.5" />
          </svg>
        </div>

        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-center mb-6 leading-tight" style={{ fontFamily: "'Space Grotesk'" }}>
          <span className="text-white">Your Money.</span>
          <br />
          <span className="text-[#00ffa3]">Our Watch.</span>
        </h1>

        <p className="text-sm lg:text-base text-zinc-500 max-w-lg mx-auto text-center mb-10 font-mono leading-relaxed">
          Read-only AI guardian. Zero write access. Full transparency.
        </p>

        <div className="flex gap-4">
          <Link href="/dashboard"
            className="px-7 py-3.5 text-[11px] font-bold tracking-widest bg-[#00ffa3] text-black uppercase rounded-xl hover:bg-[#00ef99] active:scale-95 transition-all"
            style={{ boxShadow: "0 0 40px rgba(0,255,163,0.2)" }}>
            Open Dashboard
          </Link>
          <Link href="/security"
            className="px-7 py-3.5 text-[11px] font-bold tracking-widest text-[#00ffa3] border border-[#00ffa3]/30 uppercase rounded-xl hover:bg-[#00ffa3]/10 active:scale-95 transition-all">
            Try Threat Lab
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/5">
          {[
            { val: "3", label: "Security Layers" },
            { val: "100%", label: "Read-Only" },
            { val: "∞", label: "Every Call Audited" },
            { val: "You", label: "Human-in-the-Loop" },
          ].map((s) => (
            <div key={s.label} className="py-8 px-6 text-center">
              <div className="text-2xl font-bold text-[#00ffa3] mb-1" style={{ fontFamily: "'Space Grotesk'" }}>{s.val}</div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-12 py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.3em] text-zinc-600 uppercase text-center mb-10">
            Auth0 Security Stack
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl hover:border-[#00ffa3]/20 hover:-translate-y-0.5 transition-all group">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-bold text-zinc-200 mb-2 group-hover:text-[#00ffa3] transition" style={{ fontFamily: "'Space Grotesk'" }}>
                  {f.title}
                </h3>
                <p className="text-[11px] text-zinc-600 font-mono leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 lg:px-12 py-16 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.3em] text-zinc-600 uppercase text-center mb-10">
            How It Works
          </h2>
          <div className="space-y-0">
            {[
              { n: "01", t: "Connect your accounts", d: "Token Vault manages OAuth tokens. Read-only scoped tokens, never raw credentials." },
              { n: "02", t: "AI monitors your finances", d: "Reads transactions, analyzes patterns, checks budgets. Every tool call verified by FGA." },
              { n: "03", t: "High-risk triggers CIBA", d: "Transactions over $1,000 require your explicit approval via push notification." },
              { n: "04", t: "Full audit trail", d: "Every permission check and blocked attempt is logged with timestamps." },
            ].map((s, i) => (
              <div key={s.n} className="flex gap-5 py-6 border-b border-white/5 last:border-0">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-[#00ffa3]/5 border border-[#00ffa3]/10">
                  <span className="text-[12px] font-bold text-[#00ffa3]" style={{ fontFamily: "'Space Grotesk'" }}>{s.n}</span>
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-zinc-200 mb-1" style={{ fontFamily: "'Space Grotesk'" }}>{s.t}</h3>
                  <p className="text-[11px] text-zinc-600 font-mono leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-12 py-20 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk'" }}>
          See it in action.
        </h2>
        <p className="text-[11px] text-zinc-600 font-mono mb-8">
          The AI agent connects, analyzes, and reports — all within seconds.
        </p>
        <Link href="/dashboard"
          className="inline-block px-8 py-4 text-[11px] font-bold tracking-widest bg-[#00ffa3] text-black uppercase rounded-xl hover:bg-[#00ef99] active:scale-95 transition-all"
          style={{ boxShadow: "0 0 50px rgba(0,255,163,0.2)" }}>
          Launch Fin-Guard
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-12 py-4 border-t border-white/5 flex flex-col sm:flex-row justify-between text-[9px] text-zinc-700 uppercase font-mono tracking-widest">
        <span>Fin-Guard — Read-Only AI Financial Guardian</span>
        <span>Built for Auth0 "Authorized to Act" Hackathon</span>
      </footer>
    </div>
  );
}
