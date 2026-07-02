import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import type { Enquiry, EnquiryStatus } from "@/types/database";
import { EnquiryCard } from "@/components/admin/EnquiryCard";

export const metadata: Metadata = { title: "Volunteers & enquiries" };

const STATUSES: EnquiryStatus[] = ["New", "Contacted", "Active", "Closed"];

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { admin } = await requireAdmin();
  const { status } = await searchParams;
  const activeFilter = STATUSES.includes(status as EnquiryStatus)
    ? (status as EnquiryStatus)
    : null;

  let query = admin.from("enquiries").select("*").order("created_at", { ascending: false });
  if (activeFilter) query = query.eq("status", activeFilter);
  const { data: enquiries } = await query;

  const { data: allForCounts } = await admin.from("enquiries").select("status");
  const counts = STATUSES.reduce(
    (acc, s) => {
      acc[s] = (allForCounts ?? []).filter((e: { status: EnquiryStatus }) => e.status === s).length;
      return acc;
    },
    {} as Record<EnquiryStatus, number>
  );
  const total = allForCounts?.length ?? 0;
  const list = (enquiries ?? []) as Enquiry[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-lora text-2xl text-ink">Volunteers &amp; enquiries</h1>
        <p className="text-sm text-soft mt-1">
          Every volunteer, contact, and enquiry from the website lands here. Work them
          New → Contacted → Active → Closed.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <FilterTab href="/admin/volunteers" label="All" count={total} active={!activeFilter} />
        {STATUSES.map((s) => (
          <FilterTab
            key={s}
            href={`/admin/volunteers?status=${s}`}
            label={s}
            count={counts[s]}
            active={activeFilter === s}
          />
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-card border border-taupe/40 bg-whisper p-10 text-center">
          <p className="text-soft">
            {activeFilter ? `No ${activeFilter.toLowerCase()} enquiries.` : "No enquiries yet."}
          </p>
          <p className="text-sm text-taupe-dark mt-2">
            When someone fills a form on myhumrahi.org, they&apos;ll appear here within seconds.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <EnquiryCard key={e.id} enquiry={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTab({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "px-3 py-1.5 rounded-card text-sm border transition-colors " +
        (active
          ? "bg-ink text-white border-ink"
          : "bg-white text-soft border-taupe/50 hover:border-ink")
      }
    >
      {label}{" "}
      <span className={active ? "text-white/70" : "text-taupe-dark"}>· {count}</span>
    </Link>
  );
}
