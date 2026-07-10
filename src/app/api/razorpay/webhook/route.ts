import { NextResponse } from "next/server";
import {
  fetchInvoice,
  fetchSubscription,
  verifyWebhookSignature,
  type RazorpayPayment,
  type RazorpaySubscription,
} from "@/lib/razorpay";
import { ingestDonation } from "@/lib/utils/ingest";
import { sendDonationEmails } from "@/lib/email/send";

// Razorpay webhook (configure in Dashboard → Settings → Webhooks pointing at
// https://app.myhumrahi.org/api/razorpay/webhook with the payment.captured
// AND subscription.charged events). This is the authoritative ingestion path —
// it fires even when the donor never returns to the site after paying.
// Idempotent on payment id, so double-delivery or overlap with
// /api/razorpay/verify is harmless.
//
// Monthly recurring gifts: the donor's chosen designation lives in the
// SUBSCRIPTION's notes (recurring payment entities carry no checkout notes),
// so both events resolve the subscription before ingesting. subscription.charged
// ships it in the payload; payment.captured for an invoice-backed payment
// resolves it via the invoice (invoice.subscription_id). That makes
// payment.captured alone sufficient — recurring charges are recorded correctly
// even if subscription.charged was never subscribed in the dashboard — while
// both events firing stays a no-op duplicate (same payment id).
export async function POST(request: Request) {
  // Fail closed until the webhook secret is configured.
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  // Signature is computed over the exact raw body — read it before parsing.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: RazorpayPayment & { invoice_id?: string | null } };
      subscription?: { entity?: RazorpaySubscription };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Acknowledge everything we don't act on so Razorpay stops retrying.
  if (event.event !== "payment.captured" && event.event !== "subscription.charged") {
    return NextResponse.json({ ok: true, ignored: event.event ?? "unknown" });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.id) {
    return NextResponse.json({ error: "Missing payment entity" }, { status: 400 });
  }

  let subscription: RazorpaySubscription | undefined =
    event.event === "subscription.charged" ? event.payload?.subscription?.entity : undefined;

  // An invoice-backed payment.captured may be a subscription charge — resolve
  // it via the invoice so the gift gets the right designation/is_recurring
  // even when only payment.captured is subscribed. Invoices without a
  // subscription (e.g. payment links) fall through as one-time gifts.
  if (!subscription && payment.invoice_id) {
    try {
      const invoice = await fetchInvoice(payment.invoice_id);
      if (invoice.subscription_id) {
        subscription = await fetchSubscription(invoice.subscription_id);
      }
    } catch (err) {
      // Can't classify the payment yet — 500 makes Razorpay retry later
      // (idempotent), which beats recording a recurring gift mislabeled as
      // one-time/general. subscription.charged, if subscribed, covers it too.
      console.error("Webhook could not resolve invoice → subscription:", err);
      return NextResponse.json({ error: "Could not resolve invoice" }, { status: 500 });
    }
  }

  const designation = mapDesignation(
    subscription ? subscription.notes?.designation : payment.notes?.designation
  );

  const result = await ingestDonation({
    external_id: payment.id,
    donor_phone: payment.contact || null,
    donor_email: payment.email || null,
    amount_inr: payment.amount / 100,
    donated_at: new Date(payment.created_at * 1000).toISOString(),
    designation,
    is_recurring: Boolean(subscription),
    source: "razorpay",
    raw: payment as unknown as Record<string, unknown>,
  });

  if (result.error) {
    console.error("Webhook ingestDonation error:", result.error);
    // Non-2xx makes Razorpay retry later — ingestion is idempotent, so a
    // retry after a transient DB failure is exactly what we want.
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Only email on a genuine first insert. If the browser verify path already
  // ingested this payment, `inserted` is false here and we stay silent.
  if (result.inserted) {
    await sendDonationEmails({
      amount_inr: payment.amount / 100,
      designation,
      payment_id: payment.id,
      donated_at: new Date(payment.created_at * 1000).toISOString(),
      donor_email: payment.email || null,
      donor_phone: payment.contact || null,
      donor_name: payment.notes?.name ?? null,
      humrahi_linked: result.humrahi_linked,
    });
  }

  return NextResponse.json({ ok: true, inserted: result.inserted, linked: result.humrahi_linked });
}

function mapDesignation(raw: unknown): "meals" | "health" | "school" | "general" {
  const s = String(raw ?? "").toLowerCase();
  if (s === "meals" || s === "health" || s === "school") return s;
  return "general";
}
