// Razorpay server-side helpers — order creation via REST API and signature
// verification. The key secret never leaves the server; the browser only
// receives NEXT_PUBLIC_RAZORPAY_KEY_ID.

import { createHmac, timingSafeEqual } from "node:crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

function credentials(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function razorpayConfigured(): boolean {
  return credentials() !== null;
}

// Authenticated call to the Razorpay REST API (HTTP Basic auth).
export async function razorpayFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const creds = credentials();
  if (!creds) throw new Error("Razorpay keys not configured");

  const res = await fetch(`${RAZORPAY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${creds.keyId}:${creds.keySecret}`
      ).toString("base64")}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay API ${res.status}: ${body.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
  receipt: string | null;
  status: string;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number; // paise
  currency: string;
  status: string; // created | authorized | captured | refunded | failed
  method: string;
  email: string | null;
  contact: string | null;
  notes: Record<string, string>;
  created_at: number; // unix seconds
}

export function createOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  return razorpayFetch<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });
}

export function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  return razorpayFetch<RazorpayPayment>(`/payments/${paymentId}`);
}

function hmacEqual(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Checkout callback signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
export function verifyCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const creds = credentials();
  if (!creds) return false;
  const expected = createHmac("sha256", creds.keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return hmacEqual(expected, params.signature);
}

// Webhook signature: HMAC-SHA256(raw request body, webhook_secret)
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return hmacEqual(expected, signature);
}
