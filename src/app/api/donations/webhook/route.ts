import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { ingestDonation } from "@/lib/utils/ingest";

// Constant-time string compare (avoids leaking the secret via timing).
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Sevastack webhook handler (Path A).
// Sevastack POSTs a JSON body and includes a signature header.
// Set SEVASTACK_WEBHOOK_SECRET in Vercel env vars to a strong random value.
export async function POST(request: Request) {
  const secret = process.env.SEVASTACK_WEBHOOK_SECRET;
  // Fail closed: refuse to run if unset OR still the dev placeholder, so the
  // endpoint can't be abused to inject donations before it's properly wired.
  if (!secret || secret === "localtestsecret") {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  // Verify signature (Sevastack's exact header name TBD from their docs)
  const headersList = await headers();
  const sig = headersList.get("x-sevastack-signature") ?? headersList.get("x-webhook-signature");
  if (!sig || !safeEqual(sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Normalise Sevastack payload → our schema
  // Field names are placeholders until the actual Sevastack webhook schema is confirmed.
  const result = await ingestDonation({
    external_id: String(body.transaction_id ?? body.receipt_id ?? body.id ?? ""),
    donor_phone: String(body.donor_phone ?? body.phone ?? ""),
    donor_email: String(body.donor_email ?? body.email ?? ""),
    amount_inr: Number(body.amount ?? body.amount_inr ?? 0),
    donated_at: String(body.created_at ?? body.donated_at ?? new Date().toISOString()),
    designation: mapDesignation(body.fund ?? body.designation),
    is_recurring: Boolean(body.is_recurring ?? body.recurring ?? false),
    source: "sevastack_api",
    raw: body,
  });

  if (result.error) {
    console.error("ingestDonation error:", result.error);
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true, inserted: result.inserted, linked: result.humrahi_linked });
}

function mapDesignation(raw: unknown): "meals" | "health" | "school" | "general" {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("meal") || s.includes("food") || s.includes("hunger")) return "meals";
  if (s.includes("health") || s.includes("camp") || s.includes("medical")) return "health";
  if (s.includes("school") || s.includes("educat")) return "school";
  return "general";
}
