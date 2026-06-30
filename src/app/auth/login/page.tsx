import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { HeldHeart } from "@/components/ui/HeldHeart";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with your phone number to see your Humrahi impact.",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; intent?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next ?? "/";
  const intent = params.intent ?? null;

  return (
    <main className="min-h-screen bg-cloud flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-10">
          <HeldHeart size={48} />
          <h1 className="font-lora text-2xl text-ink mt-4 text-center leading-snug">
            Become a Humrahi
          </h1>
          <p className="text-soft text-sm text-center mt-2 leading-relaxed">
            {intent === "claim"
              ? "Enter your phone number to claim your impact and watch the meal your gift becomes."
              : "Enter your phone number. We'll send a one-time code — no password needed."}
          </p>
        </div>

        <LoginForm next={next} intent={intent} />

        {/* Anonymous donation path — never gate generosity */}
        <p className="text-center text-xs text-taupe-dark mt-8">
          Want to give without signing in?{" "}
          <a
            href="https://www.myhumrahi.org/donate.html"
            className="underline hover:text-red transition-colors"
          >
            Donate anonymously ↗
          </a>
        </p>
      </div>
    </main>
  );
}
