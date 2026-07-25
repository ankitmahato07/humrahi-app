import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { JobReadyTable, type JobReadySignup } from "./JobReadyTable";

export const metadata: Metadata = { title: "JobReady signups" };

export default async function AdminJobReadyPage() {
  const { admin } = await requireAdmin();

  const { data } = await admin
    .from("jobready_signups")
    .select(
      "id, created_at, full_name, whatsapp_phone, email, language, is_minor, guardian_consent, invited_to_sevastack, sevastack_registered_at"
    )
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as JobReadySignup[];
  const pending = rows.filter((r) => !r.invited_to_sevastack).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-lora text-2xl text-ink">JobReady signups</h1>
        <p className="mt-1 text-sm text-soft">
          Beneficiaries who signed up on /jobready for free Wadhwani skilling.{" "}
          {pending} awaiting a Seva Stack invite. Copy the bulk lines, create the
          invites in Seva Stack, then mark those rows invited.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-card border border-taupe/40 bg-whisper p-10 text-center">
          <p className="text-soft">No JobReady signups yet.</p>
        </div>
      ) : (
        <JobReadyTable rows={rows} />
      )}
    </div>
  );
}
