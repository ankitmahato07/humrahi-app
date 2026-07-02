"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

interface LoginFormProps {
  next: string;
  intent: string | null;
}

// Launch auth: email magic-link. No SMS. (WhatsApp OTP is the planned
// fast-follow once the API is provisioned — see docs/whatsapp-otp.md.)
export function LoginForm({ next, intent }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    // The magic link lands on /auth/callback, which exchanges the code and
    // routes new users to profile setup. Forward next + intent through it.
    const params = new URLSearchParams({ next });
    if (intent) params.set("intent", intent);
    const emailRedirectTo = `${window.location.origin}/auth/callback?${params.toString()}`;

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo, shouldCreateUser: true },
    });

    if (otpError) {
      setError(otpError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="bg-whisper rounded-card shadow-card p-6 text-center">
        <h2 className="font-lora text-xl text-ink mb-2">Check your inbox</h2>
        <p className="text-sm text-soft leading-relaxed">
          We've sent a sign-in link to{" "}
          <strong className="text-ink">{email.trim().toLowerCase()}</strong>.
          Open it on this device to continue. The link expires in an hour.
        </p>
        <button
          type="button"
          onClick={() => { setSent(false); setError(null); }}
          className="mt-4 text-xs text-taupe-dark underline hover:text-red transition-colors"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="bg-whisper rounded-card shadow-card p-6">
      <form onSubmit={handleSendLink} noValidate>
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-inter font-medium text-ink mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-taupe rounded-lg px-4 py-3 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-red focus:ring-offset-1 placeholder:text-taupe"
            required
            aria-describedby={error ? "email-error" : undefined}
          />
        </div>

        {error && (
          <p id="email-error" role="alert" className="text-red text-xs mb-3">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          Email me a sign-in link
        </Button>

        <p className="text-xs text-taupe-dark text-center mt-3 leading-relaxed">
          No passwords. We'll email you a secure link to sign in.
        </p>
      </form>
    </div>
  );
}
