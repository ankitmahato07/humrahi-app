import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createOrder, razorpayConfigured } from "@/lib/razorpay";

// Public endpoint: the donate page calls this to create a Razorpay order
// before opening Checkout. Amounts are validated server-side; the browser
// never dictates anything beyond the intended donation amount.

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
    const order = await createOrder({
      amountPaise: amountInr * 100,
      receipt: `humrahi_${randomUUID().slice(0, 8)}`,
      notes: { designation, source: "app_donate_page" },
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 502 });
  }
}
