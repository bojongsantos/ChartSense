import test from "node:test";
import assert from "node:assert/strict";
import { providerCopy } from "@/core/domain/billing/provider-copy";
import { PAYMENT_PROVIDERS } from "@/core/domain/billing/providers";
import { assessReadiness } from "@/core/domain/ops/readiness";

test("every supported provider is named on the checkout page", () => {
  // A provider the factory can build but the page cannot describe would ship a
  // button reading "penyedia pembayaran" into production.
  for (const provider of PAYMENT_PROVIDERS) {
    const copy = providerCopy(provider);
    assert.notEqual(copy.name, "penyedia pembayaran", provider);
    assert.ok(copy.assurance.length > 20, provider);
  }
});

test("the card wording is never shown for a crypto checkout", () => {
  assert.match(providerCopy("midtrans").assurance, /kartu/);
  assert.doesNotMatch(providerCopy("nowpayments").assurance, /kartu/);
  assert.match(providerCopy("nowpayments").assurance, /kripto/);
});

test("an unknown provider names no processor at all", () => {
  const copy = providerCopy("stripe");
  assert.equal(copy.name, "penyedia pembayaran");
  assert.doesNotMatch(copy.assurance, /Midtrans|NOWPayments/);
});

test("every supported provider declares the keys it cannot charge without", () => {
  // A provider absent from the readiness map reports ready on an empty
  // environment, which is the one report an operator trusts before launch.
  for (const provider of PAYMENT_PROVIDERS) {
    const report = assessReadiness([], provider).find((item) => item.id === "payments");
    assert.ok(report, provider);
    assert.ok(report.requires.length > 0, provider);
    assert.notDeepEqual(report.requires, ["PAYMENT_PROVIDER"], provider);
  }
});
