import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getDonorContext } from "@/lib/donor";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/ui/AppNav";
import type { Drive } from "@/types/database";

export const metadata: Metadata = { title: "Campaigns" };

// Static fallback so the page is never bare when no drives are active —
// points at the live Seva Stack "HF" project, same one the static site
// donate button always ultimately funds. Mirrored in campaigns/[id]/page.tsx.
const FEATURED_FALLBACK = {
  id: "crisis-relief-nourishment",
  name: "Crisis Relief & Nourishment",
  description:
    "Warm meals and emergency relief for families in Siliguri — our always-on kitchen, running every day of the year.",
};

export default async function CampaignsPage() {
  const donor = await getDonorContext();
  if (!donor) redirect("/auth/login");
  if (!donor.profile) redirect("/auth/setup");
  if (!donor.profile.full_name) redirect("/auth/setup");

  const supabase = await createClient();
  const { data: drives } = await supabase
    .from("drives")
    .select("*")
    .eq("status", "active")
    .order("starts_at", { ascending: false });

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

  const driveList = (drives as Drive[] | null) ?? [];

  return (
    <>
      <AppNav userName={donor.profile.full_name} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-lora text-2xl text-ink mb-1">Campaigns</h1>
        <span className="block w-8 h-0.5 bg-red mb-8" aria-hidden="true" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {driveList.length === 0 ? (
            <Link
              href={`/campaigns/${FEATURED_FALLBACK.id}`}
              className="card block hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
            >
              <h2 className="font-lora text-lg text-ink mb-1">{FEATURED_FALLBACK.name}</h2>
              <p className="text-sm text-soft leading-relaxed">{FEATURED_FALLBACK.description}</p>
            </Link>
          ) : (
            driveList.map((drive) => {
              const raised = raisedByDrive[drive.id] ?? 0;
              const fraction = drive.goal_amount_inr
                ? Math.min(raised / drive.goal_amount_inr, 1)
                : 0;
              return (
                <Link
                  key={drive.id}
                  href={`/campaigns/${drive.id}`}
                  className="card block hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
                >
                  <h2 className="font-lora text-lg text-ink mb-1">{drive.name}</h2>
                  {drive.description && (
                    <p className="text-sm text-soft leading-relaxed mb-4">{drive.description}</p>
                  )}
                  {drive.goal_amount_inr && (
                    <>
                      <div className="h-2 rounded-full overflow-hidden bg-sand">
                        <div
                          className="h-full bg-red rounded-full"
                          style={{ width: `${Math.round(fraction * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-taupe-dark mt-1.5">
                        ₹{raised.toLocaleString("en-IN")} raised of ₹
                        {drive.goal_amount_inr.toLocaleString("en-IN")} goal
                      </p>
                    </>
                  )}
                  {drive.starts_at && (
                    <p className="text-xs text-taupe mt-2">
                      {new Date(drive.starts_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                      {drive.ends_at
                        ? ` – ${new Date(drive.ends_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}`
                        : ""}
                    </p>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
