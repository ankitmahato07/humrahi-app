import { NextResponse } from "next/server";
import { getDonorContext } from "@/lib/donor";
import { resendReceipt } from "@/lib/sevastack";

// POST /api/receipts/email {donationId} -> {ok:boolean}
// Emails the 80G receipt for one of the caller's OWN donations via Seva Stack.
export async function POST(req: Request) {
  const ctx = await getDonorContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let donationId = "";
  try {
    ({ donationId } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (!donationId) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const ok = await resendReceipt(ctx.user.email, donationId);
  return NextResponse.json({ ok });
}
