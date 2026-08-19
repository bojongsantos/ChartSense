import test from "node:test";
import assert from "node:assert/strict";
import { brevoErrorMessage, brevoPayload } from "@/infrastructure/email/brevo";

const MESSAGE = {
  to: "buyer@example.com",
  subject: "Reset password Coin Secret",
  html: "<p>Tautan</p>",
};

test("the payload matches the shape Brevo expects", () => {
  const payload = brevoPayload(MESSAGE, { email: "noreply@example.com", name: "Coin Secret" });

  // Brevo nests both sender and recipients; a flat `from` string is silently
  // ignored and the send fails on a missing sender instead.
  assert.deepEqual(payload, {
    sender: { email: "noreply@example.com", name: "Coin Secret" },
    to: [{ email: "buyer@example.com" }],
    subject: "Reset password Coin Secret",
    htmlContent: "<p>Tautan</p>",
  });
});

test("a sender without a display name omits the field rather than sending an empty one", () => {
  const payload = brevoPayload(MESSAGE, { email: "noreply@example.com" });
  assert.deepEqual(payload.sender, { email: "noreply@example.com" });
  assert.equal("name" in payload.sender, false);
});

test("the recipient is carried through untouched", () => {
  const payload = brevoPayload({ ...MESSAGE, to: "someone+tag@example.co.id" }, { email: "a@b.c" });
  assert.deepEqual(payload.to, [{ email: "someone+tag@example.co.id" }]);
});

test("a rejected send explains itself with the provider's own code", () => {
  // An unverified sender is the failure an operator meets first, and Brevo
  // only says so in the body. A bare status would send them hunting.
  assert.match(
    brevoErrorMessage(400, { code: "invalid_parameter", message: "sender not valid" }),
    /400 invalid_parameter.*sender not valid/,
  );
  assert.match(
    brevoErrorMessage(401, { code: "unauthorized", message: "Key not found" }),
    /401 unauthorized.*Key not found/,
  );
});

test("an unreadable error body still produces a usable message", () => {
  assert.equal(brevoErrorMessage(502, null), "Email gagal dikirim (502).");
  assert.equal(brevoErrorMessage(500, "<html>"), "Email gagal dikirim (500).");
  assert.equal(brevoErrorMessage(429, { message: "rate limited" }), "Email gagal dikirim (429): rate limited");
  // A non-string code must not be interpolated into the message.
  assert.equal(brevoErrorMessage(400, { code: 7, message: "bad" }), "Email gagal dikirim (400): bad");
});
