"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

/* ── Mock Data ──────────────────────────────────────────────────────────────── */

interface Account {
  id: string;
  name: string;
  last4: string;
  type: string;
  icon: string;
  balance: number;
  routingMasked: string;
  openedDate: string;
  status: string;
}

interface Transaction {
  date: string;
  description: string;
  category: string;
  amount: number;
  anomaly?: boolean;
}

const ACCOUNTS: Record<string, Account> = {
  checking_1234: {
    id: "checking_1234",
    name: "Primary Checking",
    last4: "1234",
    type: "Checking",
    icon: "\ud83d\udcb3",
    balance: 12847.32,
    routingMasked: "****4921",
    openedDate: "2019-03-15",
    status: "Active",
  },
  savings_5678: {
    id: "savings_5678",
    name: "Emergency Savings",
    last4: "5678",
    type: "Savings",
    icon: "\ud83d\udcb0",
    balance: 45230.0,
    routingMasked: "****4921",
    openedDate: "2020-01-08",
    status: "Active",
  },
  investment_9012: {
    id: "investment_9012",
    name: "Brokerage",
    last4: "9012",
    type: "Investment",
    icon: "\ud83d\udcc8",
    balance: 128459.67,
    routingMasked: "****7310",
    openedDate: "2021-06-22",
    status: "Active",
  },
};

/* ── Seeded random for stable mock data ─────────────────────────────────────── */

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateTransactions(accountId: string): Transaction[] {
  const seeds: Record<string, number> = {
    checking_1234: 101,
    savings_5678: 202,
    investment_9012: 303,
  };
  const rand = seededRandom(seeds[accountId] ?? 42);

  const checkingMerchants = [
    { d: "Whole Foods Market", c: "groceries", lo: -18, hi: -125 },
    { d: "Shell Gas Station", c: "transport", lo: -32, hi: -78 },
    { d: "Netflix Subscription", c: "subscriptions", lo: -15.99, hi: -15.99 },
    { d: "Spotify Premium", c: "subscriptions", lo: -9.99, hi: -9.99 },
    { d: "Amazon Purchase", c: "shopping", lo: -12, hi: -245 },
    { d: "Uber Ride", c: "transport", lo: -9, hi: -42 },
    { d: "Starbucks Coffee", c: "food & drink", lo: -4.5, hi: -11 },
    { d: "Target Store", c: "shopping", lo: -18, hi: -155 },
    { d: "CVS Pharmacy", c: "health", lo: -6, hi: -72 },
    { d: "Electric Co. Bill", c: "utilities", lo: -85, hi: -195 },
    { d: "Payroll Direct Deposit", c: "income", lo: 3200, hi: 3200 },
    { d: "Venmo Transfer In", c: "transfer", lo: 25, hi: 150 },
    { d: "Unknown Overseas Merchant", c: "unknown", lo: -847.32, hi: -847.32 },
  ];

  const savingsMerchants = [
    { d: "Interest Payment", c: "income", lo: 12.5, hi: 38.0 },
    { d: "Transfer from Checking", c: "transfer", lo: 500, hi: 2000 },
    { d: "Transfer to Checking", c: "transfer", lo: -200, hi: -800 },
    { d: "Bonus Deposit", c: "income", lo: 250, hi: 1000 },
    { d: "Emergency Withdrawal", c: "transfer", lo: -1500, hi: -3000 },
  ];

  const investmentMerchants = [
    { d: "AAPL Dividend", c: "dividends", lo: 42, hi: 185 },
    { d: "VTSAX Purchase", c: "investment", lo: -500, hi: -2500 },
    { d: "Bond Coupon Payment", c: "income", lo: 75, hi: 320 },
    { d: "SPY Purchase", c: "investment", lo: -1000, hi: -5000 },
    { d: "MSFT Dividend", c: "dividends", lo: 28, hi: 95 },
    { d: "Account Fee", c: "fees", lo: -4.95, hi: -4.95 },
    { d: "Transfer from Bank", c: "transfer", lo: 1000, hi: 5000 },
    { d: "CryptoExchange Ltd", c: "crypto", lo: -2500, hi: -2500 },
  ];

  const pool =
    accountId === "savings_5678"
      ? savingsMerchants
      : accountId === "investment_9012"
        ? investmentMerchants
        : checkingMerchants;

  const today = new Date();
  const txns: Transaction[] = [];

  const count = accountId === "savings_5678" ? 15 : 20;

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(rand() * 30);
    const m = pool[Math.floor(rand() * pool.length)];
    const lo = Math.min(m.lo, m.hi);
    const hi = Math.max(m.lo, m.hi);
    const amount = parseFloat((lo + rand() * (hi - lo)).toFixed(2));

    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    const isAnomaly =
      m.c === "unknown" ||
      m.c === "crypto" ||
      Math.abs(amount) > 1000;

    txns.push({
      date: date.toISOString().slice(0, 10),
      description: m.d,
      category: m.c,
      amount,
      anomaly: isAnomaly || undefined,
    });
  }

  txns.sort((a, b) => (a.date > b.date ? -1 : 1));
  return txns;
}

function generateBalanceHistory(accountId: string) {
  const bases: Record<string, number> = {
    checking_1234: 12847.32,
    savings_5678: 45230.0,
    investment_9012: 128459.67,
  };
  const base = bases[accountId] ?? 10000;
  const rand = seededRandom((bases[accountId] ?? 42) + 999);
  const today = new Date();
  const days: { label: string; balance: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const drift = (rand() - 0.5) * base * 0.03;
    days.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      balance: parseFloat((base + drift * (6 - i + 1)).toFixed(2)),
    });
  }
  return days;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function formatUSD(n: number) {
  return Math.abs(n).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CATEGORY_COLORS: Record<string, string> = {
  groceries: "text-green-400 border-green-400/20 bg-green-400/5",
  transport: "text-blue-400 border-blue-400/20 bg-blue-400/5",
  subscriptions: "text-purple-400 border-purple-400/20 bg-purple-400/5",
  shopping: "text-amber-400 border-amber-400/20 bg-amber-400/5",
  "food & drink": "text-orange-400 border-orange-400/20 bg-orange-400/5",
  health: "text-pink-400 border-pink-400/20 bg-pink-400/5",
  utilities: "text-cyan-400 border-cyan-400/20 bg-cyan-400/5",
  income: "text-[#00ffa3] border-[#00ffa3]/20 bg-[#00ffa3]/5",
  transfer: "text-zinc-400 border-zinc-400/20 bg-zinc-400/5",
  dividends: "text-[#00ffa3] border-[#00ffa3]/20 bg-[#00ffa3]/5",
  investment: "text-indigo-400 border-indigo-400/20 bg-indigo-400/5",
  fees: "text-red-400 border-red-400/20 bg-red-400/5",
  crypto: "text-yellow-400 border-yellow-400/20 bg-yellow-400/5",
  unknown: "text-red-400 border-red-400/20 bg-red-400/5",
};

const CATEGORY_DOT_COLORS: Record<string, string> = {
  groceries: "bg-green-400",
  transport: "bg-blue-400",
  subscriptions: "bg-purple-400",
  shopping: "bg-amber-400",
  "food & drink": "bg-orange-400",
  health: "bg-pink-400",
  utilities: "bg-cyan-400",
  income: "bg-[#00ffa3]",
  transfer: "bg-zinc-400",
  dividends: "bg-[#00ffa3]",
  investment: "bg-indigo-400",
  fees: "bg-red-400",
  crypto: "bg-yellow-400",
  unknown: "bg-red-400",
};

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;
  const account = ACCOUNTS[accountId];

  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="text-4xl">&#x26a0;&#xfe0f;</span>
          <p
            className="text-sm text-zinc-400"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            Account not found
          </p>
          <Link
            href="/accounts"
            className="inline-block px-4 py-2 text-[10px] font-bold tracking-[0.15em] text-[#00ffa3] border border-[#00ffa3]/30 rounded-xl uppercase hover:bg-[#00ffa3]/10 active:scale-[0.97] transition-all duration-150"
          >
            &larr; Back to Accounts
          </Link>
        </div>
      </div>
    );
  }

  const transactions = generateTransactions(accountId);
  const balanceHistory = generateBalanceHistory(accountId);
  const maxBalance = Math.max(...balanceHistory.map((d) => d.balance));
  const minBalance = Math.min(...balanceHistory.map((d) => d.balance));
  const range = maxBalance - minBalance || 1;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="px-6 lg:px-10 py-6 border-b border-[#1a1a1a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/accounts"
            className="px-2.5 py-1.5 text-[10px] font-bold tracking-[0.1em] text-zinc-500 border border-[#1a1a1a] rounded-lg hover:border-zinc-600 hover:text-zinc-300 active:scale-[0.97] transition-all duration-150 uppercase font-mono"
          >
            &larr; Back
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{account.icon}</span>
            <div>
              <h1
                className="text-lg font-bold tracking-[-0.03em] text-white"
                style={{ fontFamily: "'Space Grotesk'" }}
              >
                {account.name}{" "}
                <span className="text-zinc-600 font-mono text-sm">
                  ****{account.last4}
                </span>
              </h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-2xl font-bold tracking-[-0.02em] text-[#00ffa3]"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            {formatUSD(account.balance)}
          </span>
          <span className="px-2 py-0.5 text-[8px] font-bold tracking-[0.2em] text-red-400/70 border border-red-400/20 bg-red-400/5 uppercase font-mono rounded-full">
            Read-Only
          </span>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-8 space-y-8">
        {/* ── Account Info Card ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Account Type", value: account.type },
            { label: "Routing", value: account.routingMasked },
            { label: "Opened", value: account.openedDate },
            { label: "Status", value: account.status },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl"
            >
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] block mb-1">
                {item.label}
              </span>
              <span
                className="text-[13px] font-semibold text-zinc-200"
                style={{ fontFamily: "'Space Grotesk'" }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Balance History Chart (7-day, div-based) ─────────────── */}
        <div className="p-5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl">
          <h2
            className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-5"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            7-Day Balance History
          </h2>
          <div className="flex items-end gap-3 h-40">
            {balanceHistory.map((day, i) => {
              const pct = ((day.balance - minBalance) / range) * 0.7 + 0.3;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <span className="text-[9px] font-mono text-zinc-500">
                    {formatUSD(day.balance)}
                  </span>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${pct * 100}%`,
                      background:
                        "linear-gradient(180deg, #00ffa3 0%, rgba(0,255,163,0.15) 100%)",
                      boxShadow: "0 0 12px rgba(0,255,163,0.1)",
                    }}
                  />
                  <span className="text-[9px] font-mono text-zinc-600">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Recent Transactions (Chase-style rows) ──────────────── */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
            <h2
              className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              Recent Transactions
            </h2>
            <span className="text-[9px] font-mono text-zinc-700">
              {transactions.length} entries
            </span>
          </div>

          {/* Transaction rows */}
          <div className="divide-y divide-[#141414]">
            {transactions.map((txn, i) => {
              const catStyle =
                CATEGORY_COLORS[txn.category] ||
                "text-zinc-400 border-zinc-400/20 bg-zinc-400/5";
              const dotColor =
                CATEGORY_DOT_COLORS[txn.category] || "bg-zinc-400";

              return (
                <div
                  key={i}
                  className={`flex items-center justify-between px-5 py-3.5 hover:bg-[#0f0f0f] transition-colors duration-150 ${
                    txn.anomaly
                      ? "border-l-2 border-l-red-500/60 bg-red-500/[0.02]"
                      : ""
                  }`}
                >
                  {/* Left side: dot + merchant + meta */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] text-zinc-200 truncate leading-tight">
                        {txn.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-zinc-600 font-mono">
                          {formatShortDate(txn.date)}
                        </span>
                        {txn.anomaly && (
                          <>
                            <span className="text-zinc-700">&#xb7;</span>
                            <span className="text-[8px] font-bold tracking-[0.12em] text-red-400 uppercase bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full">
                              Anomaly
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: amount + category pill */}
                  <div className="flex flex-col items-end shrink-0 ml-4">
                    <span
                      className={`text-[13px] font-mono font-medium leading-tight ${
                        txn.amount >= 0 ? "text-[#00ffa3]" : "text-zinc-200"
                      }`}
                    >
                      {txn.amount >= 0 ? "+" : "-"}
                      {formatUSD(txn.amount)}
                    </span>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-[8px] font-bold tracking-[0.08em] uppercase border rounded-full ${catStyle}`}
                    >
                      {txn.category}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FGA Security Note ────────────────────────────────────── */}
        <div className="flex items-center gap-3 p-4 bg-[#080808] border border-[#1a1a1a] rounded-2xl">
          <svg
            className="w-4 h-4 text-[#00ffa3] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[9px] font-mono text-zinc-500 tracking-wider leading-relaxed">
            All data accessed via Token Vault read-only scope. FGA check:{" "}
            <span className="text-[#00ffa3]">
              fin-guard#viewer@financial_api
            </span>{" "}
            &#x2713;
          </span>
        </div>
      </div>
    </div>
  );
}
