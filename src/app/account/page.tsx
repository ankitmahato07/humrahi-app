import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/ui/AppNav";
import { AccountForm, type AccountProfile } from "./AccountForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, account_type, org_name, wants_updates, wants_whatsapp")
    .eq("id", user.id)
    .single();

  if (!profile?.full_name) redirect("/auth/setup");

  // data_requests table is unchanged (keyed on humrahi_id = the auth user id).
  const { data: pendingRequests } = await supabase
    .from("data_requests")
    .select("type, status, created_at")
    .eq("humrahi_id", user.id)
    .neq("status", "resolved")
    .order("created_at", { ascending: false });

  const firstName = (profile.full_name ?? "").trim().split(/\s+/)[0] || null;

  return (
    <>
      <AppNav userName={firstName} />
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-lora text-2xl text-ink mb-1">Your account</h1>
        <span className="block w-8 h-0.5 bg-red mb-8" aria-hidden="true" />
        <AccountForm profile={profile as AccountProfile} pendingRequests={pendingRequests ?? []} />
      </main>
    </>
  );
}
