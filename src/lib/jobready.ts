import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

// SERVER-ONLY. The Wadhwani enrolment URL + institute code live here and NOWHERE
// a client bundle can reach — never import this from a "use client" file. The
// URL is only ever rendered by the server-component JobReadyCard, and only for a
// signed-in person the team has confirmed as a Seva Stack beneficiary.
const WADHWANI_INSTITUTE = "HUMR-91-336742";
function wadhwaniEnrolUrl(language: string): string {
  const path = language === "en" ? "en" : "bn";
  return `https://skilling.wadhwanifoundation.org/${path}/register?instituteCode=${WADHWANI_INSTITUTE}`;
}

export type JobReadyStatus =
  | { kind: "unlocked"; enrolUrl: string }
  | { kind: "pending" }
  | { kind: "none" };

// Looks up the signed-in donor's JobReady signup by email (case-insensitive).
//  - registered (sevastack_registered_at set) → "unlocked" (+ enrol URL)
//  - signed up, not yet registered            → "pending"
//  - no signup, OR migration 012 not applied  → "none" (promo card)
// Any query error (incl. the column not existing yet) degrades to "none" so the
// dashboard never crashes on an un-migrated DB.
export async function getJobReadyStatus(email: string): Promise<JobReadyStatus> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jobready_signups")
    .select("language, sevastack_registered_at")
    .ilike("email", email) // no wildcards → exact, case-insensitive match
    .order("sevastack_registered_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[jobready] status lookup failed (degrading to promo):", error.message);
    return { kind: "none" };
  }
  if (!data) return { kind: "none" };
  if (data.sevastack_registered_at) {
    return { kind: "unlocked", enrolUrl: wadhwaniEnrolUrl(data.language) };
  }
  return { kind: "pending" };
}
