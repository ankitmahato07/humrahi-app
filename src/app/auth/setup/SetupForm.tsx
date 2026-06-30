"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

interface SetupFormProps {
  userId: string;
  phone: string;
  next: string;
  intent: string | null;
}

export function SetupForm({ userId, phone, next }: SetupFormProps) {
  const [firstName, setFirstName] = useState("");
  const [city, setCity] = useState("Siliguri");
  const [consentRecognition, setConsentRecognition] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("Please tell us your name.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error: upsertError } = await supabase.from("humrahis").upsert({
      id: userId,
      phone,
      first_name: firstName.trim(),
      display_name: firstName.trim(),
      city: city.trim() || "Siliguri",
      consent_recognition: consentRecognition,
      consent_marketing: consentMarketing,
      role: "humrahi",
    });

    if (upsertError) {
      setError(upsertError.message);
      setLoading(false);
      return;
    }

    // Record consents separately for the audit trail
    const consentRows = [
      { humrahi_id: userId, type: "recognition", granted: consentRecognition, granted_at: consentRecognition ? new Date().toISOString() : null },
      { humrahi_id: userId, type: "marketing", granted: consentMarketing, granted_at: consentMarketing ? new Date().toISOString() : null },
    ];
    await supabase.from("consents").upsert(consentRows, { onConflict: "humrahi_id,type" });

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-whisper rounded-card shadow-card p-6 space-y-5" noValidate>
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-ink mb-1.5">
          First name
        </label>
        <input
          id="firstName"
          type="text"
          autoComplete="given-name"
          autoFocus
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Ananya"
          className="w-full border border-taupe rounded-lg px-4 py-3 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-red focus:ring-offset-1"
          required
        />
      </div>

      <div>
        <label htmlFor="city" className="block text-sm font-medium text-ink mb-1.5">
          Your city <span className="text-taupe-dark font-normal">(optional)</span>
        </label>
        <input
          id="city"
          type="text"
          autoComplete="address-level2"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Siliguri"
          className="w-full border border-taupe rounded-lg px-4 py-3 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-red focus:ring-offset-1"
        />
      </div>

      {/* Consent toggles — separate, explicit, defaults private */}
      <fieldset className="space-y-3 pt-1">
        <legend className="text-xs font-semibold text-taupe-dark uppercase tracking-wider">
          Your preferences
        </legend>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={consentRecognition}
            onChange={(e) => setConsentRecognition(e.target.checked)}
            className="mt-0.5 accent-red w-4 h-4 flex-shrink-0"
          />
          <span className="text-sm text-soft leading-relaxed">
            Show my first name on the "Humrahis this month" wall
            <span className="block text-xs text-taupe-dark mt-0.5">
              Other Humrahis see only your first name — never your giving amount.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentMarketing}
            onChange={(e) => setConsentMarketing(e.target.checked)}
            className="mt-0.5 accent-red w-4 h-4 flex-shrink-0"
          />
          <span className="text-sm text-soft leading-relaxed">
            Send me occasional updates about our work
            <span className="block text-xs text-taupe-dark mt-0.5">
              A few messages a year. You can change this anytime.
            </span>
          </span>
        </label>
      </fieldset>

      {error && <p role="alert" className="text-red text-xs">{error}</p>}

      <Button type="submit" className="w-full" loading={loading}>
        Join as a Humrahi
      </Button>

      <p className="text-xs text-taupe-dark text-center leading-relaxed">
        By joining you agree to our{" "}
        <a href="https://www.myhumrahi.org/privacy.html" className="underline hover:text-red" target="_blank" rel="noopener">
          privacy policy
        </a>
        . Your data is held only for the purposes above.
      </p>
    </form>
  );
}
