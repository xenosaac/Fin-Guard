"use client";

import Link from "next/link";

const ACCOUNTS = [
  {
    id: "checking_1234",
    name: "Primary Checking",
    last4: "1234",
    type: "checking",
    icon: "\ud83d\udcb3",
    balance: 12847.32,
  },
  {
    id: "savings_5678",
    name: "Emergency Savings",
    last4: "5678",
    type: "savings",
    icon: "\ud83d\udcb0",
    balance: 45230.0,
  },
  {
    id: "investment_9012",
    name: "Brokerage",
    last4: "9012",
    type: "investment",
    icon: "\ud83d\udcc8",
    balance: 128459.67,
  },
];

const TOTAL = ACCOUNTS.reduce((s, a) => s + a.balance, 0);

function formatUSD(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function AccountsPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-6 lg:px-10 py-6 border-b border-[#1a1a1a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1
            className="text-lg font-bold tracking-[-0.03em] text-white"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            Accounts
          </h1>
          <span className="px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] text-[#00ffa3] border border-[#00ffa3]/20 bg-[#00ffa3]/5 uppercase font-mono rounded-full">
            Connected via Token Vault
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-600 tracking-wider uppercase">
          {ACCOUNTS.length} accounts linked
        </span>
      </div>

      <div className="px-6 lg:px-10 py-8 space-y-8">
        {/* ── Account Cards Grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACCOUNTS.map((acct) => (
            <Link
              key={acct.id}
              href={`/accounts/${acct.id}`}
              className="group block p-5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl hover:border-[#00ffa3]/30 transition-all"
            >
              {/* Top row: icon + type badge + read-only */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{acct.icon}</span>
                  <span
                    className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.1em]"
                    style={{ fontFamily: "'Space Grotesk'" }}
                  >
                    {acct.type}
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[8px] font-bold tracking-[0.2em] text-red-400/70 border border-red-400/20 bg-red-400/5 uppercase font-mono rounded-full">
                  Read-Only
                </span>
              </div>

              {/* Account name + last 4 */}
              <div className="mb-3">
                <span
                  className="text-[13px] font-semibold text-zinc-200 group-hover:text-[#00ffa3] transition"
                  style={{ fontFamily: "'Space Grotesk'" }}
                >
                  {acct.name}
                </span>
                <span className="ml-2 text-[11px] font-mono text-zinc-600">
                  ****{acct.last4}
                </span>
              </div>

              {/* Balance */}
              <div
                className="text-2xl font-bold tracking-[-0.02em] text-[#00ffa3]"
                style={{ fontFamily: "'Space Grotesk'" }}
              >
                {formatUSD(acct.balance)}
              </div>

              {/* Footer: token vault label + arrow */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[9px] font-mono text-zinc-700 tracking-wider">
                  via Token Vault
                </span>
                <span className="text-[10px] text-zinc-600 group-hover:text-[#00ffa3] transition">
                  View Details &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Summary Section ──────────────────────────────────────────── */}
        <div className="p-5 bg-[#080808] border border-[#1a1a1a] rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] block mb-1">
                Total Across All Accounts
              </span>
              <span
                className="text-3xl font-bold tracking-[-0.02em] text-[#00ffa3]"
                style={{
                  fontFamily: "'Space Grotesk'",
                  textShadow: "0 0 30px rgba(0,255,163,0.15)",
                }}
              >
                {formatUSD(TOTAL)}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 border border-[#1a1a1a] bg-[#0a0a0a] rounded-xl">
              <svg
                className="w-3.5 h-3.5 text-[#00ffa3]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-[9px] font-mono text-zinc-500 tracking-wider">
                All access audited by FGA &mdash; fin-guard#viewer@financial_api
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
