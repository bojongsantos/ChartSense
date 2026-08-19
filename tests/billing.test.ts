import test from "node:test";
import assert from "node:assert/strict";
import {
  amountsMatch,
  extendPeriod,
  mapTransactionStatus,
  midtransSignature,
  PREMIUM_PERIOD_DAYS,
  resolvePaymentOutcome,
  shouldGrantAccess,
  shouldRevokeAccess,
  signatureMatches,
} from "@/core/domain/billing/payment-rules";

const SERVER_KEY = "SB-Mid-server-TESTKEY";
const ORDER = { orderId: "ORDER-1", statusCode: "200", grossAmount: "99000.00" };

/** Computed independently of the implementation, so the formula stays locked. */
const GOLDEN_SIGNATURE =
  "ae67959de26fff679549ef3fbdd6aaa98d3960e42a614196887e31dca798e34203ed0b9ff142db7a4a30fa0f0f616d2aa0e85849895a81d3c29abfd162c46981";

const DAY_MS = 24 * 60 * 60 * 1000;

test("the signature follows the order+status+amount+key formula", () => {
  // Getting the field order wrong would reject every genuine notification, so
  // the expected digest is pinned rather than derived from the same code.
  assert.equal(midtransSignature({ ...ORDER, serverKey: SERVER_KEY }), GOLDEN_SIGNATURE);
  assert.equal(GOLDEN_SIGNATURE.length, 128);
});

test("a genuine signature is accepted", () => {
  const signature = midtransSignature({ ...ORDER, serverKey: SERVER_KEY });
  assert.equal(signatureMatches(signature, GOLDEN_SIGNATURE), true);
  // Different hex casing is still the same digest bytes.
  assert.equal(signatureMatches(signature.toUpperCase(), GOLDEN_SIGNATURE), true);
});

test("a forged notification cannot pass verification", () => {
  const expected = midtransSignature({ ...ORDER, serverKey: SERVER_KEY });

  // Without the server key the digest cannot be produced.
  const withoutKey = midtransSignature({ ...ORDER, serverKey: "guessed-key" });
  assert.equal(signatureMatches(withoutKey, expected), false);

  // Each signed field is genuinely covered: changing any one breaks the match.
  const tampered = [
    { ...ORDER, orderId: "ORDER-2" },
    { ...ORDER, statusCode: "201" },
    { ...ORDER, grossAmount: "1.00" },
  ];
  for (const fields of tampered) {
    assert.equal(
      signatureMatches(midtransSignature({ ...fields, serverKey: SERVER_KEY }), expected),
      false,
      "a tampered field must be rejected",
    );
  }
});

test("malformed signatures are refused without throwing", () => {
  const expected = midtransSignature({ ...ORDER, serverKey: SERVER_KEY });
  // timingSafeEqual throws on unequal buffers, so these are filtered first.
  assert.equal(signatureMatches("", expected), false);
  assert.equal(signatureMatches("abcd", expected), false);
  assert.equal(signatureMatches("z".repeat(128), expected), false);
  assert.equal(signatureMatches(expected + "00", expected), false);
});

test("every Midtrans status maps to one stored status", () => {
  assert.equal(mapTransactionStatus("settlement"), "SETTLED");
  assert.equal(mapTransactionStatus("capture"), "SETTLED");
  assert.equal(mapTransactionStatus("expire"), "EXPIRED");
  assert.equal(mapTransactionStatus("cancel"), "CANCELED");
  assert.equal(mapTransactionStatus("refund"), "REFUNDED");
  assert.equal(mapTransactionStatus("partial_refund"), "REFUNDED");
  assert.equal(mapTransactionStatus("deny"), "FAILED");
  assert.equal(mapTransactionStatus("failure"), "FAILED");
  assert.equal(mapTransactionStatus("pending"), "PENDING");
  // An unrecognised status must not be guessed into granting or revoking.
  assert.equal(mapTransactionStatus("something_new"), "PENDING");
  assert.equal(mapTransactionStatus(""), "PENDING");
});

test("access is granted only when settlement, gateway and fraud all agree", () => {
  assert.deepEqual(
    resolvePaymentOutcome({
      transactionStatus: "settlement",
      statusCode: "200",
      fraudStatus: "accept",
    }),
    { status: "SETTLED", successful: true },
  );

  // A card capture that cleared fraud screening is equally valid.
  assert.deepEqual(
    resolvePaymentOutcome({
      transactionStatus: "capture",
      statusCode: "200",
      fraudStatus: "accept",
    }),
    { status: "SETTLED", successful: true },
  );

  // Midtrans omits fraud_status for payment types it does not screen.
  assert.deepEqual(
    resolvePaymentOutcome({ transactionStatus: "settlement", statusCode: "200" }),
    { status: "SETTLED", successful: true },
  );

  assert.equal(
    resolvePaymentOutcome({
      transactionStatus: "settlement",
      statusCode: "200",
      fraudStatus: "ACCEPT",
    }).successful,
    true,
    "fraud status casing must not decide whether someone gets a paid plan",
  );
});

test("a settlement under fraud review is held, never recorded as paid", () => {
  for (const fraudStatus of ["challenge", "deny", "CHALLENGE"]) {
    // Held as PENDING: such a payment can still be reversed, and treating it
    // as settled would hand out a paid plan that was never paid for.
    assert.deepEqual(
      resolvePaymentOutcome({
        transactionStatus: "settlement",
        statusCode: "200",
        fraudStatus,
      }),
      { status: "PENDING", successful: false },
      "a payment under fraud review must not grant access",
    );
  }
});

test("a settlement the gateway did not confirm is held as pending", () => {
  for (const statusCode of ["201", "202", "400", "500", ""]) {
    assert.deepEqual(
      resolvePaymentOutcome({
        transactionStatus: "settlement",
        statusCode,
        fraudStatus: "accept",
      }),
      { status: "PENDING", successful: false },
      "only status code 200 may grant access",
    );
  }
});

test("non-settlement statuses are stored as-is and grant nothing", () => {
  const cases = [
    ["expire", "EXPIRED"],
    ["cancel", "CANCELED"],
    ["deny", "FAILED"],
    ["refund", "REFUNDED"],
  ] as const;
  for (const [transactionStatus, expected] of cases) {
    const outcome = resolvePaymentOutcome({ transactionStatus, statusCode: "200" });
    assert.equal(outcome.status, expected);
    assert.equal(outcome.successful, false);
  }
});

test("a mismatched amount is rejected", () => {
  assert.equal(amountsMatch("99000.00", 99_000), true);
  assert.equal(amountsMatch("99000", 99_000), true);

  // Underpaying must never be accepted as full payment.
  assert.equal(amountsMatch("1.00", 99_000), false);
  assert.equal(amountsMatch("98999.99", 99_000), false);
  assert.equal(amountsMatch("990000.00", 99_000), false);

  // Unparseable input fails closed rather than comparing as NaN.
  assert.equal(amountsMatch("", 99_000), false);
  assert.equal(amountsMatch("abc", 99_000), false);
  assert.equal(amountsMatch("99000.00", Number.NaN), false);
});

test("a fresh payment starts a 30 day period from now", () => {
  const now = new Date("2026-08-19T10:00:00.000Z");
  const expected = new Date(now.getTime() + PREMIUM_PERIOD_DAYS * DAY_MS);
  assert.equal(extendPeriod(null, now).toISOString(), expected.toISOString());
  assert.equal(extendPeriod(undefined, now).getTime(), expected.getTime());
});

test("renewing early stacks onto the running period instead of losing days", () => {
  const now = new Date("2026-08-19T10:00:00.000Z");
  const stillRunning = new Date(now.getTime() + 10 * DAY_MS);

  const extended = extendPeriod(stillRunning, now);

  // Ten days left plus thirty bought equals forty from today, not thirty.
  assert.equal(extended.getTime(), stillRunning.getTime() + PREMIUM_PERIOD_DAYS * DAY_MS);
  assert.equal(extended.getTime() - now.getTime(), 40 * DAY_MS);
});

test("an expired period restarts from now rather than from the old end", () => {
  const now = new Date("2026-08-19T10:00:00.000Z");
  const lapsed = new Date(now.getTime() - 5 * DAY_MS);

  const restarted = extendPeriod(lapsed, now);

  assert.equal(restarted.getTime(), now.getTime() + PREMIUM_PERIOD_DAYS * DAY_MS);
  assert.ok(restarted > now, "a lapsed subscriber must not receive a period already in the past");
});

test("a repeated settlement notification does not stack another period", () => {
  // Midtrans retries notifications, so the same settlement arrives twice.
  assert.equal(shouldGrantAccess("PENDING", true), true);
  assert.equal(shouldGrantAccess("SETTLED", true), false);
  // Nothing is granted on a notification that did not settle.
  assert.equal(shouldGrantAccess("PENDING", false), false);
  assert.equal(shouldGrantAccess("FAILED", false), false);
});

test("a refund revokes access only for a payment that was actually paid", () => {
  assert.equal(shouldRevokeAccess("REFUNDED", "SETTLED"), true);
  // A refund on a payment that never settled has nothing to take back.
  assert.equal(shouldRevokeAccess("REFUNDED", "PENDING"), false);
  assert.equal(shouldRevokeAccess("REFUNDED", "REFUNDED"), false);
  // Other outcomes must not revoke a paid period.
  assert.equal(shouldRevokeAccess("EXPIRED", "SETTLED"), false);
  assert.equal(shouldRevokeAccess("FAILED", "SETTLED"), false);
});
