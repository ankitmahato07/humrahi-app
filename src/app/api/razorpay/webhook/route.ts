import { NextResponse } from "next/server";
import { verifyWebhookSignature, type RazorpayPayment } from "@/lib/razorpay";
import { ingestDonation } from "@/lib/utils/ingest";

// Razorpay webhook (configure in Dashboard → Settings → Webhooks pointing at
// https://app.myhumrahi.org/api/razorpay/webhook with the payment.captured
// event). This is the authoritative ingestion path — it fires even when the
// donor never returns to the site after paying. Idempotent on payment id, so
// double-delivery or overlap with /api/razorpay/verify is harmless.
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
    payload?: { payment?: { entity?: RazorpayPayment } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Acknowledge everything we don't act on so Razorpay stops retrying.
  if (event.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: event.event ?? "unknown" });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.id) {
    return NextResponse.json({ error: "Missing payment entity" }, { status: 400 });
  }

  const result = await ingestDonation({
    external_id: payment.id,
    donor_phone: payment.contact || null,
    donor_email: payment.email || null,
    amount_inr: payment.amount / 100,
    donated_at: new Date(payment.created_at * 1000).toISOString(),
    designation: mapDesignation(payment.notes?.designation),
    is_recurring: false,
    source: "razorpay",
    raw: payment as unknown as Record<string, unknown>,
  });

  if (result.error) {
    console.error("Webhook ingestDonation error:", result.error);
    // Non-2xx makes Razorpay retry later — ingestion is idempotent, so a
    // retry after a transient DB failure is exactly what we want.
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: result.inserted, linked: result.humrahi_linked });
}

function mapDesignation(raw: unknown): "meals" | "health" | "school" | "general" {
  const s = String(raw ?? "").toLowerCase();
  if (s === "meals" || s === "health" || s === "school") return s;
  return "general";
}
