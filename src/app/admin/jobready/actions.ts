"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";

/** Flip invited_to_sevastack → true for the given signup rows (after they've
 *  been copied into a Seva Stack bulk invite). */
export async function markInvited(ids: string[]) {
  if (!Array.isArray(ids) || ids.length === 0) return { ok: false, error: "no_ids" };
  const { admin } = await requireAdmin();

  const { error } = await admin
    .from("jobready_signups")
    .update({ invited_to_sevastack: true })
    .in("id", ids);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/jobready");
  return { ok: true };
}

/** Set/clear sevastack_registered_at for one signup. `registered=true` stamps
 *  now() (confirmed as a Seva Stack beneficiary → dashboard unlocks the Wadhwani
 *  enrolment link); `false` clears it back to NULL. */
export async function setSevastackRegistered(id: string, registered: boolean) {
  if (!id) return { ok: false, error: "no_id" };
  const { admin } = await requireAdmin();

  const { error } = await admin
    .from("jobready_signups")
    .update({ sevastack_registered_at: registered ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/jobready");
  return { ok: true };
}
