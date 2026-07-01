import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupForm } from "./SetupForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tell us your name" };

interface SetupPageProps {
  searchParams: Promise<{ next?: string; intent?: string }>;
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const next = params.next ?? "/";
  const intent = params.intent ?? null;

  return (
    <main className="min-h-screen bg-cloud flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-lora text-2xl text-ink text-center mb-2">
          One last thing
        </h1>
        <p className="text-soft text-sm text-center mb-8 leading-relaxed">
          What should we call you?
        </p>
        <SetupForm userId={user.id} phone={user.phone ?? ""} email={user.email ?? ""} next={next} intent={intent} />
      </div>
    </main>
  );
}
