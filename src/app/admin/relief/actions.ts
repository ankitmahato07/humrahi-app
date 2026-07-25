"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const STATUSES = ["pledged", "received", "synced"] as const;
export type PledgeStatus = (typeof STATUSES)[number];

/** Advance (or reset) one pledge's status. 'synced' stamps
 *  synced_to_sevastack_at; anything else clears it back to NULL. */
export async function setPledgeStatus(id: string, status: PledgeStatus) {
  if (!id) return { ok: false, error: "no_id" };
  if (!STATUSES.includes(status)) return { ok: false, error: "invalid_status" };
  const { admin } = await requireAdmin();

  const { error } = await admin
    .from("relief_pledges")
    .update({
      status,
      synced_to_sevastack_at: status === "synced" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/relief");
  return { ok: true };
}

/** Set/clear synced_to_sevastack_at for one beneficiary row. */
export async function setBeneficiarySynced(id: string, synced: boolean) {
  if (!id) return { ok: false, error: "no_id" };
  const { admin } = await requireAdmin();

  const { error } = await admin
    .from("relief_beneficiaries")
    .update({ synced_to_sevastack_at: synced ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/relief");
  return { ok: true };
}

/** Record a relief distribution. Called from the intake form on /admin/relief;
 *  writes via the service role like every other admin mutation here. */
export async function addBeneficiary(input: {
  name: string;
  phone?: string;
  village?: string;
  district?: string;
  household_size?: string;
  items_given: string;
  distributed_on?: string;
  notes?: string;
}) {
  const { admin, profile } = await requireAdmin();

  const name = (input.name ?? "").trim();
  const items_given = (input.items_given ?? "").trim();
  if (!name) return { ok: false, error: "name_required" };
  if (!items_given) return { ok: false, error: "items_required" };

  const size = Number.parseInt(input.household_size ?? "", 10);

  const { error } = await admin.from("relief_beneficiaries").insert({
    name: name.slice(0, 200),
    phone: input.phone?.trim() || null,
    village: input.village?.trim() || null,
    district: input.district?.trim() || "Assam",
    household_size: Number.isFinite(size) && size > 0 ? size : null,
    items_given: items_given.slice(0, 2000),
    // Empty → let the column default (current_date) win.
    distributed_on: input.distributed_on?.trim() || undefined,
    notes: input.notes?.trim() || null,
    recorded_by: profile?.first_name ?? null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/relief");
  return { ok: true };
}
