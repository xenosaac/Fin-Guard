"use client";

import { useState } from "react";

const CONNECTED_SERVICES = [
  { name: "Chase Bank", scope: "READ-ONLY", date: "Mar 12, 2025" },
  { name: "Fidelity Investments", scope: "READ-ONLY", date: "Mar 14, 2025" },
  { name: "Mint Alerts", scope: "ALERT-ONLY", date: "Mar 18, 2025" },
];

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(false);
  const [dangerMsg, setDangerMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "Isaac Zhang",
    nickname: "Isaac",
    phone: "+1 (555) 123-4567",
    birthday: "1995-06-15",
    address: "123 Tech Street, San Francisco, CA 94107",
  });

  const handleSave = () => {
    setEditing(false);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const ficoScore = 742;
  const ficoPercent = ((ficoScore - 300) / 550) * 100;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Toast */}
      <div
        className={`fixed top-6 right-6 z-50 px-4 py-2.5 bg-[#00ffa3]/10 border border-[#00ffa3]/30 rounded-xl text-[#00ffa3] text-[11px] font-mono tracking-wider transition-all duration-300 ${
          toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        Changes saved successfully
      </div>

      {/* Header */}
      <div className="px-6 lg:px-10 py-6 border-b border-[#1a1a1a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-[-0.03em] text-white" style={{ fontFamily: "'Space Grotesk'" }}>
            Profile
          </h1>
          <span className="px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] text-[#00ffa3] border border-[#00ffa3]/20 bg-[#00ffa3]/5 uppercase font-mono rounded-full">
            Connected via Auth0
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-600 tracking-wider uppercase">
          FGA: user_profile writable
        </span>
      </div>

      <div className="px-6 lg:px-10 py-8 space-y-6">
        {/* ── Profile Header Card ──────────────────────────────────────── */}
        <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-16 h-16 shrink-0 bg-[#00ffa3]/10 border border-[#00ffa3]/20 rounded-2xl flex items-center justify-center">
            <span className="text-xl font-bold text-[#00ffa3]" style={{ fontFamily: "'Space Grotesk'" }}>IZ</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white tracking-[-0.02em]" style={{ fontFamily: "'Space Grotesk'" }}>
              Isaac Zhang
            </h2>
            <p className="text-[11px] font-mono text-zinc-500 mt-0.5">isaac@xiangliu.net</p>
            <p className="text-[10px] text-zinc-600 mt-1">Member since March 2025</p>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className={`shrink-0 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] font-mono border rounded-xl active:scale-[0.97] transition-all duration-150 ${
              editing
                ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/5 hover:bg-yellow-400/10"
                : "text-[#00ffa3] border-[#00ffa3]/20 bg-[#00ffa3]/5 hover:bg-[#00ffa3]/10"
            }`}
          >
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        {/* ── Personal Information ─────────────────────────────────────── */}
        <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl">
          <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-5" style={{ fontFamily: "'Space Grotesk'" }}>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <label className="block">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] block mb-1.5">Full Name</span>
              {editing ? (
                <input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full bg-[#080808] border border-[#2a2a2a] rounded-lg focus:border-[#00ffa3]/50 text-[13px] text-white px-3 py-2 font-mono outline-none transition-colors"
                />
              ) : (
                <span className="text-[13px] text-zinc-200 font-mono">{form.fullName}</span>
              )}
            </label>
            {/* Nickname */}
            <label className="block">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] block mb-1.5">Nickname</span>
              {editing ? (
                <input
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  className="w-full bg-[#080808] border border-[#2a2a2a] rounded-lg focus:border-[#00ffa3]/50 text-[13px] text-white px-3 py-2 font-mono outline-none transition-colors"
                />
              ) : (
                <span className="text-[13px] text-zinc-200 font-mono">{form.nickname}</span>
              )}
            </label>
            {/* Email (read-only) */}
            <label className="block">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] block mb-1.5">
                Email <span className="text-zinc-700 ml-1">managed by Auth0</span>
              </span>
              <span className="text-[13px] text-zinc-500 font-mono">isaac@xiangliu.net</span>
            </label>
            {/* Phone */}
            <label className="block">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] block mb-1.5">Phone</span>
              {editing ? (
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-[#080808] border border-[#2a2a2a] rounded-lg focus:border-[#00ffa3]/50 text-[13px] text-white px-3 py-2 font-mono outline-none transition-colors"
                />
              ) : (
                <span className="text-[13px] text-zinc-200 font-mono">{form.phone}</span>
              )}
            </label>
            {/* Birthday */}
            <label className="block">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] block mb-1.5">Birthday</span>
              {editing ? (
                <input
                  type="date"
                  value={form.birthday}
                  onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                  className="w-full bg-[#080808] border border-[#2a2a2a] rounded-lg focus:border-[#00ffa3]/50 text-[13px] text-white px-3 py-2 font-mono outline-none transition-colors [color-scheme:dark]"
                />
              ) : (
                <span className="text-[13px] text-zinc-200 font-mono">{form.birthday}</span>
              )}
            </label>
            {/* Address */}
            <label className="block md:col-span-2">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] block mb-1.5">Address</span>
              {editing ? (
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-[#080808] border border-[#2a2a2a] rounded-lg focus:border-[#00ffa3]/50 text-[13px] text-white px-3 py-2 font-mono outline-none transition-colors"
                />
              ) : (
                <span className="text-[13px] text-zinc-200 font-mono">{form.address}</span>
              )}
            </label>
          </div>
          {editing && (
            <div className="mt-5 flex justify-end">
              <button
                onClick={handleSave}
                className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] font-mono text-black bg-[#00ffa3] rounded-xl hover:bg-[#00ffa3]/90 active:scale-[0.97] transition-all duration-150"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* ── Financial Profile (READ-ONLY) ────────────────────────────── */}
        <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em]" style={{ fontFamily: "'Space Grotesk'" }}>
              Financial Profile
            </h3>
            <span className="px-2 py-0.5 text-[8px] font-bold tracking-[0.2em] text-red-400/70 border border-red-400/20 bg-red-400/5 uppercase font-mono rounded-full">
              Read-Only
            </span>
          </div>
          {/* FICO Gauge */}
          <div className="mb-5">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-[#00ffa3]" style={{ fontFamily: "'Space Grotesk'" }}>{ficoScore}</span>
              <span className="text-[10px] font-mono text-zinc-600">FICO Score</span>
            </div>
            <div className="h-2 bg-[#1a1a1a] w-full overflow-hidden rounded-full">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-[#00ffa3] rounded-full transition-all duration-700"
                style={{ width: `${ficoPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] font-mono text-zinc-700">300</span>
              <span className="text-[8px] font-mono text-zinc-700">850</span>
            </div>
          </div>
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] block mb-1">Credit Util.</span>
              <span className="text-lg font-bold text-zinc-200" style={{ fontFamily: "'Space Grotesk'" }}>23%</span>
            </div>
            <div>
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] block mb-1">Total Accts</span>
              <span className="text-lg font-bold text-zinc-200" style={{ fontFamily: "'Space Grotesk'" }}>3</span>
            </div>
            <div>
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] block mb-1">Oldest Acct</span>
              <span className="text-lg font-bold text-zinc-200" style={{ fontFamily: "'Space Grotesk'" }}>8 yrs</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border border-[#1a1a1a] bg-[#080808] rounded-xl">
            <svg className="w-3 h-3 text-red-400/60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <span className="text-[9px] font-mono text-zinc-600 tracking-wider">
              This data is READ-ONLY. Managed by your financial institution.
            </span>
            <span className="ml-auto text-[8px] font-mono text-[#00ffa3]/50 shrink-0">
              fin-guard#viewer@financial_api &#10003;
            </span>
          </div>
        </div>

        {/* ── Security Overview ─────────────────────────────────────────── */}
        <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl">
          <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-5" style={{ fontFamily: "'Space Grotesk'" }}>
            Security Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {[
              { label: "Login Method", value: "Google OAuth" },
              { label: "Last Login", value: "April 4, 2025, 9:32 PM" },
              { label: "Two-Factor", value: "Enabled via Auth0 Guardian" },
              { label: "Active Sessions", value: "1" },
            ].map((item) => (
              <div key={item.label}>
                <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] block mb-1">{item.label}</span>
                <span className="text-[13px] text-zinc-200 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border border-[#1a1a1a] bg-[#080808] rounded-xl">
            <svg className="w-3 h-3 text-[#00ffa3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="text-[9px] font-mono text-zinc-500 tracking-wider">
              Managed by Auth0 Universal Login
            </span>
          </div>
        </div>

        {/* ── Connected Services ────────────────────────────────────────── */}
        <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl">
          <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-5" style={{ fontFamily: "'Space Grotesk'" }}>
            Connected Services
          </h3>
          <div className="space-y-3">
            {CONNECTED_SERVICES.map((svc) => (
              <div key={svc.name} className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-[#00ffa3] rounded-full" />
                  <span className="text-[13px] text-zinc-200 font-mono">{svc.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-[8px] font-bold tracking-[0.15em] uppercase font-mono border rounded-full ${
                    svc.scope === "READ-ONLY"
                      ? "text-red-400/70 border-red-400/20 bg-red-400/5"
                      : "text-yellow-400/70 border-yellow-400/20 bg-yellow-400/5"
                  }`}>
                    {svc.scope}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600">{svc.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Danger Zone ──────────────────────────────────────────────── */}
        <div className="p-6 bg-[#080808] border border-red-500/10 rounded-2xl">
          <h3 className="text-[11px] font-bold text-red-400/80 uppercase tracking-[0.15em] mb-5" style={{ fontFamily: "'Space Grotesk'" }}>
            Danger Zone
          </h3>
          {/* FGA Denied Message */}
          {dangerMsg && (
            <div className="mb-4 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl text-[11px] font-mono text-red-400/80 leading-relaxed animate-[fadeIn_0.2s_ease-out]">
              {dangerMsg}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                setDangerMsg("Account deletion requires admin access. FGA: fin-guard#admin@user_profile \u2192 DENIED")
              }
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] font-mono text-red-400 border border-red-400/20 bg-red-400/5 rounded-xl hover:bg-red-400/10 active:scale-[0.97] transition-all duration-150"
            >
              Delete Account
            </button>
            <button
              onClick={() =>
                setDangerMsg("Data export requires admin access. FGA: fin-guard#admin@user_data \u2192 DENIED")
              }
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] font-mono text-red-400 border border-red-400/20 bg-red-400/5 rounded-xl hover:bg-red-400/10 active:scale-[0.97] transition-all duration-150"
            >
              Export All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
