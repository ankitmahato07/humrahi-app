import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

// Vercel Cron Job — runs at 2 AM IST daily.
// Marks donations as reconciled and flags any that appear in the Sevastack
// export but not yet in our DB (or vice versa).
// This is a stub — full reconciliation logic is implemented in Phase 2
// once the Sevastack export format is confirmed.
export async function GET() {
  // Protect against non-Vercel cron calls in production
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Mark unreconciled donations older than 24h as reconciled (stub)
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const { count } = await supabase
    .from("donations")
    .update({ reconciled_at: new Date().toISOString() })
    .is("reconciled_at", null)
    .lt("created_at", yesterday)
    .select("id", { count: "exact", head: true });

  return NextResponse.json({ ok: true, reconciled: count ?? 0 });
}
