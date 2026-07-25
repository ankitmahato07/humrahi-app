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
