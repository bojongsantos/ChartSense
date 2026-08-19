"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/presentation/hooks/use-ui-preference";
import { oppositeTheme } from "@/shared/lib/ui-preferences";

/**
 * Switches between the dark and light palettes.
 *
 * The icon shows the theme the button would switch *to*, not the one in use.
 * A moon while already dark reads as a status light rather than a control, and
 * people click it expecting nothing to happen.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const next = oppositeTheme(theme);
  const label = next === "dark" ? "Beralih ke tema gelap" : "Beralih ke tema terang";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={label}
      aria-label={label}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-3 text-muted transition-colors hover:border-border-strong hover:text-foreground ${className}`}
    >
      {next === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
