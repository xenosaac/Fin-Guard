"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/accounts", label: "Accounts", icon: "wallet" },
  { href: "/budget", label: "Budget", icon: "chart" },
  { href: "/security", label: "Security", icon: "shield" },
  { href: "/profile", label: "Profile", icon: "user" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

const ICONS: Record<string, React.ReactNode> = {
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="14" r="1.5"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="12" width="4" height="8"/><rect x="10" y="8" width="4" height="12"/><rect x="17" y="4" width="4" height="16"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 00-16 0"/></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
                <span className={active ? "text-[#00ffa3]" : "text-zinc-600"}>{ICONS[item.icon]}</span>
                <span className="hidden lg:block tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom status */}
        <div className="p-3 border-t border-[#1a1a1a]">
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
