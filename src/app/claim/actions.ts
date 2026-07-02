"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { claimDonation } from "@/lib/utils/ingest";

export type ClaimResult = { ok: boolean; count?: number; error?: string };

/**
 * Let a signed-in Humrahi claim their previously-anonymous donations by receipt
 * number or the email they donated with. Links matching unclaimed donations to
 * their account so their impact shows up on the dashboard.
 */
export async function claimDonationAction(
  _prev: ClaimResult | null,
  formData: FormData
): Promise<ClaimResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/claim");

  const external_id = String(formData.get("external_id") ?? "").trim() || undefined;
  // Security: only ever match donations by the *authenticated* user's own email
  // (server-derived), never an arbitrary address the user types — otherwise a
  // user could claim someone else's donation history by guessing their email.
  const ownEmail = user.email?.trim().toLowerCase() || undefined;

  if (!external_id && !ownEmail) {
    return { ok: false, error: "Enter your donation receipt number to link a gift." };
  }

  let total = 0;
  // Auto-match any anonymous gifts made with the account's own email.
  if (ownEmail) {
    const r = await claimDonation(user.id, { donor_email: ownEmail });
    if (r.claimed) total += r.count;
  }
  // Match by receipt number the donor holds (proof of possession).
  if (external_id) {
    const r = await claimDonation(user.id, { external_id });
    if (r.claimed) total += r.count;
  }

  if (total === 0) {
    return {
      ok: false,
      error: "No unclaimed gifts matched. Double-check the receipt number.",
    };
  }

  revalidatePath("/");
  return { ok: true, count: total };
}
