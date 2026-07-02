import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Compliance" };

export default async function CompliancePage() {
  await requireAdmin();
  return (
    <ComingSoon
      title="Compliance"
      description="DPDP data requests, reconciliation, and the audit trail."
      planned={[
        "Handle data access / erasure requests (30-day window)",
        "Review daily reconciliation against Seva Stack totals",
        "Read the immutable audit log of admin actions on donor data",
      ]}
    />
  );
}
