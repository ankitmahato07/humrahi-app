import { NextResponse } from "next/server";
import { getDonorContext } from "@/lib/donor";
import { SEVASTACK_CONFIGURED } from "@/lib/sevastack";
import { buildReceiptPdf } from "@/lib/receiptPdf";

// GET /api/receipts/[donationId] -> application/pdf (single 80G receipt).
// Ownership: the donation MUST be in the session user's own Seva Stack history.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ donationId: string }> }
) {
  const ctx = await getDonorContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!SEVASTACK_CONFIGURED) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const { donationId } = await params;
  const donation = ctx.donations.find((d) => d.id === donationId);
  if (!donation) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const donorName = ctx.profile?.full_name || ctx.user.email;
  const pdf = await buildReceiptPdf({ donation, donorName, donorEmail: ctx.user.email });

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="80G-receipt-${donation.receiptNo ?? donation.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
