import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/admin/KpiCard";
import { DonationsChart } from "@/components/admin/DonationsChart";
import { FunnelChart } from "@/components/admin/FunnelChart";
import { DesignationDonut } from "@/components/admin/DesignationDonut";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  // ── KPI data ──────────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    { count: totalHumrahis },
    { count: newHumrahis },
    { data: donationSums },
    { count: activeRecurring },
    { count: totalEnquiries },
    { count: newEnquiries },
  ] = await Promise.all([
    supabase.from("humrahis").select("id", { count: "exact", head: true }),
    supabase.from("humrahis").select("id", { count: "exact", head: true }).gte("joined_at", thirtyDaysAgo),
    supabase.from("donations").select("amount_inr, donated_at, designation"),
    supabase.from("donations").select("id", { count: "exact", head: true }).eq("is_recurring", true),
    supabase.from("enquiries").select("id", { count: "exact", head: true }),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
  ]);

  const allDonations = donationSums ?? [];
  const recentDonations = allDonations.filter((d) => d.donated_at >= thirtyDaysAgo);
  const totalRaisedAllTime = allDonations.reduce((s, d) => s + Number(d.amount_inr), 0);
  const totalRaisedPeriod = recentDonations.reduce((s, d) => s + Number(d.amount_inr), 0);

  // Impact rates for meal calc
  const { data: rates } = await supabase
    .from("impact_rates")
    .select("key, value_inr")
    .eq("key", "meal_cost")
    .order("effective_from", { ascending: false })
    .limit(1);
  const mealCost = rates?.[0]?.value_inr ?? 45;
  const mealsFunded = Math.floor(totalRaisedAllTime / mealCost);

  // Claimed vs anonymous ratio (conversion metric)
  const { count: claimedDonations } = await supabase
    .from("donations")
    .select("id", { count: "exact", head: true })
    .not("humrahi_id", "is", null);
  const claimRate =
    allDonations.length > 0
      ? Math.round(((claimedDonations ?? 0) / allDonations.length) * 100)
      : 0;

  // Chart data — donations by day (last 30 days)
  const donationsByDay: Record<string, number> = {};
  for (const d of recentDonations) {
    const day = d.donated_at.slice(0, 10);
    donationsByDay[day] = (donationsByDay[day] ?? 0) + Number(d.amount_inr);
  }
  const chartData = Object.entries(donationsByDay)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Designation breakdown
  const byDesignation: Record<string, number> = {};
  for (const d of allDonations) {
    byDesignation[d.designation] = (byDesignation[d.designation] ?? 0) + Number(d.amount_inr);
  }
  const donutData = Object.entries(byDesignation).map(([name, value]) => ({ name, value }));

  // Funnel: total donations → claimed → humrahis signed in
  const funnelData = [
    { stage: "Donations", count: allDonations.length },
    { stage: "Claimed", count: claimedDonations ?? 0 },
    { stage: "Humrahis", count: totalHumrahis ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-lora text-2xl text-ink">Overview</h1>
        <p className="text-sm text-soft mt-1">Last 30 days · all-time below</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard label="Raised (30 days)" value={`₹${totalRaisedPeriod.toLocaleString("en-IN")}`} />
        <KpiCard label="Raised (all time)" value={`₹${totalRaisedAllTime.toLocaleString("en-IN")}`} />
        <KpiCard label="Meals funded (≈)" value={`≈${mealsFunded.toLocaleString("en-IN")}`} />
        <KpiCard label="Humrahis" value={String(totalHumrahis ?? 0)} sub={`+${newHumrahis ?? 0} this month`} />
        <KpiCard label="Claim rate" value={`${claimRate}%`} sub="donors who signed in" />
        <KpiCard label="Recurring donors" value={String(activeRecurring ?? 0)} />
        <KpiCard label="Enquiries" value={String(totalEnquiries ?? 0)} sub={`+${newEnquiries ?? 0} this month`} />
        <KpiCard label="Donations" value={String(allDonations.length)} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DonationsChart data={chartData} />
        </div>
        <div>
          <DesignationDonut data={donutData} />
        </div>
      </div>

      {/* Funnel */}
      <FunnelChart data={funnelData} />
    </div>
  );
}
