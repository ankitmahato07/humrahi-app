import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export const metadata: Metadata = { title: "Donations" };

type DonationRow = {
  external_id: string;
  amount_inr: number;
  donated_at: string;
  designation: string;
  source: string;
  humrahi_id: string | null;
  donor_phone: string | null;
};

const inr = (n: number) => `₹${Math.round(Number(n)).toLocaleString("en-IN")}`;
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function DonationsPage() {
  const { admin } = await requireAdmin();

  const { data } = await admin
    .from("donations")
    .select("external_id, amount_inr, donated_at, designation, source, humrahi_id, donor_phone")
    .order("donated_at", { ascending: false })
    .limit(100);
  const donations = (data ?? []) as DonationRow[];

  const total = donations.reduce((s, d) => s + Number(d.amount_inr), 0);
  const linkedCount = donations.filter((d) => d.humrahi_id).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-lora text-2xl text-ink">Donations</h1>
        <p className="text-sm text-soft mt-1">
          Donor-facing pages read live from Seva Stack. This view lists any records held in the
          local donations table.
        </p>
      </div>

      <div className="rounded-card border border-taupe/40 bg-white shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-taupe/20 flex items-center justify-between">
          <h2 className="font-lora text-lg text-ink">Recent donations</h2>
          <span className="text-xs text-taupe-dark">
            {donations.length} shown · {inr(total)} · {linkedCount} linked
          </span>
        </div>
        {donations.length === 0 ? (
          <div className="p-8 text-center text-soft text-sm">
            No donations in the local table.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-taupe-dark border-b border-taupe/20">
                  <th className="px-5 py-2 font-medium">Receipt</th>
                  <th className="px-5 py-2 font-medium">Amount</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Fund</th>
                  <th className="px-5 py-2 font-medium">Linked</th>
                  <th className="px-5 py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.external_id} className="border-b border-taupe/10 text-soft">
                    <td className="px-5 py-2 font-mono text-xs text-ink">{d.external_id}</td>
                    <td className="px-5 py-2 text-ink">{inr(d.amount_inr)}</td>
                    <td className="px-5 py-2">{fmtDate(d.donated_at)}</td>
                    <td className="px-5 py-2 capitalize">{d.designation}</td>
                    <td className="px-5 py-2">
                      {d.humrahi_id ? (
                        <span className="text-red">linked</span>
                      ) : (
                        <span className="text-taupe-dark">unclaimed</span>
                      )}
                    </td>
                    <td className="px-5 py-2 text-xs text-taupe-dark">
                      {d.source.replace("sevastack_", "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
