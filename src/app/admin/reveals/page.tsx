import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Impact reveals" };

export default async function RevealsPage() {
  await requireAdmin();
  return (
    <ComingSoon
      title="Impact reveals"
      description="Publish the 'your gift became Tuesday's plates' moments donors see on their dashboard."
      planned={[
        "Upload a photo from the kitchen or camp",
        "Write a short, specific line (e.g. '312 plates, Siliguri, Tuesday')",
        "Send to everyone (broadcast) or to a specific donor",
        "Follow the dignity rules: food over faces, first names only with consent",
      ]}
    />
  );
}
