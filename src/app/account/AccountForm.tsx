"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, EyebrowLabel } from "@/components/ui/Card";
import type { Humrahi } from "@/types/database";
import { useRouter } from "next/navigation";

interface AccountFormProps {
  profile: Humrahi;
  pendingRequests: { type: string; status: string; created_at: string }[];
}

export function AccountForm({ profile, pendingRequests }: AccountFormProps) {
  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [city, setCity] = useState(profile.city);
  const [consentRecognition, setConsentRecognition] = useState(profile.consent_recognition);
  const [consentMarketing, setConsentMarketing] = useState(profile.consent_marketing);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [requestType, setRequestType] = useState<"access" | "erasure" | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestDone, setRequestDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from("humrahis").update({
      first_name: firstName.trim(),
      display_name: firstName.trim(),
      city: city.trim(),
      consent_recognition: consentRecognition,
      consent_marketing: consentMarketing,
    }).eq("id", profile.id);

    // Update consent audit trail
    await supabase.from("consents").upsert([
      { humrahi_id: profile.id, type: "recognition", granted: consentRecognition, granted_at: consentRecognition ? new Date().toISOString() : null, revoked_at: !consentRecognition ? new Date().toISOString() : null },
      { humrahi_id: profile.id, type: "marketing", granted: consentMarketing, granted_at: consentMarketing ? new Date().toISOString() : null, revoked_at: !consentMarketing ? new Date().toISOString() : null },
    ], { onConflict: "humrahi_id,type" });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  async function handleDataRequest(type: "access" | "erasure") {
    setRequestType(type);
    setRequestLoading(true);
    await supabase.from("data_requests").insert({
      humrahi_id: profile.id,
      type,
      status: "pending",
    });
    setRequestLoading(false);
    setRequestDone(true);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div className="space-y-8">
      {/* Profile */}
      <Card>
        <EyebrowLabel>Profile</EyebrowLabel>
        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-ink mb-1.5">First name</label>
            <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-taupe rounded-lg px-4 py-2.5 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-red focus:ring-offset-1" />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-ink mb-1.5">City</label>
            <input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)}
              className="w-full border border-taupe rounded-lg px-4 py-2.5 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-red focus:ring-offset-1" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink mb-2">Phone</p>
            <p className="text-sm text-soft">{profile.phone} <span className="text-taupe-dark text-xs">(cannot change)</span></p>
          </div>
          <Button type="submit" loading={saving} size="sm">
            {saved ? "Saved ✓" : "Save changes"}
          </Button>
        </form>
      </Card>

      {/* Privacy preferences */}
      <Card id="recognition">
        <EyebrowLabel>Privacy preferences</EyebrowLabel>
        <div className="space-y-4 mt-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={consentRecognition} onChange={(e) => setConsentRecognition(e.target.checked)}
              className="mt-0.5 accent-red w-4 h-4 flex-shrink-0" />
            <span className="text-sm text-soft leading-relaxed">
              Show my first name on the Humrahis wall
              <span className="block text-xs text-taupe-dark mt-0.5">Other Humrahis see your first name. Never your amount.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={consentMarketing} onChange={(e) => setConsentMarketing(e.target.checked)}
              className="mt-0.5 accent-red w-4 h-4 flex-shrink-0" />
            <span className="text-sm text-soft leading-relaxed">
              Occasional updates about our work
              <span className="block text-xs text-taupe-dark mt-0.5">A few times a year. Never spam.</span>
            </span>
          </label>
          <Button onClick={handleSave} loading={saving} size="sm" variant="ghost">
            {saved ? "Saved ✓" : "Update preferences"}
          </Button>
        </div>
      </Card>

      {/* DPDP data rights */}
      <Card>
        <EyebrowLabel>Your data rights</EyebrowLabel>
        <p className="text-sm text-soft mt-2 mb-4 leading-relaxed">
          Under the Digital Personal Data Protection Act, you can request a copy of your data or ask us to erase it.
          We'll respond to your request within 30 days.
        </p>

        {pendingRequests.length > 0 && (
          <div className="mb-4 p-3 bg-sand rounded-lg">
            <p className="text-xs font-medium text-ink mb-1">Pending requests</p>
            {pendingRequests.map((r, i) => (
              <p key={i} className="text-xs text-soft">
                {r.type === "access" ? "Data access" : "Erasure"} — {r.status} ·{" "}
                {new Date(r.created_at).toLocaleDateString("en-IN")}
              </p>
            ))}
          </div>
        )}

        {requestDone ? (
          <p className="text-sm text-ink">
            Your request has been received. We'll write to you at <strong>wecare@myhumrahi.org</strong> within 30 days.
          </p>
        ) : (
          <div className="flex gap-3 flex-wrap">
            <Button size="sm" variant="ghost" loading={requestLoading && requestType === "access"}
              onClick={() => handleDataRequest("access")}>
              Request my data
            </Button>
            <Button size="sm" variant="outline" loading={requestLoading && requestType === "erasure"}
              onClick={() => handleDataRequest("erasure")}>
              Request erasure
            </Button>
          </div>
        )}
      </Card>

      {/* Sign out */}
      <div className="pt-2">
        <button onClick={handleSignOut} className="text-sm text-taupe-dark underline hover:text-red transition-colors">
          Sign out
        </button>
      </div>
    </div>
  );
}
