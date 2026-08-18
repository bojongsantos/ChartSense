"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  CreditCard,
  History,
  Layers,
  LayoutDashboard,
  LineChart,
  Lock,
  Star,
} from "lucide-react";
import { usePlan } from "@/presentation/features/access/plan-provider";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { id: "signals", label: "Signals", href: "/patterns", icon: Layers },
  { id: "watchlist", label: "Watchlist", href: "/watchlist", icon: Star },
  { id: "alerts", label: "Alerts", href: "/alerts", icon: Bell },
  { id: "history", label: "History", href: "/history", icon: History },
  { id: "pricing", label: "Pricing", href: "/pricing", icon: CreditCard },
  { id: "tutorials", label: "Tutorials", href: "/tutorials", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { authenticated, plan, canAccess } = usePlan();

  const lockedItems = new Set<string>(canAccess("signals") ? [] : ["signals"]);

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-blue">
          <LineChart className="size-4.5 text-white" />
        </span>
        <span className="text-[17px] font-bold tracking-tight">
          Chart<span className="gradient-text">Sense</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const locked = lockedItems.has(item.id);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex w-full items-center gap-3 rounded-lg py-2.5 pl-4 pr-3 text-[13px] transition-colors ${
                active
                  ? "bg-accent/10 font-semibold text-foreground"
                  : "font-medium text-muted hover:bg-surface-3 hover:text-foreground"
              }`}
            >
              {/* A short accent bar makes the current page readable at a glance,
                  rather than relying on a faint background tint alone. */}
              <span
                aria-hidden
                className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-colors ${
                  active ? "bg-accent-2" : "bg-transparent"
                }`}
              />
              <item.icon
                className={`size-4 shrink-0 ${active ? "text-accent-2" : "text-muted-2 group-hover:text-muted"}`}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {locked && <Lock className="size-3.5 shrink-0 text-warning" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="card p-4">
          <p className="text-[12px] font-semibold">
            {authenticated ? `Paket ${plan === "premium" ? "Premium" : "Free"}` : "ChartSense Account"}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted">
            {!authenticated
              ? "Login untuk menyimpan watchlist dan mengaktifkan Premium."
              : plan === "premium"
                ? "Premium aktif. Seluruh fitur dan scanner tersedia."
                : "Free aktif. Watchlist tersimpan pada akun Anda."}
          </p>
        </div>
      </div>
    </aside>
  );
}
