import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDonorContext } from "@/lib/donor";
import { fyOf, fyLabel } from "@/lib/fy";
import { AppNav } from "@/components/ui/AppNav";

export const metadata: Metadata = { title: "Tax receipts" };

export default async function ReceiptsPage() {
  const donor = await getDonorContext();
  if (!donor) redirect("/auth/login");
  if (!donor.profile) redirect("/auth/setup");
  if (!donor.profile.full_name) redirect("/auth/setup");

  const verified = donor.donations.filter((d) => d.status === "VERIFIED" && d.receiptNo);

  const byFy = new Map<string, typeof verified>();
  for (const d of verified) {
    const fy = fyOf(d.date);
    byFy.set(fy, [...(byFy.get(fy) ?? []), d]);
  }
  const fys = [...byFy.keys()].sort().reverse();

  return (
    <>
      <AppNav userName={donor.profile.full_name} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-lora text-2xl text-ink mb-1">Tax receipts</h1>
        <span className="block w-8 h-0.5 bg-red mb-3" aria-hidden="true" />
        <p className="text-soft text-sm mb-8 leading-relaxed">
          Every verified gift is eligible for 50% tax deduction under Section 80G. Download a
          certificate per gift, or one consolidated statement for a financial year.
        </p>

        {fys.length === 0 ? (
          <p className="text-soft text-sm">
            No receipts yet — they&apos;ll appear here once a gift is verified.
          </p>
        ) : (
          <div className="space-y-8">
            {fys.map((fy) => {
              const donations = byFy.get(fy)!;
              return (
                <section key={fy} aria-label={fyLabel(fy)}>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <h2 className="font-lora text-lg text-ink">{fyLabel(fy)}</h2>
                    <a
                      href={`/api/receipts/statement?fy=${fy}`}
                      className="text-xs font-semibold border border-sand rounded-sm px-3 py-1.5 text-ink hover:border-red hover:text-red transition-colors flex-shrink-0"
                    >
                      Download FY statement
                    </a>
                  </div>
                  <ul className="divide-y divide-sand">
                    {donations.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 flex-wrap py-3">
                        <span className="font-lora text-base font-bold text-ink flex-shrink-0">
                          ₹{d.amountInr.toLocaleString("en-IN")}
                        </span>
                        <span className="text-sm text-soft">
                          {new Date(d.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-xs text-taupe">Receipt {d.receiptNo}</span>
                        <span className="flex-1" aria-hidden="true" />
                        <a
                          href={`/api/receipts/${d.id}`}
                          className="text-xs font-semibold border border-sand rounded-sm px-3 py-1.5 text-ink hover:border-red hover:text-red transition-colors flex-shrink-0"
                        >
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
