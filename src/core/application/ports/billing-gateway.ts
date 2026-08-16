export interface CheckoutRequest {
  orderId: string;
  amount: number;
  customer: { name: string; email: string };
}

export interface CheckoutResult {
  token: string;
  redirectUrl: string;
}

export interface PaymentNotification {
  orderId: string;
  transactionId?: string;
  grossAmount: string;
  statusCode: string;
  transactionStatus: string;
  fraudStatus?: string;
  signatureKey: string;
  raw: Record<string, unknown>;
}

export interface BillingGateway {
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  parseAndVerifyNotification(payload: unknown): PaymentNotification;
}
