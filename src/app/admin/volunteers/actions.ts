"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import type { EnquiryStatus } from "@/types/database";

const STATUSES: EnquiryStatus[] = ["New", "Contacted", "Active", "Closed"];

/** Move an enquiry along the pipeline (New → Contacted → Active → Closed). */
export async function updateEnquiryStatus(id: string, status: EnquiryStatus) {
  if (!STATUSES.includes(status)) return { ok: false, error: "invalid_status" };
  const { user, admin } = await requireAdmin();

  const { data: before } = await admin
    .from("enquiries")
    .select("status")
    .eq("id", id)
    .single();

  const { error } = await admin.from("enquiries").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "update_enquiry_status",
    entity: "enquiries",
    entity_id: id,
    before: before ?? null,
    after: { status },
  });

  revalidatePath("/admin/volunteers");
  return { ok: true };
}

/** Save free-text notes on an enquiry (e.g. call outcomes). */
export async function saveEnquiryNotes(id: string, notes: string) {
  const { user, admin } = await requireAdmin();
  const clean = notes.slice(0, 4000);

  const { data: before } = await admin
    .from("enquiries")
    .select("notes")
    .eq("id", id)
    .single();

  const { error } = await admin.from("enquiries").update({ notes: clean }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "update_enquiry_notes",
    entity: "enquiries",
    entity_id: id,
    before: before ?? null,
    after: { notes: clean },
  });

  revalidatePath("/admin/volunteers");
  return { ok: true };
}
