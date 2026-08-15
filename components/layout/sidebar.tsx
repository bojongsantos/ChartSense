"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Clock,
  CreditCard,
  Crown,
  History,
  Layers,
  LayoutDashboard,
  LineChart,
  Lock,
  MessageCircle,
  Star,
  Zap,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { sidebarData } from "@/lib/dummy-data";
import { usePlan } from "@/components/plan/plan-provider";

interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { id: "signals", label: "Signals", href: "/patterns", icon: Layers },
  { id: "watchlist", label: "Watchlist", href: "/watchlist", icon: Star },
  { id: "alerts", label: "Alerts", icon: Bell, badge: sidebarData.navCounts.alerts },
  { id: "history", label: "History", icon: History },
  { id: "chat", label: "AI Chat", icon: MessageCircle },
  { id: "pricing", label: "Pricing", icon: CreditCard },
  { id: "tutorials", label: "Tutorials", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isPro } = usePlan();

  const lockedItems = new Set<string>(isPro ? [] : ["signals"]);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-blue">
          <LineChart className="size-4.5 text-white" />
        </span>
        <span className="text-[17px] font-bold tracking-tight">
          Chart<span className="gradient-text">Sense</span>
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = item.href ? pathname === item.href : false;
          const locked = lockedItems.has(item.id);
          const className = `group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
            active
              ? "bg-accent/10 text-foreground"
              : item.href
                ? "text-muted hover:bg-surface-3 hover:text-foreground"
                : "cursor-default text-muted/70 hover:bg-transparent"
          }`;
          const content = (
            <>
              <item.icon
                className={`size-4 ${active ? "text-accent-2" : "text-muted-2 group-hover:text-muted"}`}
              />
              <span className="flex-1">{item.label}</span>
              {locked && <Lock className="size-3.5 shrink-0 text-warning" />}
              {!locked && typeof item.badge === "number" && (
                <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent/20 px-1.5 text-[10px] font-bold text-accent-2">
                  {item.badge}
                </span>
              )}
            </>
          );
          return item.href ? (
            <Link key={item.id} href={item.href} className={className}>
              {content}
            </Link>
          ) : (
            <div key={item.id} className={className} title="Coming soon">
              {content}
            </div>
          );
        })}
      </nav>

      <div className="space-y-4 border-t border-border px-4 py-4">
        <div className="card relative overflow-hidden p-4">
          <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-accent/20 blur-2xl" />
          <div className="relative flex items-center gap-2">
            <Crown className="size-4 text-warning" />
            <span className="text-[13px] font-semibold">Upgrade to Pro</span>
          </div>
          <p className="relative mt-1.5 text-[11px] leading-snug text-muted">
            Unlock unlimited analyses, full breakdowns & priority scanning.
          </p>
          <button
            type="button"
            className="relative mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-blue px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Zap className="size-3.5" />
            Upgrade Now
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wide text-muted-2">Analysis This Month</span>
            <span className="font-medium text-foreground">
              {sidebarData.usage.used}/{sidebarData.usage.limit}
            </span>
          </div>
          <ProgressBar value={sidebarData.usage.used} max={sidebarData.usage.limit} className="mt-2" />
          <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-2">
            <Clock className="size-3" />
            Resets in {sidebarData.usage.resetsIn}
          </div>
        </div>
      </div>
    </aside>
  );
}
