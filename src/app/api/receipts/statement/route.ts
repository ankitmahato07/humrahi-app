import { NextResponse } from "next/server";
import { getDonorContext } from "@/lib/donor";
import { SEVASTACK_CONFIGURED } from "@/lib/sevastack";
import { buildStatementPdf } from "@/lib/receiptPdf";
import { fyOf } from "@/lib/fy";

// GET /api/receipts/statement?fy=2026-27 -> application/pdf (consolidated FY statement).
export async function GET(req: Request) {
  const ctx = await getDonorContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!SEVASTACK_CONFIGURED) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const fy = new URL(req.url).searchParams.get("fy");
  if (!fy) return NextResponse.json({ error: "missing_fy" }, { status: 400 });

  const donations = ctx.donations
    .filter((d) => fyOf(d.date) === fy)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (donations.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const totalInr = donations.reduce((s, d) => s + (d.amountInr || 0), 0);
  const donorName = ctx.profile?.full_name || ctx.user.email;
  const pdf = await buildStatementPdf({ fy, donations, donorName, donorEmail: ctx.user.email, totalInr });

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="80G-statement-${fy}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
