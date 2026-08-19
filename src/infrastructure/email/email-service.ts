import "server-only";

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export async function sendTransactionalEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY dan EMAIL_FROM wajib untuk email production.");
    }
    console.info(`[Coin Secret email] ${message.subject} -> ${message.to}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, ...message }),
  });

  if (!response.ok) {
    throw new Error(`Email gagal dikirim (${response.status}).`);
  }
}
