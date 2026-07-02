import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  await requireAdmin();
  return (
    <ComingSoon
      title="Content"
      description="Edit words and numbers on the public site without touching code."
      planned={[
        "Donation amounts, UPI ID, QR image, bank details",
        "Homepage impact numbers and 'ways we work' cards",
        "Team members, press mentions, FAQ answers",
        "Impact conversion rates (cost per meal, etc.)",
      ]}
    />
  );
}
