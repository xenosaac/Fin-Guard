"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/accounts", label: "Accounts", icon: "wallet" },
  { href: "/budget", label: "Budget", icon: "chart" },
  { href: "/security", label: "Security", icon: "shield" },
  { href: "/alerts", label: "Alerts", icon: "bell" },
  { href: "/profile", label: "Profile", icon: "user" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

const ICONS: Record<string, React.ReactNode> = {
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="14" r="1.5"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="12" width="4" height="8"/><rect x="10" y="8" width="4" height="12"/><rect x="17" y="4" width="4" height="16"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 00-16 0"/></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch("/api/ciba/pending");
        if (res.ok) {
          const data = await res.json();
          setPendingCount(Array.isArray(data) ? data.length : 0);
        }
      } catch { /* ignore */ }
    };
    fetchPending();
    const iv = setInterval(fetchPending, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="h-screen flex bg-[#050505] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 lg:w-56 shrink-0 bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-4 border-b border-[#1a1a1a]">
          <svg className="w-6 h-6 text-[#00ffa3] shrink-0 shield-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="hidden lg:block text-sm font-bold tracking-[-0.03em] text-[#00ffa3]" style={{ fontFamily: "'Space Grotesk'" }}>
            FIN—GUARD
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-[11px] font-medium rounded-xl transition-all ${
                  active
                    ? "text-[#00ffa3] bg-[#00ffa3]/10"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-[#0f0f0f]"
                }`}>
                <span className={`relative ${active ? "text-[#00ffa3]" : "text-zinc-600"}`}>
                  {ICONS[item.icon]}
                  {item.icon === "bell" && pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white leading-none">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </span>
                <span className="hidden lg:block tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom status */}
        <div className="p-3 border-t border-[#1a1a1a] space-y-3">
          {/* User indicator */}
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00ffa3]/30 to-[#00ffa3]/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#00ffa3]" style={{ fontFamily: "'Space Grotesk'" }}>IZ</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00ffa3] border-2 border-[#0a0a0a]" />
            </div>
            <span className="hidden lg:block text-[10px] text-zinc-400 font-medium tracking-wide">Isaac Z.</span>
          </div>

          {/* Read-only status */}
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ffa3] ring-pulse" />
            <span className="hidden lg:block text-[9px] text-zinc-600 font-mono uppercase tracking-wider">Read-Only Active</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
