import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getDonorContext } from "@/lib/donor";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/ui/AppNav";
import { DonateButtons } from "@/components/dashboard/DonateButtons";
import type { Drive } from "@/types/database";

// Mirrors the fallback card in campaigns/page.tsx.
const FEATURED_FALLBACK = {
  id: "crisis-relief-nourishment",
  name: "Crisis Relief & Nourishment",
  description:
    "Warm meals and emergency relief for families in Siliguri — our always-on kitchen, running every day of the year.",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const donor = await getDonorContext();
  if (!donor) redirect("/auth/login");
  if (!donor.profile) redirect("/auth/setup");
  if (!donor.profile.full_name) redirect("/auth/setup");

  let drive: Drive | null = null;
  let raised = 0;

  if (id !== FEATURED_FALLBACK.id) {
    const supabase = await createClient();
    const { data } = await supabase.from("drives").select("*").eq("id", id).single();
    if (!data) notFound();
    drive = data as Drive;

    const { data: rows } = await supabase
      .from("drive_participation")
      .select("contributed_amount_inr")
      .eq("drive_id", id);
    raised = (rows ?? []).reduce((s, p) => s + p.contributed_amount_inr, 0);
  }

  const name = drive?.name ?? FEATURED_FALLBACK.name;
  const description = drive?.description ?? FEATURED_FALLBACK.description;
  const fraction = drive?.goal_amount_inr ? Math.min(raised / drive.goal_amount_inr, 1) : 0;

  return (
    <>
      <AppNav userName={donor.profile.full_name} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/campaigns"
          className="text-xs font-medium text-taupe-dark hover:text-red transition-colors"
        >
          ← All campaigns
        </Link>
        <h1 className="font-lora text-2xl sm:text-3xl text-ink mt-3 mb-2">{name}</h1>
        {description && (
          <p className="text-soft text-sm leading-relaxed mb-6">{description}</p>
        )}

        {drive?.goal_amount_inr && (
          <div className="mb-8">
            <div className="h-2.5 rounded-full overflow-hidden bg-sand">
              <div
                className="h-full bg-red rounded-full"
                style={{ width: `${Math.round(fraction * 100)}%` }}
              />
            </div>
            <p className="text-xs text-taupe-dark mt-1.5">
              ₹{raised.toLocaleString("en-IN")} raised of ₹
              {drive.goal_amount_inr.toLocaleString("en-IN")} goal
              {drive.ends_at &&
                ` · ends ${new Date(drive.ends_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}`}
            </p>
          </div>
        )}

        <DonateButtons email={donor.user.email} />
      </main>
    </>
  );
}
