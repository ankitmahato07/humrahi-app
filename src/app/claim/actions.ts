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
  const donor_email = String(formData.get("donor_email") ?? "").trim().toLowerCase() || undefined;

  if (!external_id && !donor_email) {
    return { ok: false, error: "Enter a receipt number or the email you donated with." };
  }

  const res = await claimDonation(user.id, { external_id, donor_email });
  if (!res.claimed) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  if (res.count === 0) {
    return {
      ok: false,
      error: "No unclaimed gifts matched that. Double-check the receipt number or email.",
    };
  }

  revalidatePath("/");
  return { ok: true, count: res.count };
}
