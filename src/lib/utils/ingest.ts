// Donation ingestion interface — a single swappable normalizer so the data
// source (Sevastack API / CSV export / manual admin entry) can change without
// touching the dashboard.

import { createAdminClient } from "@/lib/supabase/server";
import type { DonationSource } from "@/types/database";

export interface RawDonationRecord {
  external_id: string;         // Sevastack receipt / txn id — idempotency key
  donor_phone?: string | null;
  donor_email?: string | null;
  amount_inr: number;
  donated_at: string;          // ISO 8601
  designation?: "meals" | "health" | "school" | "general";
  is_recurring?: boolean;
  source: DonationSource;
  raw?: Record<string, unknown>;
}

// Normalises any source into the donations table.
// Idempotent on external_id (upsert does nothing on conflict).
// Attempts to link to a humrahi by donor_phone.
export async function ingestDonation(record: RawDonationRecord): Promise<{
  inserted: boolean;
  humrahi_linked: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  // Resolve humrahi_id by phone
  let humrahi_id: string | null = null;
  if (record.donor_phone) {
    const normPhone = normalisePhone(record.donor_phone);
    const { data: humrahi } = await supabase
      .from("humrahis")
      .select("id")
      .eq("phone", normPhone)
      .single();
    humrahi_id = humrahi?.id ?? null;
  }

  const { error } = await supabase.from("donations").upsert(
    {
      humrahi_id,
      donor_phone: record.donor_phone ? normalisePhone(record.donor_phone) : null,
      donor_email: record.donor_email ?? null,
      amount_inr: record.amount_inr,
      donated_at: record.donated_at,
      designation: record.designation ?? "general",
      is_recurring: record.is_recurring ?? false,
      source: record.source,
      external_id: record.external_id,
      raw: record.raw ?? {},
    },
    { onConflict: "external_id", ignoreDuplicates: true }
  );

  if (error) return { inserted: false, humrahi_linked: false, error: error.message };

  // Update drive_participation if there's an active monthly_cohort
  if (humrahi_id) {
    const { data: cohort } = await supabase
      .from("drives")
      .select("id")
      .eq("type", "monthly_cohort")
      .eq("status", "active")
      .lte("starts_at", record.donated_at)
      .or(`ends_at.is.null,ends_at.gte.${record.donated_at}`)
      .single();

    if (cohort) {
      await supabase.from("drive_participation").upsert(
        {
          drive_id: cohort.id,
          humrahi_id,
          contributed_amount_inr: record.amount_inr,
        },
        { onConflict: "drive_id,humrahi_id" }
      );
    }
  }

  return { inserted: true, humrahi_linked: humrahi_id !== null };
}

// Claims an anonymous donation by linking it to the signing-in user.
// Called when a new Humrahi enters a receipt number or email to claim a gift.
export async function claimDonation(
  humrahiId: string,
  claim: { external_id?: string; donor_email?: string }
): Promise<{ claimed: boolean; count: number }> {
  const supabase = createAdminClient();

  if (!claim.external_id && !claim.donor_email) {
    return { claimed: false, count: 0 };
  }

  const query = supabase
    .from("donations")
    .update({ humrahi_id: humrahiId })
    .is("humrahi_id", null);

  if (claim.external_id) {
    query.eq("external_id", claim.external_id);
  } else if (claim.donor_email) {
    query.eq("donor_email", claim.donor_email.toLowerCase());
  }

  const { count, error } = await query.select("id", { count: "exact", head: true });

  if (error) return { claimed: false, count: 0 };
  return { claimed: true, count: count ?? 0 };
}

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}
