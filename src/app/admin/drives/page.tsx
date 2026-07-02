import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Drives" };

export default async function DrivesPage() {
  await requireAdmin();
  return (
    <ComingSoon
      title="Drives"
      description="Create and manage the monthly Siliguri cohort and specific drives."
      planned={[
        "Create a monthly cohort or a one-off drive (e.g. Winter Blanket Drive)",
        "Set a goal amount and start/end dates",
        "Activate a drive so it appears on donor dashboards",
        "Watch contributions roll up automatically as donations sync",
      ]}
    />
  );
}
