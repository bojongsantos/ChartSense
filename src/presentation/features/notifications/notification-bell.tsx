"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCheck, Loader2 } from "lucide-react";
import { useNotifications } from "@/presentation/hooks/use-notifications";

const relativeFormatter = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });

/** Compact "3 jam lalu" style stamp for the feed rows. */
function relativeTime(iso: string): string {
  const elapsedMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(elapsedMs / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return relativeFormatter.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relativeFormatter.format(-hours, "hour");
  return relativeFormatter.format(-Math.round(hours / 24), "day");
}

export function NotificationBell({ authenticated }: { authenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, loading, markRead, markAllRead } =
    useNotifications(authenticated);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  if (!authenticated) {
    return (
      <Link
        href="/login?next=/alerts"
        title="Masuk untuk menerima notifikasi alert"
        aria-label="Masuk untuk menerima notifikasi"
        className="rounded-lg border border-border bg-surface-3 p-2 text-muted-2 transition-colors hover:text-foreground"
      >
        <BellOff className="size-4" />
      </Link>
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={
          unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : "Notifikasi"
        }
        className="relative rounded-lg border border-border bg-surface-3 p-2 text-muted transition-colors hover:border-border-strong hover:text-foreground"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-4 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-[12px] font-bold">Notifikasi</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-2 transition-colors hover:text-foreground"
              >
                <CheckCheck className="size-3.5" />
                Tandai semua
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <div className="flex h-24 items-center justify-center text-muted-2">
                <Loader2 className="size-4 animate-spin" />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="px-3 py-8 text-center">
                <p className="text-[12px] font-semibold text-muted">Belum ada notifikasi</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-2">
                  Buat alert harga dan Anda akan diberi tahu di sini saat levelnya tercapai.
                </p>
                <Link
                  href="/alerts"
                  onClick={() => setOpen(false)}
                  className="mt-3 inline-block rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-foreground hover:border-border-strong"
                >
                  Atur alert
                </Link>
              </div>
            )}

            {notifications.map((item) => {
              const unread = item.readAt === null;
              const body = (
                <>
                  <div className="flex items-start gap-2">
                    {unread && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />}
                    <div className={unread ? "min-w-0" : "min-w-0 pl-3.5"}>
                      <p className="truncate text-[12px] font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted">{item.body}</p>
                      <p className="mt-1 text-[10px] text-muted-2">{relativeTime(item.createdAt)}</p>
                    </div>
                  </div>
                </>
              );
              const className = `block w-full border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-surface-3 ${
                unread ? "bg-accent/5" : ""
              }`;
              return item.link ? (
                <Link
                  key={item.id}
                  href={item.link}
                  className={className}
                  onClick={() => {
                    void markRead(item.id);
                    setOpen(false);
                  }}
                >
                  {body}
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  className={className}
                  onClick={() => void markRead(item.id)}
                >
                  {body}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
