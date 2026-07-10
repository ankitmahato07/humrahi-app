import { NextResponse } from "next/server";
import {
  createSubscription,
  findOrCreateMonthlyPlan,
  razorpayConfigured,
} from "@/lib/razorpay";

// Public endpoint: the donate page calls this to create a Razorpay
// subscription (monthly recurring donation) before opening Checkout. Amounts
// are validated server-side, same bounds as one-time donations. The
// designation is stored in the subscription's notes — recurring charge
// payment entities don't carry checkout notes, so the webhook reads the
// designation from the subscription entity instead.

const MIN_INR = 10;
const MAX_INR = 500_000;

const DESIGNATIONS = new Set(["meals", "health", "school", "general"]);

export async function POST(request: Request) {
  if (!razorpayConfigured()) {
    return NextResponse.json({ error: "Donations are not configured yet" }, { status: 503 });
  }

  let body: { amount_inr?: unknown; designation?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amountInr = Number(body.amount_inr);
  if (!Number.isInteger(amountInr) || amountInr < MIN_INR || amountInr > MAX_INR) {
    return NextResponse.json(
      { error: `Amount must be a whole number between ₹${MIN_INR} and ₹${MAX_INR.toLocaleString("en-IN")}` },
      { status: 400 }
    );
  }

  const designation = DESIGNATIONS.has(String(body.designation))
    ? String(body.designation)
    : "general";

  try {
    const plan = await findOrCreateMonthlyPlan(amountInr * 100);
    const subscription = await createSubscription({
      planId: plan.id,
      notes: { designation, source: "app_donate_page", frequency: "monthly" },
    });

    return NextResponse.json({
      subscription_id: subscription.id,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Razorpay subscription creation failed:", err);
    return NextResponse.json(
      { error: "Could not set up the monthly gift. Please try again." },
      { status: 502 }
    );
  }
}
