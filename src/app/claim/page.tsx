import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/ui/AppNav";
import { ClaimForm } from "./ClaimForm";

export const metadata: Metadata = { title: "Claim your gift" };

export default async function ClaimPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/claim");

  const { data: profile } = await supabase
    .from("humrahis")
    .select("first_name")
    .eq("id", user.id)
    .single();

  return (
    <>
      <AppNav userName={profile?.first_name ?? null} />
      <main className="max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="font-lora text-2xl text-ink">Claim your gift</h1>
          <p className="text-sm text-soft mt-2 leading-relaxed">
            Gave before you signed in? Link that donation to your Humrahi home to see the
            meal it becomes — and keep your 80G receipts in one place.
          </p>
        </div>
        <ClaimForm />
      </main>
    </>
  );
}
