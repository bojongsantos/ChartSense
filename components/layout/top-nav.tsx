"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Crown, Search, Sparkles, User, Settings, LogOut } from "lucide-react";
import { usePlan } from "@/components/plan/plan-provider";

export function TopNav() {
  const { plan, setPlan } = usePlan();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
      <div className="relative w-full max-w-xl">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
        <input
          type="search"
          placeholder="Search coin, pair, or paste TradingView URL..."
          className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-14 text-[13px] text-foreground placeholder:text-muted-2 focus:border-accent/50 focus:outline-none"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-muted-2">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-border bg-surface-3 p-0.5" title="Simulate free vs pro">
          <button
            type="button"
            onClick={() => setPlan("free")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              plan === "free" ? "bg-background text-foreground" : "text-muted-2"
            }`}
          >
            Free
          </button>
          <button
            type="button"
            onClick={() => setPlan("pro")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              plan === "pro" ? "bg-gradient-to-r from-accent to-accent-blue text-white" : "text-muted-2"
            }`}
          >
            Pro
          </button>
        </div>

        {plan === "pro" ? (
          <span className="inline-flex items-center gap-1 rounded-lg border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] font-bold text-warning">
            <Crown className="size-3.5" />
            Premium
          </span>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent-2 transition-colors hover:bg-accent/20"
          >
            <Sparkles className="size-3.5" />
            Upgrade
          </button>
        )}

        <button
          type="button"
          className="relative rounded-lg border border-border bg-surface-3 p-2 text-muted transition-colors hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-negative ring-2 ring-surface" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface-3 py-1 pl-1 pr-2.5 transition-colors hover:border-border-strong"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-blue text-[11px] font-bold text-white">
              AS
            </span>
            <span className="hidden text-left lg:block">
              <span className="block text-[12px] font-semibold leading-tight">Alex Santoso</span>
              <span className="block text-[10px] leading-tight text-muted-2">{plan === "pro" ? "Pro Plan" : "Free Plan"}</span>
            </span>
            <ChevronDown className="size-3.5 text-muted-2" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-surface-2 py-1 shadow-xl">
              {[
                { icon: User, label: "Profile" },
                { icon: Settings, label: "Settings" },
                { icon: LogOut, label: "Sign out" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
