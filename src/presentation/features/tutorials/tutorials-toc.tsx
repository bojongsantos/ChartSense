"use client";

import type { MouseEvent } from "react";

export interface TocEntry {
  id: string;
  label: string;
  emphasis?: boolean;
}

/** The scrollable box a section actually lives in, if any. */
function scrollParent(element: Element): HTMLElement | null {
  let current = element.parentElement;
  while (current) {
    const style = getComputedStyle(current);
    const scrolls = /(auto|scroll|overlay)/.test(style.overflowY);
    if (scrolls && current.scrollHeight > current.clientHeight) return current;
    current = current.parentElement;
  }
  return null;
}

/**
 * In-page navigation that scrolls to the section a reader can actually see.
 *
 * Two problems make the plain `href="#id"` version fail here. React's
 * streaming SSR leaves a hidden, zero-height copy of the page earlier in the
 * document, so native fragment navigation resolves to that copy and moves
 * nothing. And the page scrolls inside a nested container where smooth
 * scrolling is a silent no-op in some engines — measured, not assumed — so the
 * position is applied directly. The `href` stays for no-JS and middle-click.
 */
export function TutorialsToc({ entries }: { entries: TocEntry[] }) {
  function jump(event: MouseEvent<HTMLAnchorElement>, id: string) {
    // Let the browser handle modified clicks (new tab, download, etc).
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const matches = Array.from(document.querySelectorAll(`[id="${CSS.escape(id)}"]`));
    const target = matches.find((element) => element.closest("[hidden]") === null);
    if (!target) return;

    event.preventDefault();
    const container = scrollParent(target);
    if (container) {
      const top =
        target.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;
      container.scrollTop = top;
    } else {
      target.scrollIntoView({ block: "start" });
    }
    // Keep the address bar in step without re-triggering the broken jump.
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <nav aria-label="Daftar isi" className="mt-5 flex flex-wrap gap-1.5">
      {entries.map((entry) => (
        <a
          key={entry.id}
          href={`#${entry.id}`}
          onClick={(event) => jump(event, entry.id)}
          className={
            entry.emphasis
              ? "rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent-2 transition-colors hover:border-accent/60"
              : "rounded-lg border border-border bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-muted transition-colors hover:border-border-strong hover:text-foreground"
          }
        >
          {entry.label}
        </a>
      ))}
    </nav>
  );
}
