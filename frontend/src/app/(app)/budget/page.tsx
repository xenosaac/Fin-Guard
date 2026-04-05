"use client";

import { useState } from "react";

/* ── Mock Budget Data ─────────────────────────────────────────────── */

const MONTH = "March 2025";
const INCOME = 7500;
const TOTAL_BUDGETED = 5800;
const TOTAL_SPENT = 4234.56;
const SAVINGS_TARGET = 1000;
const PROJECTED_SAVINGS = INCOME - TOTAL_SPENT;

interface Category {
  name: string;
  icon: string;
  budget: number;
  spent: number;
}

const CATEGORIES: Category[] = [
  { name: "Housing",       icon: "\u{1F3E0}", budget: 1800, spent: 1800 },
  { name: "Food & Dining", icon: "\u{1F355}", budget: 600,  spent: 720  },
  { name: "Transportation",icon: "\u{1F697}", budget: 400,  spent: 345  },
  { name: "Entertainment", icon: "\u{1F3AC}", budget: 200,  spent: 280  },
  { name: "Shopping",      icon: "\u{1F6D2}", budget: 500,  spent: 412  },
  { name: "Health",        icon: "\u{1F48A}", budget: 300,  spent: 167  },
  { name: "Subscriptions", icon: "\u{1F4F1}", budget: 150,  spent: 149  },
  { name: "Utilities",     icon: "\u26A1",    budget: 250,  spent: 210  },
];

const MONTHLY_TREND = [
  { month: "Oct", spent: 4810 },
  { month: "Nov", spent: 5120 },
  { month: "Dec", spent: 5890 },
  { month: "Jan", spent: 4560 },
  { month: "Feb", spent: 4320 },
  { month: "Mar", spent: 4234 },
];

/* ── Helpers ──────────────────────────────────────────────────────── */

function usd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function pct(spent: number, budget: number) {
  return Math.round((spent / budget) * 100);
}

function barColor(spent: number, budget: number) {
  const ratio = spent / budget;
  if (ratio > 1) return "bg-[#ef4444]";
  if (ratio > 0.8) return "bg-[#f59e0b]";
  return "bg-[#00ffa3]";
}

function statusText(spent: number, budget: number) {
  const diff = spent - budget;
  if (diff > 0) return { text: `Over by ${usd(diff)}`, color: "text-[#ef4444]" };
  if (diff === 0) return { text: "Fully used", color: "text-[#f59e0b]" };
  return { text: `${usd(budget - spent)} remaining`, color: "text-zinc-500" };
}

/* ── Component ────────────────────────────────────────────────────── */

export default function BudgetPage() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const overBudget = CATEGORIES.filter((c) => c.spent > c.budget);
  const trendMax = Math.max(...MONTHLY_TREND.map((m) => m.spent));

  return (
    <div className="flex-1 overflow-y-auto bg-[#050505]">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* ── Header Bar ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1
              className="text-xl font-bold tracking-[-0.03em] text-white"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              Budget Planner
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-[#1a1a1a] bg-[#080808] rounded-lg">
              {MONTH}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[9px] font-mono text-zinc-500 border border-[#1a1a1a] bg-[#080808] rounded-lg">
              via Google Sheets
            </span>
            <span className="px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] text-[#00ffa3] border border-[#00ffa3]/20 bg-[#00ffa3]/5 uppercase rounded-full">
              Read-Only
            </span>
          </div>
        </div>

        {/* ── Income & Savings Summary ────────────────────────────── */}
        <div className="bg-[#080808] border border-[#1a1a1a] rounded-2xl p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Monthly Income",    value: usd(INCOME),            accent: "text-white" },
              { label: "Total Budgeted",    value: usd(TOTAL_BUDGETED),    accent: "text-zinc-300" },
              { label: "Total Spent",       value: usd(TOTAL_SPENT),       accent: "text-[#f59e0b]" },
              { label: "Projected Savings", value: usd(PROJECTED_SAVINGS), accent: "text-[#00ffa3]" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.15em] mb-1">
                  {item.label}
                </p>
                <p className={`text-lg font-bold font-mono tracking-tight ${item.accent}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Savings target progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.15em]">
                Savings Target Progress
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {usd(PROJECTED_SAVINGS)} / {usd(SAVINGS_TARGET)} target
              </span>
            </div>
            <div className="h-2 w-full bg-[#1a1a1a] rounded-full">
              <div
                className="h-full bg-[#00ffa3] rounded-full transition-all"
                style={{ width: `${Math.min((PROJECTED_SAVINGS / SAVINGS_TARGET) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[9px] font-mono text-[#00ffa3] mt-1.5">
              {Math.round((PROJECTED_SAVINGS / SAVINGS_TARGET) * 100)}% of savings target reached
              — {usd(PROJECTED_SAVINGS - SAVINGS_TARGET)} surplus
            </p>
          </div>
        </div>

        {/* ── Category Breakdown Grid ─────────────────────────────── */}
        <div>
          <h2
            className="text-[10px] font-bold tracking-[0.3em] text-zinc-600 uppercase mb-3"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            Category Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const percentage = pct(cat.spent, cat.budget);
              const isOver = cat.spent > cat.budget;
              const status = statusText(cat.spent, cat.budget);
              return (
                <div
                  key={cat.name}
                  className={`p-4 border bg-[#080808] rounded-2xl transition-colors ${
                    isOver
                      ? "border-[#ef4444]/30 bg-[#ef4444]/[0.02]"
                      : "border-[#1a1a1a] hover:border-[#00ffa3]/20"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{cat.icon}</span>
                      <div>
                        <p
                          className="text-[12px] font-bold text-zinc-200"
                          style={{ fontFamily: "'Space Grotesk'" }}
                        >
                          {cat.name}
                        </p>
                        <p className="text-[9px] font-mono text-zinc-600">
                          {usd(cat.spent)} of {usd(cat.budget)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold font-mono ${
                          isOver ? "text-[#ef4444]" : percentage >= 80 ? "text-[#f59e0b]" : "text-[#00ffa3]"
                        }`}
                      >
                        {percentage}%
                      </p>
                      {isOver && (
                        <span className="text-[8px] font-bold tracking-[0.1em] text-[#ef4444] uppercase">
                          Over
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${barColor(cat.spent, cat.budget)}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <p className={`text-[9px] font-mono ${status.color}`}>{status.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Over-Budget Alerts ──────────────────────────────────── */}
        {overBudget.length > 0 && (
          <div>
            <h2
              className="text-[10px] font-bold tracking-[0.3em] text-[#ef4444] uppercase mb-3"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              Over-Budget Alerts
            </h2>
            <div className="border border-[#ef4444]/20 bg-[#ef4444]/[0.03] rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                <p className="text-[11px] font-bold text-[#ef4444]">
                  {overBudget.length} {overBudget.length === 1 ? "category" : "categories"} over budget
                </p>
              </div>
              {overBudget.map((cat) => {
                const over = cat.spent - cat.budget;
                return (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between py-2 border-t border-[#ef4444]/10"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="text-[11px] font-mono text-zinc-300">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold font-mono text-[#ef4444]">
                        +{usd(over)}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-600 ml-2">
                        ({pct(cat.spent, cat.budget)}% of budget)
                      </span>
                    </div>
                  </div>
                );
              })}
              <p className="text-[9px] font-mono text-zinc-600 pt-1">
                Total over-budget: {usd(overBudget.reduce((sum, c) => sum + (c.spent - c.budget), 0))}
                — Review spending in Google Sheets to adjust allocations.
              </p>
            </div>
          </div>
        )}

        {/* ── Monthly Trends ──────────────────────────────────────── */}
        <div>
          <h2
            className="text-[10px] font-bold tracking-[0.3em] text-zinc-600 uppercase mb-3"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            Monthly Spending Trend
          </h2>
          <div className="bg-[#080808] border border-[#1a1a1a] rounded-2xl p-5">
            <div className="flex items-end gap-3 h-40">
              {MONTHLY_TREND.map((m, i) => {
                const heightPct = (m.spent / trendMax) * 100;
                const isLatest = i === MONTHLY_TREND.length - 1;
                return (
                  <div
                    key={m.month}
                    className="flex-1 flex flex-col items-center gap-1.5"
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Hover tooltip */}
                    <span
                      className={`text-[9px] font-mono transition-opacity ${
                        hoveredBar === i ? "opacity-100" : "opacity-0"
                      } ${isLatest ? "text-[#00ffa3]" : "text-zinc-400"}`}
                    >
                      {usd(m.spent)}
                    </span>

                    {/* Bar */}
                    <div className="w-full flex items-end justify-center" style={{ height: "100%" }}>
                      <div
                        className={`w-full max-w-[48px] transition-all cursor-pointer ${
                          isLatest
                            ? "bg-[#00ffa3]/80 hover:bg-[#00ffa3]"
                            : "bg-[#1a1a1a] hover:bg-[#2a2a2a]"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    {/* Label */}
                    <span
                      className={`text-[9px] font-mono ${
                        isLatest ? "text-[#00ffa3]" : "text-zinc-600"
                      }`}
                    >
                      {m.month}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Trend summary */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#1a1a1a]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#00ffa3]/80" />
                <span className="text-[9px] font-mono text-zinc-500">Current month</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-600">
                6-month avg: {usd(Math.round(MONTHLY_TREND.reduce((s, m) => s + m.spent, 0) / MONTHLY_TREND.length))}
              </span>
              <span className="text-[9px] font-mono text-[#00ffa3]">
                Trend: -2.0% MoM
              </span>
            </div>
          </div>
        </div>

        {/* ── FGA Security Footer ─────────────────────────────────── */}
        <div className="border border-[#1a1a1a] bg-[#080808] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 text-[#00ffa3] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p className="text-[9px] font-mono text-zinc-600 leading-relaxed">
              Budget data accessed via Token Vault (google_sheets, read-only scope).
              FGA: fin-guard#viewer@google_sheets{" "}
              <span className="text-[#00ffa3]">&check;</span>.
              Modification permanently blocked.
            </p>
          </div>
          <span className="px-2 py-0.5 text-[8px] font-bold tracking-[0.2em] text-zinc-700 border border-[#1a1a1a] uppercase rounded-full">
            Auth0 FGA Verified
          </span>
        </div>
      </div>
    </div>
  );
}
