import { redirect } from "next/navigation";
import { getDonorContext } from "@/lib/donor";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/ui/AppNav";
import { GreetingStrip } from "@/components/dashboard/GreetingStrip";
import { ImpactStrip } from "@/components/dashboard/ImpactStrip";
import { CampaignsPreview } from "@/components/dashboard/CampaignsPreview";
import { LatestReveal } from "@/components/dashboard/LatestReveal";
import { GiveNudge } from "@/components/dashboard/GiveNudge";
import { Tour } from "@/components/Tour";
import type { Drive, ImpactReveal, ImpactRate } from "@/types/database";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function OverviewPage() {
  const donor = await getDonorContext();
  if (!donor) redirect("/auth/login");
  if (!donor.profile) redirect("/auth/setup");
  if (!donor.profile.full_name) redirect("/auth/setup");

  const supabase = await createClient();

  const { data: drives } = await supabase
    .from("drives")
    .select("*")
    .eq("status", "active")
    .order("starts_at", { ascending: false })
    .limit(3);

  const driveIds = (drives ?? []).map((d) => d.id);
  const { data: participation } = driveIds.length
    ? await supabase
        .from("drive_participation")
        .select("drive_id, contributed_amount_inr")
        .in("drive_id", driveIds)
    : { data: [] as { drive_id: string; contributed_amount_inr: number }[] };

  const raisedByDrive = (participation ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.drive_id] = (acc[p.drive_id] ?? 0) + p.contributed_amount_inr;
    return acc;
  }, {});

  const { data: rates } = await supabase
    .from("impact_rates")
    .select("*")
    .order("effective_from", { ascending: false });

  const { data: reveals } = await supabase
    .from("impact_reveals")
    .select("*")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(1);

  // ponytail: Seva Stack donations carry a free-text `purpose`, not a strict
  // designation — so unlike the old local-donations math, meals/camps here
  // both derive from the same totalInr against their respective impact_rates
  // key. Simple and consistent; revisit if Seva Stack ever exposes a real
  // per-gift designation split.
  const mealCost = (rates as ImpactRate[] | null)?.find((r) => r.key === "meal_cost")?.value_inr ?? 45;
  const campShare = (rates as ImpactRate[] | null)?.find((r) => r.key === "camp_share")?.value_inr ?? null;
  const mealsFunded = Math.floor(donor.totalInr / mealCost);
  const campsFunded = campShare ? Math.floor(donor.totalInr / campShare) : 0;

  const recentlyGave = donor.lastDonationAt
    ? Date.now() - new Date(donor.lastDonationAt).getTime() < THIRTY_DAYS_MS
    : false;

  const latestReveal = ((reveals as ImpactReveal[] | null) ?? [])[0] ?? null;
  const firstName = donor.profile.full_name.trim().split(/\s+/)[0] ?? "Humrahi";

  // Overview sections, ordered — future sections just get appended here.
  const sections = [
    <ImpactStrip
      key="impact"
      totalInr={donor.totalInr}
      mealsFunded={mealsFunded}
      campsFunded={campsFunded}
      hasGiven={donor.donations.length > 0}
    />,
    <CampaignsPreview key="campaigns" drives={(drives as Drive[] | null) ?? []} raisedByDrive={raisedByDrive} />,
    latestReveal ? <LatestReveal key="reveal" reveal={latestReveal} /> : null,
    !recentlyGave ? <GiveNudge key="nudge" /> : null,
  ].filter(Boolean);

  return (
    <>
      <AppNav userName={donor.profile.full_name} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <GreetingStrip firstName={firstName} />
        {sections}
      </main>
      <Tour tourDone={donor.profile.tour_done_at !== null} />
    </>
  );
}
