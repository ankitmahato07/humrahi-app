"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";

/** Save free-text notes on a donor/member (call outcomes, tags, context). */
export async function saveDonorNotes(id: string, notes: string) {
  const { user, admin } = await requireAdmin();
  const clean = notes.slice(0, 4000);

  const { data: before } = await admin
    .from("humrahis")
    .select("notes")
    .eq("id", id)
    .single();

  const { error } = await admin.from("humrahis").update({ notes: clean }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "update_donor_notes",
    entity: "humrahis",
    entity_id: id,
    before: before ?? null,
    after: { notes: clean },
  });

  revalidatePath("/admin/donors");
  return { ok: true };
}
