import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/tour/done -> {ok:true}. Persists first-login tour completion on the
// session user's profile so it never re-fires across devices.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await supabase
    .from("profiles")
    .update({ tour_done_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
