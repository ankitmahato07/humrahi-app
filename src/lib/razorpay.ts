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

// ── Subscriptions (monthly recurring donations) ─────────────────────────────

export interface RazorpayPlan {
  id: string;
  period: string; // daily | weekly | monthly | yearly
  interval: number;
  item: { name: string; amount: number; currency: string }; // amount in paise
}

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: string; // created | authenticated | active | halted | cancelled | completed | expired
  short_url: string | null;
  notes: Record<string, string>;
}

// Reuse an existing monthly plan for this amount, or create one. Razorpay has
// no plan-delete API, so plans accumulate; matching keeps the list tidy for
// the preset tiers. Lookup covers the first 100 plans — beyond that a
// duplicate plan gets created, which is harmless (donors are charged by
// subscription, plans are just templates).
export async function findOrCreateMonthlyPlan(amountPaise: number): Promise<RazorpayPlan> {
  const existing = await razorpayFetch<{ items: RazorpayPlan[] }>("/plans?count=100");
  const match = existing.items.find(
    (p) =>
      p.period === "monthly" &&
      p.interval === 1 &&
      p.item.amount === amountPaise &&
      p.item.currency === "INR"
  );
  if (match) return match;

  const rupees = (amountPaise / 100).toLocaleString("en-IN");
  return razorpayFetch<RazorpayPlan>("/plans", {
    method: "POST",
    body: JSON.stringify({
      period: "monthly",
      interval: 1,
      item: {
        name: `Humrahi monthly giving — ₹${rupees}`,
        amount: amountPaise,
        currency: "INR",
        description: "Monthly donation to Humrahi Foundation",
      },
      notes: { source: "app_donate_page" },
    }),
  });
}

export function createSubscription(params: {
  planId: string;
  notes?: Record<string, string>;
}): Promise<RazorpaySubscription> {
  return razorpayFetch<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: params.planId,
      // 120 monthly cycles = 10 years of giving; the donor can cancel anytime
      // (Razorpay caps subscription duration at 100 years).
      total_count: 120,
      // Razorpay emails the donor the mandate details + manage/cancel link.
      customer_notify: 1,
      notes: params.notes ?? {},
    }),
  });
}

export function fetchSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  return razorpayFetch<RazorpaySubscription>(`/subscriptions/${subscriptionId}`);
}

// Invoices back every subscription charge (and also payment links); an
// invoice's subscription_id is what ties a bare payment back to its
// subscription.
export function fetchInvoice(invoiceId: string): Promise<{ id: string; subscription_id: string | null }> {
  return razorpayFetch<{ id: string; subscription_id: string | null }>(`/invoices/${invoiceId}`);
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

// Subscription checkout callback signature — NOTE the reversed concatenation
// vs orders: HMAC-SHA256(payment_id + "|" + subscription_id, key_secret).
// Source: razorpay-node SDK, lib/utils/razorpay-utils.js.
export function verifySubscriptionCheckoutSignature(params: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): boolean {
  const creds = credentials();
  if (!creds) return false;
  const expected = createHmac("sha256", creds.keySecret)
    .update(`${params.paymentId}|${params.subscriptionId}`)
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
