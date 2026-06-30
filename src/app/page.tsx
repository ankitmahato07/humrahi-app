import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/ui/AppNav";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Load Humrahi profile
  const { data: profile } = await supabase
    .from("humrahis")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.first_name) redirect("/auth/setup");

  // Load donations
  const { data: donations } = await supabase
    .from("donations")
    .select("amount_inr, designation, donated_at, external_id")
    .eq("humrahi_id", user.id)
    .order("donated_at", { ascending: false });

  // Load current impact rates
  const { data: rates } = await supabase
    .from("impact_rates")
    .select("*")
    .order("effective_from", { ascending: false });

  // Load active drive / monthly cohort
  const { data: activeDrives } = await supabase
    .from("drives")
    .select("*")
    .eq("status", "active")
    .order("starts_at", { ascending: false })
    .limit(2);

  const cohort = activeDrives?.find((d) => d.type === "monthly_cohort") ?? null;
  const drive = activeDrives?.find((d) => d.type === "drive") ?? null;

  // Cohort participation count & total
  let cohortStats = { humrahi_count: 0, total_meals: 0 };
  if (cohort) {
    const { data: participation } = await supabase
      .from("drive_participation")
      .select("contributed_amount_inr")
      .eq("drive_id", cohort.id);

    const totalINR = participation?.reduce((s, p) => s + p.contributed_amount_inr, 0) ?? 0;
    const mealCost = rates?.find((r) => r.key === "meal_cost")?.value_inr ?? 45;
    cohortStats = {
      humrahi_count: participation?.length ?? 0,
      total_meals: Math.floor(totalINR / mealCost),
    };
  }

  // Drive progress
  let driveProgress = 0;
  if (drive) {
    const { data: driveParticipation } = await supabase
      .from("drive_participation")
      .select("contributed_amount_inr")
      .eq("drive_id", drive.id);

    const raised = driveParticipation?.reduce((s, p) => s + p.contributed_amount_inr, 0) ?? 0;
    driveProgress = drive.goal_amount_inr ? Math.min(raised / drive.goal_amount_inr, 1) : 0;
  }

  // Recent impact reveals for this user (or broadcast)
  const { data: reveals } = await supabase
    .from("impact_reveals")
    .select("*")
    .or(`humrahi_id.eq.${user.id},humrahi_id.is.null`)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(3);

  // Recognition wall — consented first names this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { data: recognitionNames } = await supabase
    .from("humrahis")
    .select("first_name")
    .eq("consent_recognition", true)
    .gte("joined_at", startOfMonth.toISOString())
    .limit(20);

  return (
    <>
      <AppNav userName={profile.first_name} />
      <DashboardShell
        profile={profile}
        donations={donations ?? []}
        rates={rates ?? []}
        cohort={cohort}
        cohortStats={cohortStats}
        drive={drive}
        driveProgress={driveProgress}
        reveals={reveals ?? []}
        recognitionNames={recognitionNames?.map((r) => r.first_name).filter(Boolean) ?? []}
      />
    </>
  );
}
