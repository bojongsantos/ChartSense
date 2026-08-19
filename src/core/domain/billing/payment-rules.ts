import { createHash, timingSafeEqual } from "node:crypto";

export type PaymentStatus =
  | "PENDING"
  | "SETTLED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELED"
  | "REFUNDED";

/** Days of access one settled payment grants. */
export const PREMIUM_PERIOD_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Translates a Midtrans transaction status into the status this app stores.
 *
 * Anything unrecognised stays PENDING rather than being guessed at. A payment
 * whose state we do not understand must not silently grant or revoke access.
 */
export function mapTransactionStatus(status: string): PaymentStatus {
  switch (status) {
    case "settlement":
    case "capture":
      return "SETTLED";
    case "expire":
      return "EXPIRED";
    case "cancel":
      return "CANCELED";
    case "refund":
    case "partial_refund":
      return "REFUNDED";
    case "deny":
    case "failure":
      return "FAILED";
    default:
      return "PENDING";
  }
}

export interface NotificationFacts {
  transactionStatus: string;
  statusCode: string;
  fraudStatus?: string;
}

export interface PaymentOutcome {
  /** Status to persist for the payment row. */
  status: PaymentStatus;
  /** True only when access should actually be granted. */
  successful: boolean;
}

/**
 * Decides what a notification means for access.
 *
 * Three conditions must hold together before money is treated as received:
 * the transaction settled, the gateway reported success, and fraud screening
 * accepted it. A settlement that fails any of them is held as PENDING rather
 * than recorded as SETTLED — a payment under fraud review may still be
 * reversed, and granting access on it would hand out a paid plan for free.
 */
export function resolvePaymentOutcome(facts: NotificationFacts): PaymentOutcome {
  const mapped = mapTransactionStatus(facts.transactionStatus);
  const fraudAccepted =
    facts.fraudStatus === undefined || facts.fraudStatus.toLowerCase() === "accept";
  const successful = mapped === "SETTLED" && facts.statusCode === "200" && fraudAccepted;

  return {
    status: mapped === "SETTLED" && !successful ? "PENDING" : mapped,
    successful,
  };
}

/**
 * Whether the amount the gateway reports matches what was charged.
 *
 * Compared numerically because the gateway sends a decimal string such as
 * "99000.00" while the order stores an integer.
 */
export function amountsMatch(grossAmount: string, expectedAmount: number): boolean {
  const received = Number(grossAmount);
  if (!Number.isFinite(received) || !Number.isFinite(expectedAmount)) return false;
  return received === expectedAmount;
}

/**
 * End of the access period after a successful payment.
 *
 * Paying again while a period is still running extends it from the existing
 * end date, so a customer never loses days by renewing early. An expired or
 * missing period starts fresh from now.
 */
export function extendPeriod(currentEnd: Date | null | undefined, now: Date): Date {
  const stillRunning = currentEnd !== null && currentEnd !== undefined && currentEnd > now;
  const base = stillRunning ? currentEnd : now;
  return new Date(base.getTime() + PREMIUM_PERIOD_DAYS * DAY_MS);
}

/**
 * Whether this settlement should still be acted upon.
 *
 * Midtrans retries notifications, so the same settlement arrives more than
 * once. Access is granted on the first one only; repeats must not stack extra
 * days onto the subscription.
 */
export function shouldGrantAccess(storedStatus: PaymentStatus, successful: boolean): boolean {
  return successful && storedStatus !== "SETTLED";
}

/** Whether a refund should pull access back. Only a paid period can be revoked. */
export function shouldRevokeAccess(
  incomingStatus: PaymentStatus,
  storedStatus: PaymentStatus,
): boolean {
  return incomingStatus === "REFUNDED" && storedStatus === "SETTLED";
}

/** Midtrans signature over the fields it echoes back, as hex. */
export function midtransSignature(input: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
}): string {
  return createHash("sha512")
    .update(`${input.orderId}${input.statusCode}${input.grossAmount}${input.serverKey}`)
    .digest("hex");
}

/**
 * Constant-time comparison of two hex signatures. Length is checked first
 * because timingSafeEqual throws on mismatched buffers.
 */
export function signatureMatches(supplied: string, expected: string): boolean {
  if (!/^[0-9a-fA-F]+$/.test(supplied) || supplied.length !== expected.length) return false;
  const suppliedBuffer = Buffer.from(supplied, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (suppliedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(suppliedBuffer, expectedBuffer);
}
