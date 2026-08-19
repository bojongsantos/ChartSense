/**
 * Brevo wire format, kept free of network calls and of `server-only` so the
 * payload shape and error handling can be exercised directly by tests. The
 * service that talks to Brevo wraps this.
 */

export const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface BrevoSender {
  email: string;
  name?: string;
}

export interface BrevoPayload {
  sender: BrevoSender;
  to: { email: string }[];
  subject: string;
  htmlContent: string;
}

export function brevoPayload(message: EmailMessage, sender: BrevoSender): BrevoPayload {
  return {
    // Brevo nests the sender, unlike the flat `from` string most providers use.
    sender: sender.name ? { email: sender.email, name: sender.name } : { email: sender.email },
    to: [{ email: message.to }],
    subject: message.subject,
    htmlContent: message.html,
  };
}

/**
 * Turns a failed Brevo response into a message worth logging.
 *
 * Brevo answers with `{ code, message }` and the code is the part that says
 * what to fix — `unauthorized` means a bad key, while `invalid_parameter` on a
 * send almost always means the sender address was never verified. A bare HTTP
 * status hides that distinction, and this failure is the one an operator is
 * most likely to hit on their first send.
 */
export function brevoErrorMessage(status: number, body: unknown): string {
  const detail =
    typeof body === "object" && body !== null
      ? (body as { code?: unknown; message?: unknown })
      : {};
  const code = typeof detail.code === "string" ? detail.code : null;
  const message = typeof detail.message === "string" ? detail.message : null;

  if (code && message) return `Email gagal dikirim (${status} ${code}): ${message}`;
  if (message) return `Email gagal dikirim (${status}): ${message}`;
  return `Email gagal dikirim (${status}).`;
}
