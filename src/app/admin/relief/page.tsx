import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  ReliefConsole,
  type ReliefBeneficiary,
  type ReliefPledge,
} from "./ReliefConsole";

export const metadata: Metadata = { title: "Assam flood relief" };

export default async function AdminReliefPage() {
  const { admin } = await requireAdmin();

  const [{ data: pledges }, { data: beneficiaries }] = await Promise.all([
    admin
      .from("relief_pledges")
      .select(
        "id, created_at, name, phone, email, city, items, note, status, synced_to_sevastack_at"
      )
      .order("created_at", { ascending: false }),
    admin
      .from("relief_beneficiaries")
      .select(
        "id, created_at, name, phone, village, district, household_size, items_given, distributed_on, notes, recorded_by, synced_to_sevastack_at"
      )
      .order("distributed_on", { ascending: false }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-lora text-2xl text-ink">Assam flood relief</h1>
        <p className="mt-1 text-sm text-soft">
          Goods collection in Siliguri. Money donations reach Seva Stack on their own — these two
          lists are what needs typing in. Weekly: export or copy the unsynced rows, enter them in the
          Seva Stack dashboard under <strong>Assam Flood Relief 2026</strong>, then mark them synced.
          Runbook: <code>SEVASTACK-ASSAM-RUNBOOK.md</code>.
        </p>
      </div>

      <ReliefConsole
        pledges={(pledges ?? []) as ReliefPledge[]}
        beneficiaries={(beneficiaries ?? []) as ReliefBeneficiary[]}
      />
    </div>
  );
}
