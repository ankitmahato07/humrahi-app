import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/ui/AppNav";
import { AccountForm } from "./AccountForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("humrahis")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/setup");

  const { data: pendingRequests } = await supabase
    .from("data_requests")
    .select("type, status, created_at")
    .eq("humrahi_id", user.id)
    .neq("status", "resolved")
    .order("created_at", { ascending: false });

  return (
    <>
      <AppNav userName={profile.first_name} />
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-lora text-2xl text-ink mb-1">Your account</h1>
        <span className="block w-8 h-0.5 bg-red mb-8" aria-hidden="true" />
        <AccountForm profile={profile} pendingRequests={pendingRequests ?? []} />
      </main>
    </>
  );
}
