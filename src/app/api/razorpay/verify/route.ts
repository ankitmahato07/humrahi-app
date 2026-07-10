import { NextResponse } from "next/server";
import {
  fetchPayment,
  fetchSubscription,
  verifyCheckoutSignature,
  verifySubscriptionCheckoutSignature,
} from "@/lib/razorpay";
import { ingestDonation } from "@/lib/utils/ingest";
import { sendDonationEmails } from "@/lib/email/send";

// Called by the donate page after Razorpay Checkout succeeds — for one-time
// payments (order shape) AND the first charge of a monthly subscription
// (subscription shape; the two sign different payloads). Verifies the
// checkout signature, then re-fetches the payment from Razorpay's API so the
// recorded amount/contact come from Razorpay, not the browser. The webhook
// (payment.captured / subscription.charged) covers the case where the donor
// closes the tab before this fires — ingestion is idempotent on the payment id.
export async function POST(request: Request) {
  let body: {
    razorpay_order_id?: string;
    razorpay_subscription_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = body;
  if ((!razorpay_order_id && !razorpay_subscription_id) || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  const valid = razorpay_subscription_id
    ? verifySubscriptionCheckoutSignature({
        paymentId: razorpay_payment_id,
        subscriptionId: razorpay_subscription_id,
        signature: razorpay_signature,
      })
    : verifyCheckoutSignature({
        orderId: razorpay_order_id!,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const payment = await fetchPayment(razorpay_payment_id);

    if (payment.status !== "captured" && payment.status !== "authorized") {
      return NextResponse.json({ error: `Payment not completed (${payment.status})` }, { status: 409 });
    }

    // Subscription charges don't carry checkout notes on the payment entity —
    // the designation lives in the subscription's notes. If that lookup fails,
    // don't ingest a permanently mislabeled row here (ingestion is idempotent,
    // so a wrong-first-write wins forever) — leave the recording to the
    // webhook, which retries until it can classify correctly.
    let designation = mapDesignation(payment.notes?.designation);
    if (razorpay_subscription_id) {
      try {
        const subscription = await fetchSubscription(razorpay_subscription_id);
        designation = mapDesignation(subscription.notes?.designation);
      } catch (err) {
        console.error("verify: could not fetch subscription notes, deferring to webhook:", err);
        return NextResponse.json({ ok: true, payment_id: payment.id, deferred: true });
      }
    }

    const result = await ingestDonation({
      external_id: payment.id,
      donor_phone: payment.contact || null,
      donor_email: payment.email || null,
      amount_inr: payment.amount / 100,
      donated_at: new Date(payment.created_at * 1000).toISOString(),
      designation,
      is_recurring: Boolean(razorpay_subscription_id),
      source: "razorpay",
      raw: payment as unknown as Record<string, unknown>,
    });

    if (result.error) {
      // The payment itself succeeded — never show the donor a failure here.
      console.error("ingestDonation error after verified payment:", result.error);
    } else if (result.inserted) {
      // First time we've seen this payment → send the donor thank-you + receipt
      // and the owner alert. Guarded by `inserted` so the webhook (which also
      // ingests this same payment) can't trigger a duplicate thank-you.
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

    return NextResponse.json({ ok: true, payment_id: payment.id });
  } catch (err) {
    console.error("Payment verification failed:", err);
    return NextResponse.json({ error: "Could not verify the payment" }, { status: 502 });
  }
}

function mapDesignation(raw: unknown): "meals" | "health" | "school" | "general" {
  const s = String(raw ?? "").toLowerCase();
  if (s === "meals" || s === "health" || s === "school") return s;
  return "general";
}
