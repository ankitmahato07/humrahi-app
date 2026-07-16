"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { safeNext } from "@/lib/safeNext";

interface SetupFormProps {
  userId: string;
  phone: string;
  email: string;
  next: string;
  intent: string | null;
}

// First-login profile setup — writes the `profiles` row (same fields as the
// static site's account.html). full_name gates the callback redirect, so it's
// required here.
export function SetupForm({ userId, phone, next }: SetupFormProps) {
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<"individual" | "organisation">("individual");
  const [orgName, setOrgName] = useState("");
  const [wantsUpdates, setWantsUpdates] = useState(true);
  const [wantsWhatsapp, setWantsWhatsapp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Please tell us your name.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      account_type: accountType,
      org_name: accountType === "organisation" ? orgName.trim() || null : null,
      wants_updates: wantsUpdates,
      wants_whatsapp: wantsWhatsapp,
    });

    if (upsertError) {
      setError(upsertError.message);
      setLoading(false);
      return;
    }

    router.push(safeNext(next));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-whisper rounded-card shadow-card p-6 space-y-5" noValidate>
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-ink mb-1.5">
          Your name
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          autoFocus
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ananya Sharma"
          className="w-full border border-taupe rounded-lg px-4 py-3 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-red focus:ring-offset-1"
          required
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-taupe-dark uppercase tracking-wider mb-1">
          You're giving as
        </legend>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-soft">
          <input type="radio" name="account_type" value="individual" checked={accountType === "individual"}
            onChange={() => setAccountType("individual")} className="accent-red" />
          An individual
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-soft">
          <input type="radio" name="account_type" value="organisation" checked={accountType === "organisation"}
            onChange={() => setAccountType("organisation")} className="accent-red" />
          A company / organisation
        </label>
      </fieldset>

      {accountType === "organisation" && (
        <div>
          <label htmlFor="orgName" className="block text-sm font-medium text-ink mb-1.5">
            Organisation name
          </label>
          <input
            id="orgName"
            type="text"
            autoComplete="organization"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Company, NGO or institution name"
            className="w-full border border-taupe rounded-lg px-4 py-3 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-red focus:ring-offset-1"
          />
        </div>
      )}

      <fieldset className="space-y-3 pt-1">
        <legend className="text-xs font-semibold text-taupe-dark uppercase tracking-wider">
          Staying in touch
        </legend>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={wantsUpdates} onChange={(e) => setWantsUpdates(e.target.checked)}
            className="mt-0.5 accent-red w-4 h-4 flex-shrink-0" />
          <span className="text-sm text-soft leading-relaxed">
            Send me occasional updates about our work
            <span className="block text-xs text-taupe-dark mt-0.5">A few messages a year. Change anytime.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={wantsWhatsapp} onChange={(e) => setWantsWhatsapp(e.target.checked)}
            className="mt-0.5 accent-red w-4 h-4 flex-shrink-0" />
          <span className="text-sm text-soft leading-relaxed">
            Send me drive alerts on WhatsApp
            <span className="block text-xs text-taupe-dark mt-0.5">Only when something's happening on the ground.</span>
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
