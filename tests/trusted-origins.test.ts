import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOrigin, resolveTrustedOrigins } from "@/shared/lib/trusted-origins";

test("an origin is reduced to scheme, host and port", () => {
  assert.equal(normalizeOrigin("https://coin-secret.vercel.app/"), "https://coin-secret.vercel.app");
  assert.equal(normalizeOrigin("  https://coin-secret.vercel.app  "), "https://coin-secret.vercel.app");
  assert.equal(normalizeOrigin("https://coin-secret.vercel.app/login?x=1"), "https://coin-secret.vercel.app");
  assert.equal(normalizeOrigin("http://localhost:3000"), "http://localhost:3000");
});

test("anything that is not an absolute http origin is dropped", () => {
  // This list is a CSRF control. A value that cannot be parsed must not be
  // handed to the auth layer on the hope that it means something.
  for (const junk of ["", "   ", "coin-secret.vercel.app", "/login", "javascript:alert(1)", "ftp://x.test", "data:text/html,x"]) {
    assert.equal(normalizeOrigin(junk), null, junk);
  }
});

test("the app's own URL is always trusted", () => {
  const origins = resolveTrustedOrigins({ appUrl: "https://coin-secret.vercel.app" });
  assert.deepEqual(origins, ["https://coin-secret.vercel.app"]);
});

test("the domain a deployment was renamed from can be trusted alongside it", () => {
  // The exact case that broke sign-in: two live domains, one trusted.
  const origins = resolveTrustedOrigins({
    appUrl: "https://coin-secret.vercel.app",
    extra: "https://domain-lama.example",
  });
  assert.deepEqual(origins, [
    "https://coin-secret.vercel.app",
    "https://domain-lama.example",
  ]);
});

test("several extra origins are accepted and junk between them is skipped", () => {
  const origins = resolveTrustedOrigins({
    appUrl: "https://a.test",
    extra: " https://b.test/ , , not-a-url , https://c.test ",
  });
  assert.deepEqual(origins, ["https://a.test", "https://b.test", "https://c.test"]);
});

test("a repeated origin is listed once", () => {
  const origins = resolveTrustedOrigins({
    appUrl: "https://a.test",
    extra: "https://a.test/,https://a.test/login",
  });
  assert.deepEqual(origins, ["https://a.test"]);
});

test("development also trusts the loopback alias of its own port", () => {
  // `next dev` answers on localhost and 127.0.0.1 alike, and opening the one
  // the config does not name produced an error that read like a CSRF failure.
  const origins = resolveTrustedOrigins({ appUrl: "http://localhost:3000", development: true });
  assert.deepEqual(origins, ["http://localhost:3000", "http://127.0.0.1:3000"]);

  const fromLoopback = resolveTrustedOrigins({ appUrl: "http://127.0.0.1:3000", development: true });
  assert.deepEqual(fromLoopback, ["http://127.0.0.1:3000", "http://localhost:3000"]);
});

test("production never widens the list on its own", () => {
  // The leniency is a development affordance. A production deployment must
  // name every origin it accepts, or the control means nothing.
  const origins = resolveTrustedOrigins({ appUrl: "http://localhost:3000", development: false });
  assert.deepEqual(origins, ["http://localhost:3000"]);

  const remote = resolveTrustedOrigins({ appUrl: "https://coin-secret.vercel.app", development: true });
  assert.deepEqual(remote, ["https://coin-secret.vercel.app"], "a public host gains no loopback aliases");
});

test("a malformed base URL does not produce an empty-string origin", () => {
  // An empty entry would be compared against the request origin and could
  // widen the list rather than narrow it.
  const origins = resolveTrustedOrigins({ appUrl: "not-a-url", extra: "https://b.test" });
  assert.deepEqual(origins, ["https://b.test"]);
  assert.equal(origins.includes(""), false);
});

test("development also trusts the Network URL next dev prints", () => {
  // The reported failure: the app was opened on the LAN address and every
  // sign-in answered "Invalid origin".
  const origins = resolveTrustedOrigins({
    appUrl: "http://localhost:3000",
    development: true,
    lanAddresses: ["192.168.1.10", "10.0.0.5"],
  });
  assert.ok(origins.includes("http://192.168.1.10:3000"));
  assert.ok(origins.includes("http://10.0.0.5:3000"));
});

test("LAN addresses are ignored in production", () => {
  // In production these would be origins nobody declared, reachable by
  // anything sharing the network with the server.
  const origins = resolveTrustedOrigins({
    appUrl: "http://localhost:3000",
    development: false,
    lanAddresses: ["192.168.1.10"],
  });
  assert.deepEqual(origins, ["http://localhost:3000"]);
});

test("a public base URL gains no LAN origins even in development", () => {
  const origins = resolveTrustedOrigins({
    appUrl: "https://coin-secret.vercel.app",
    development: true,
    lanAddresses: ["192.168.1.10"],
  });
  assert.deepEqual(origins, ["https://coin-secret.vercel.app"]);
});
