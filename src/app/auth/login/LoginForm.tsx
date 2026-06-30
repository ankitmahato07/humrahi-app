"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

type Step = "phone" | "otp";

interface LoginFormProps {
  next: string;
  intent: string | null;
}

export function LoginForm({ next, intent }: LoginFormProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Normalise Indian phone: strip non-digits, prepend +91 if not present
  function normalisePhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normPhone = normalisePhone(phone);
    if (normPhone.length < 13) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      setLoading(false);
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: normPhone,
    });

    if (otpError) {
      setError(otpError.message);
    } else {
      setStep("otp");
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normPhone = normalisePhone(phone);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: normPhone,
      token: otp,
      type: "sms",
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Check if the humrahi profile exists; if new, redirect to profile setup
      const { data: profile } = await supabase
        .from("humrahis")
        .select("first_name")
        .eq("id", data.user.id)
        .single();

      if (!profile?.first_name) {
        const setupUrl = `/auth/setup?next=${encodeURIComponent(next)}${intent ? `&intent=${intent}` : ""}`;
        router.push(setupUrl);
      } else {
        router.push(next);
        router.refresh();
      }
    }
    setLoading(false);
  }

  return (
    <div className="bg-whisper rounded-card shadow-card p-6">
      {step === "phone" ? (
        <form onSubmit={handleSendOtp} noValidate>
          <div className="mb-4">
            <label
              htmlFor="phone"
              className="block text-sm font-inter font-medium text-ink mb-1.5"
            >
              Mobile number
            </label>
            <div className="flex items-center border border-taupe rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-red focus-within:ring-offset-1 bg-white">
              <span className="px-3 py-3 text-soft text-sm border-r border-taupe bg-cloud select-none">
                +91
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 px-3 py-3 text-sm text-ink bg-transparent outline-none placeholder:text-taupe"
                required
                maxLength={10}
                aria-describedby={error ? "phone-error" : undefined}
              />
            </div>
          </div>

          {error && (
            <p id="phone-error" role="alert" className="text-red text-xs mb-3">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Send one-time code
          </Button>

          <p className="text-xs text-taupe-dark text-center mt-3 leading-relaxed">
            We'll send a 6-digit code via SMS. Standard rates apply.
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} noValidate>
          <p className="text-sm text-soft mb-4">
            We sent a 6-digit code to{" "}
            <strong className="text-ink">+91 {phone}</strong>.
          </p>

          <div className="mb-4">
            <label
              htmlFor="otp"
              className="block text-sm font-inter font-medium text-ink mb-1.5"
            >
              One-time code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full border border-taupe rounded-lg px-4 py-3 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-red focus:ring-offset-1 tracking-widest text-center"
              required
              maxLength={6}
              aria-describedby={error ? "otp-error" : undefined}
            />
          </div>

          {error && (
            <p id="otp-error" role="alert" className="text-red text-xs mb-3">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>

          <button
            type="button"
            onClick={() => { setStep("phone"); setError(null); setOtp(""); }}
            className="w-full mt-3 text-xs text-taupe-dark underline hover:text-red transition-colors"
          >
            Wrong number? Go back
          </button>
        </form>
      )}
    </div>
  );
}
