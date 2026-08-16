"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Search, LineChart, LogOut, UserRound } from "lucide-react";
import { isValidBinanceSymbol, normalizeUsdtSymbol } from "@/core/domain/market/symbol";
import { authClient } from "@/infrastructure/auth/auth-client";
import type { CurrentUserDto } from "@/core/domain/identity";

export function TopNav() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUserDto | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { user?: CurrentUserDto } | null) => setCurrentUser(data?.user ?? null))
      .catch(() => setCurrentUser(null));
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onShortcut);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onShortcut);
    };
  }, []);

  function submitSearch(value = searchQuery) {
    let candidate = value.trim();
    if (!candidate) return;
    try {
      const url = new URL(candidate);
      candidate = url.searchParams.get("symbol") ?? url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    } catch {
      // Plain asset or pair input.
    }
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      return;
    }
    candidate = candidate.replace(/^.*:/, "");
    const symbol = normalizeUsdtSymbol(candidate);
    if (!isValidBinanceSymbol(symbol)) return;
    router.push(`/analysis?symbol=${encodeURIComponent(symbol)}`);
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:gap-4 sm:px-6">
      <Link href="/" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-blue lg:hidden" aria-label="ChartSense dashboard">
        <LineChart className="size-4 text-white" />
      </Link>
      <form
        className="relative hidden w-full max-w-xl md:block"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
      >
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
        <input
          ref={searchRef}
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitSearch(event.currentTarget.value);
            }
          }}
          placeholder="Search coin, pair, or paste TradingView URL..."
          className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-14 text-[13px] text-foreground placeholder:text-muted-2 focus:border-accent/50 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Search market"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-muted-2 hover:text-foreground"
        >
          ↵
        </button>
      </form>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          disabled
          title="Notifications belum tersedia"
          className="relative cursor-not-allowed rounded-lg border border-border bg-surface-3 p-2 text-muted opacity-60"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface-3 py-1 pl-1 pr-2.5 transition-colors hover:border-border-strong"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-blue text-[11px] font-bold text-white">
              {currentUser ? currentUser.name.slice(0, 2).toUpperCase() : "CS"}
            </span>
            <span className="hidden text-left lg:block">
              <span className="block max-w-32 truncate text-[12px] font-semibold leading-tight">{currentUser?.name ?? "Guest"}</span>
              <span className="block text-[10px] leading-tight text-muted-2">{currentUser?.plan ?? "Belum login"}</span>
            </span>
            <ChevronDown className="hidden size-3.5 text-muted-2 sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-border bg-surface-2 p-3 shadow-xl">
              {currentUser ? <>
                <p className="truncate text-[12px] font-semibold">{currentUser.email}</p>
                <Link onClick={() => setMenuOpen(false)} href="/account" className="mt-3 flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-muted hover:bg-surface-3 hover:text-foreground"><UserRound className="size-4" />Akun & Billing</Link>
                {currentUser.role === "ADMIN" && <Link onClick={() => setMenuOpen(false)} href="/admin" className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-muted hover:bg-surface-3 hover:text-foreground">Panel Admin</Link>}
                <button onClick={async () => { await authClient.signOut(); setCurrentUser(null); setMenuOpen(false); router.push("/login"); router.refresh(); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-negative hover:bg-negative/10"><LogOut className="size-4" />Keluar</button>
              </> : <>
                <p className="text-[11px] leading-snug text-muted">Login untuk menyimpan watchlist dan mengelola paket.</p>
                <Link onClick={() => setMenuOpen(false)} href="/login" className="mt-3 block rounded-lg bg-accent px-3 py-2 text-center text-xs font-bold text-white">Masuk</Link>
                <Link onClick={() => setMenuOpen(false)} href="/register" className="mt-2 block text-center text-xs font-semibold text-accent-2">Daftar akun</Link>
              </>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
