import type { Metadata } from "next";
import { AppNav } from "@/components/ui/AppNav";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "How we count",
  description: "How Humrahi calculates impact figures, where the numbers come from, and why we always show ≈.",
};

export default async function HowWeCountPage() {
  const supabase = await createClient();
  const { data: rates } = await supabase
    .from("impact_rates")
    .select("key, value_inr, effective_from")
    .order("effective_from", { ascending: false });

  // Deduplicate — latest rate per key
  const latestRates: Record<string, { value_inr: number; effective_from: string }> = {};
  for (const r of rates ?? []) {
    if (!latestRates[r.key]) latestRates[r.key] = r;
  }

  return (
    <>
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-lora text-3xl text-ink mb-2">How we count</h1>
        <span className="block w-10 h-0.5 bg-red mb-8" aria-hidden="true" />

        <div className="space-y-8 text-soft text-sm leading-relaxed">
          <section>
            <h2 className="font-lora text-lg text-ink mb-2">Why we say ≈</h2>
            <p>
              Every impact figure on your dashboard is an approximation — hence the ≈.
              Your donation pays for ingredients, fuel, labour, and logistics together.
              We divide by an average cost-per-meal (or per-camp, per-term) to give you
              a honest sense of scale. The real number of people served is tracked on
              the ground; your dashboard shows our best estimate.
            </p>
          </section>

          <section>
            <h2 className="font-lora text-lg text-ink mb-2">Current conversion rates</h2>
            <p className="mb-4">
              These are admin-set and reviewed periodically as actual costs change.
              Older donations are calculated against the rate that was in effect at the time.
            </p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-sand text-taupe-dark text-xs uppercase tracking-wider">
                  <th className="text-left py-2 font-semibold">What</th>
                  <th className="text-right py-2 font-semibold">Current cost</th>
                  <th className="text-right py-2 font-semibold">Since</th>
                </tr>
              </thead>
              <tbody>
                {latestRates["meal_cost"] && (
                  <tr className="border-b border-sand">
                    <td className="py-2">One warm meal</td>
                    <td className="text-right py-2">₹{latestRates["meal_cost"].value_inr}</td>
                    <td className="text-right py-2 text-taupe-dark">
                      {new Date(latestRates["meal_cost"].effective_from).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </td>
                  </tr>
                )}
                {latestRates["camp_share"] && (
                  <tr className="border-b border-sand">
                    <td className="py-2">Share of one health camp</td>
                    <td className="text-right py-2">₹{latestRates["camp_share"].value_inr.toLocaleString("en-IN")}</td>
                    <td className="text-right py-2 text-taupe-dark">
                      {new Date(latestRates["camp_share"].effective_from).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </td>
                  </tr>
                )}
                {latestRates["school_term"] && (
                  <tr>
                    <td className="py-2">One school term</td>
                    <td className="text-right py-2">₹{latestRates["school_term"].value_inr.toLocaleString("en-IN")}</td>
                    <td className="text-right py-2 text-taupe-dark">
                      {new Date(latestRates["school_term"].effective_from).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="font-lora text-lg text-ink mb-2">Reconciliation</h2>
            <p>
              Donation records are synced from Sevastack — our payment and 80G-receipt
              partner — and cross-checked daily. Sevastack holds the financial source of
              truth; what you see here is a reconciled display. If you notice a discrepancy,
              write to us at{" "}
              <a href="mailto:wecare@myhumrahi.org" className="underline hover:text-red transition-colors">
                wecare@myhumrahi.org
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
