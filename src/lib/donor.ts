import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getDonationsForEmail, type SevaDonation } from "@/lib/sevastack";

// Server-only page helper. Bundles the signed-in donor's identity, profile, and
// (whitelisted) Seva Stack donation history for donor-facing pages. Returns null
// when not signed in so pages can redirect. Donations are [] on any Seva Stack
// failure — pages must render gracefully.

export type DonorProfile = {
  full_name: string | null;
  account_type: string | null;
  org_name: string | null;
  wants_updates: boolean;
  wants_whatsapp: boolean;
  tour_done_at: string | null;
};

export type DonorContext = {
  user: { id: string; email: string };
  profile: DonorProfile | null;
  donations: SevaDonation[];
  totalInr: number;
  lastDonationAt: string | null;
};

export async function getDonorContext(): Promise<DonorContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, account_type, org_name, wants_updates, wants_whatsapp, tour_done_at")
    .eq("id", user.id)
    .single();

  const donations = await getDonationsForEmail(user.email);
  const totalInr = donations.reduce((s, d) => s + (d.amountInr || 0), 0);
  const lastDonationAt = donations.reduce<string | null>(
    (max, d) => (max === null || d.date > max ? d.date : max),
    null
  );

  return {
    user: { id: user.id, email: user.email },
    profile: (profile as DonorProfile) ?? null,
    donations,
    totalInr,
    lastDonationAt,
  };
}
