import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-screen bg-cloud">
      <AdminNav userName={profile?.first_name ?? "Admin"} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </div>
    </div>
  );
}
