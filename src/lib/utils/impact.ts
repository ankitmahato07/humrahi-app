import type { ImpactRate, DonorImpact } from "@/types/database";

// Calculates donor impact from their donation history and current impact rates.
// Returns approximate figures — always display with "≈" prefix.
export function calculateImpact(
  donations: { amount_inr: number; designation: string; donated_at: string }[],
  rates: ImpactRate[]
): DonorImpact {
  // Use the most recent rate effective on or before each donation date
  function getRateAt(key: ImpactRate["key"], date: string): number {
    const applicable = rates
      .filter((r) => r.key === key && r.effective_from <= date)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    return applicable[0]?.value_inr ?? 0;
  }

  let mealTotal = 0;
  let healthTotal = 0;
  let schoolTotal = 0;
  let firstDonationAt: string | null = null;

  for (const d of donations) {
    if (!firstDonationAt || d.donated_at < firstDonationAt) {
      firstDonationAt = d.donated_at;
    }
    if (d.designation === "meals" || d.designation === "general") {
      mealTotal += d.amount_inr;
    }
    if (d.designation === "health") {
      healthTotal += d.amount_inr;
    }
    if (d.designation === "school") {
      schoolTotal += d.amount_inr;
    }
  }

  // Use a representative date (today) for current rates on general amounts
  const today = new Date().toISOString().slice(0, 10);
  const mealCost = getRateAt("meal_cost", today) || 45; // fallback ₹45/meal
  const campShare = getRateAt("camp_share", today) || 2500;
  const schoolTermCost = getRateAt("school_term", today) || 12000;

  const totalDonated = donations.reduce((s, d) => s + d.amount_inr, 0);

  return {
    total_donated_inr: totalDonated,
    meals_funded: Math.floor(mealTotal / mealCost),
    camps_funded: Math.floor(healthTotal / campShare),
    school_term_fraction: schoolTermCost > 0 ? Math.min(schoolTotal / schoolTermCost, 1) : 0,
    donation_count: donations.length,
    first_donation_at: firstDonationAt,
  };
}

// Format currency in Indian style (₹1,20,000)
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// "March 2026" from an ISO date string
export function formatMonthYear(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}
