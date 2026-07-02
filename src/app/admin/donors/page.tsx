import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { DonorNotes } from "@/components/admin/DonorNotes";

export const metadata: Metadata = { title: "Donors" };

type DonorRow = {
  id: string;
  first_name: string | null;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  city: string;
  role: string;
  consent_recognition: boolean;
  joined_at: string;
  notes: string | null;
};

type DonationRow = {
  humrahi_id: string | null;
  amount_inr: number;
  designation: string;
  donated_at: string;
  is_recurring: boolean;
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function DonorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { admin } = await requireAdmin();
  const { q } = await searchParams;
  const search = (q ?? "").trim();

  const { data: humrahisData } = await admin
    .from("humrahis")
    .select("id, first_name, display_name, phone, email, city, role, consent_recognition, joined_at, notes")
    .order("joined_at", { ascending: false });
  const humrahis = (humrahisData ?? []) as DonorRow[];

  const { data: donationsData } = await admin
    .from("donations")
    .select("humrahi_id, amount_inr, designation, donated_at, is_recurring");
  const donations = (donationsData ?? []) as DonationRow[];

  // Aggregate donations per linked donor.
  const byDonor = new Map<string, { total: number; count: number; last: string; recurring: boolean }>();
  for (const d of donations) {
    if (!d.humrahi_id) continue;
    const cur = byDonor.get(d.humrahi_id) ?? { total: 0, count: 0, last: "", recurring: false };
    cur.total += Number(d.amount_inr);
    cur.count += 1;
    if (d.donated_at > cur.last) cur.last = d.donated_at;
    if (d.is_recurring) cur.recurring = true;
    byDonor.set(d.humrahi_id, cur);
  }

  const unclaimed = donations.filter((d) => !d.humrahi_id);
  const unclaimedTotal = unclaimed.reduce((s, d) => s + Number(d.amount_inr), 0);
  const totalRaised = donations.reduce((s, d) => s + Number(d.amount_inr), 0);

  const term = search.toLowerCase();
  const filtered = term
    ? humrahis.filter(
        (h) =>
          (h.first_name ?? "").toLowerCase().includes(term) ||
          (h.display_name ?? "").toLowerCase().includes(term) ||
          (h.phone ?? "").includes(term) ||
          (h.email ?? "").toLowerCase().includes(term)
      )
    : humrahis;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-lora text-2xl text-ink">Donors &amp; members</h1>
        <p className="text-sm text-soft mt-1">
          Everyone who has signed in as a Humrahi, with their giving history. Donation records
          are synced from Seva Stack — this is a read view.
        </p>
      </div>

      {/* summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Stat label="Members" value={String(humrahis.length)} />
        <Stat label="Raised (linked)" value={inr(totalRaised - unclaimedTotal)} />
        <Stat label="Total raised" value={inr(totalRaised)} />
        <Stat
          label="Unclaimed gifts"
          value={`${unclaimed.length}`}
          sub={unclaimed.length ? `${inr(unclaimedTotal)} not yet linked` : "all linked"}
        />
      </div>

      {/* search */}
      <form method="get" className="mb-6 flex gap-2 max-w-md">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search by name, phone, or email"
          className="flex-1 text-sm rounded-card border border-taupe/50 bg-white px-3 py-2 text-ink placeholder:text-taupe focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          className="text-sm px-4 py-2 rounded-card bg-ink text-white hover:bg-soft transition-colors"
        >
          Search
        </button>
        {search && (
          <Link
            href="/admin/donors"
            className="text-sm px-4 py-2 rounded-card border border-taupe/50 text-soft hover:border-ink transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-taupe/40 bg-whisper p-10 text-center">
          <p className="text-soft">{search ? "No donors match that search." : "No members yet."}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((h) => {
            const agg = byDonor.get(h.id);
            const name = h.display_name || h.first_name || "Unnamed";
            return (
              <div
                key={h.id}
                className="rounded-card border border-taupe/40 bg-white shadow-card p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-lora text-lg text-ink leading-tight">{name}</h3>
                    <p className="text-xs text-taupe-dark mt-0.5">
                      {h.city} · joined {fmtDate(h.joined_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {h.role !== "humrahi" && (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-card bg-sand text-taupe-dark">
                        {h.role}
                      </span>
                    )}
                    {agg?.recurring && (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-card bg-red/10 text-red">
                        recurring
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-soft space-y-1">
                  {h.phone && (
                    <div>
                      <span className="text-taupe-dark">Phone:</span>{" "}
                      <a className="text-red hover:underline" href={`tel:${h.phone}`}>
                        {h.phone}
                      </a>
                    </div>
                  )}
                  {h.email && (
                    <div>
                      <span className="text-taupe-dark">Email:</span>{" "}
                      <a className="text-red hover:underline" href={`mailto:${h.email}`}>
                        {h.email}
                      </a>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-taupe/20 pt-3 text-center">
                  <div>
                    <div className="font-lora text-lg text-ink">{agg ? inr(agg.total) : "₹0"}</div>
                    <div className="text-[11px] text-taupe-dark">lifetime</div>
                  </div>
                  <div>
                    <div className="font-lora text-lg text-ink">{agg?.count ?? 0}</div>
                    <div className="text-[11px] text-taupe-dark">gifts</div>
                  </div>
                  <div>
                    <div className="font-lora text-sm text-ink pt-1">
                      {agg?.last ? fmtDate(agg.last) : "—"}
                    </div>
                    <div className="text-[11px] text-taupe-dark">last gift</div>
                  </div>
                </div>

                <div className="text-xs text-taupe-dark">
                  Recognition wall:{" "}
                  <span className={h.consent_recognition ? "text-red" : "text-soft"}>
                    {h.consent_recognition ? "opted in" : "not opted in"}
                  </span>
                </div>

                <DonorNotes id={h.id} initial={h.notes} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border border-taupe/40 bg-white shadow-card p-4">
      <div className="text-xs text-taupe-dark">{label}</div>
      <div className="font-lora text-xl text-ink mt-1">{value}</div>
      {sub && <div className="text-[11px] text-taupe-dark mt-0.5">{sub}</div>}
    </div>
  );
}
