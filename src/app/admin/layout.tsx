import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/admin");

  const role = (user.app_metadata as Record<string, string>)?.role;
  if (role !== "admin") redirect("/");

  const { data: profile } = await supabase
    .from("humrahis")
    .select("first_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-cloud">
      <AdminNav userName={profile?.first_name ?? "Admin"} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </div>
    </div>
  );
}
