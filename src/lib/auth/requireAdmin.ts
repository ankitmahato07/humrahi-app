import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Gate for all /admin server code. The single source of truth for "admin" is
 * the humrahis.role column — not app_metadata, not a JWT hook. It confirms the
 * caller is signed in AND an admin, then hands back a service-role client for
 * privileged reads/writes.
 *
 * The service-role client is only returned AFTER the caller's admin identity is
 * verified server-side, and it never reaches the browser. This is what lets the
 * admin panel read donor data even though RLS locks that data to anon/normal
 * users.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("humrahis")
    .select("id, first_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/");

  return { user, admin, profile };
}
