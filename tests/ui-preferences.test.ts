import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SIDEBAR,
  DEFAULT_THEME,
  normalizeSidebar,
  normalizeTheme,
  oppositeTheme,
  preferencesScript,
  SIDEBAR_ATTRIBUTE,
  SIDEBAR_STORAGE_KEY,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  toggledSidebar,
} from "@/shared/lib/ui-preferences";

test("a stored preference is honoured and anything else falls back", () => {
  assert.equal(normalizeTheme("light"), "light");
  assert.equal(normalizeTheme("dark"), "dark");
  // localStorage is writable by anyone with the console open, so a junk value
  // must land on the default rather than reaching the DOM as an attribute.
  for (const junk of [null, undefined, "", "DARK", "solarized", 1, {}]) {
    assert.equal(normalizeTheme(junk), DEFAULT_THEME, String(junk));
  }
  assert.equal(normalizeSidebar("collapsed"), "collapsed");
  assert.equal(normalizeSidebar("nonsense"), DEFAULT_SIDEBAR);
});

test("the defaults keep the product as it was before the toggle existed", () => {
  assert.equal(DEFAULT_THEME, "dark");
  assert.equal(DEFAULT_SIDEBAR, "expanded");
});

test("toggling twice returns to where it started", () => {
  assert.equal(oppositeTheme("dark"), "light");
  assert.equal(oppositeTheme(oppositeTheme("dark")), "dark");
  assert.equal(toggledSidebar("expanded"), "collapsed");
  assert.equal(toggledSidebar(toggledSidebar("expanded")), "expanded");
});

test("the pre-paint script sets both attributes from storage", () => {
  const script = preferencesScript();
  for (const needle of [
    THEME_STORAGE_KEY,
    SIDEBAR_STORAGE_KEY,
    THEME_ATTRIBUTE,
    SIDEBAR_ATTRIBUTE,
  ]) {
    assert.ok(script.includes(JSON.stringify(needle)), `${needle} missing from the script`);
  }
  // Reading localStorage throws outright when a browser blocks storage. This
  // script blocks the first paint, so an uncaught throw here is a blank page.
  assert.match(script, /try\{/);
  assert.match(script, /catch\(e\)\{\}/);
});

test("the script survives a browser that refuses storage", () => {
  const script = preferencesScript();
  const attributes = new Map<string, string>();
  const documentStub = {
    documentElement: {
      setAttribute(name: string, value: string) {
        attributes.set(name, value);
      },
    },
  };
  const throwing = {
    getItem() {
      throw new Error("storage disabled");
    },
  };

  const run = new Function("document", "localStorage", script);
  assert.doesNotThrow(() => run(documentStub, throwing));
});

test("the script applies stored values verbatim and rejects the rest", () => {
  const script = preferencesScript();
  const run = (stored: Record<string, string | null>) => {
    const attributes = new Map<string, string>();
    const documentStub = {
      documentElement: {
        setAttribute: (name: string, value: string) => void attributes.set(name, value),
      },
    };
    const storage = { getItem: (key: string) => stored[key] ?? null };
    new Function("document", "localStorage", script)(documentStub, storage);
    return attributes;
  };

  const light = run({ [THEME_STORAGE_KEY]: "light", [SIDEBAR_STORAGE_KEY]: "collapsed" });
  assert.equal(light.get(THEME_ATTRIBUTE), "light");
  assert.equal(light.get(SIDEBAR_ATTRIBUTE), "collapsed");

  const empty = run({});
  assert.equal(empty.get(THEME_ATTRIBUTE), DEFAULT_THEME);
  assert.equal(empty.get(SIDEBAR_ATTRIBUTE), DEFAULT_SIDEBAR);

  // An injected value must never reach the attribute unchecked.
  const junk = run({ [THEME_STORAGE_KEY]: "\" onload=\"x", [SIDEBAR_STORAGE_KEY]: "wide" });
  assert.equal(junk.get(THEME_ATTRIBUTE), DEFAULT_THEME);
  assert.equal(junk.get(SIDEBAR_ATTRIBUTE), DEFAULT_SIDEBAR);
});
