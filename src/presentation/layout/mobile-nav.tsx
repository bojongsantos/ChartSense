"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, Radar, Star } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patterns", label: "Signals", icon: Layers },
  { href: "/scanner", label: "Scanner", icon: Radar },
  { href: "/watchlist", label: "Watchlist", icon: Star },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
      {ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
              active ? "text-accent-2" : "text-muted-2"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
