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

  async function handleGoogle() {
    setError(null);
    const params = new URLSearchParams({ next });
    if (intent) params.set("intent", intent);
    const redirectTo = `${window.location.origin}/auth/callback?${params.toString()}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (oauthError) {
      setError("Google sign-in isn't available right now — try the email link below.");
    }
  }

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
      {/* Continue with Google — white bg, sand border, serif label (matches the static site) */}
      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-3 bg-white border border-sand rounded-card px-4 py-3 font-lora text-sm text-ink transition-colors hover:border-red hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red focus-visible:ring-offset-1"
      >
        <svg viewBox="0 0 48 48" className="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5" aria-hidden="true">
        <span className="h-px flex-1 bg-sand" />
        <span className="text-xs text-taupe-dark uppercase tracking-wider">or</span>
        <span className="h-px flex-1 bg-sand" />
      </div>

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
