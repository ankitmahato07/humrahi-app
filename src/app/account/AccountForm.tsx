"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, EyebrowLabel } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

export type AccountProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  account_type: string | null;
  org_name: string | null;
  wants_updates: boolean;
  wants_whatsapp: boolean;
};

interface AccountFormProps {
  profile: AccountProfile;
  pendingRequests: { type: string; status: string; created_at: string }[];
}

export function AccountForm({ profile, pendingRequests }: AccountFormProps) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [accountType, setAccountType] = useState<"individual" | "organisation">(
    profile.account_type === "organisation" ? "organisation" : "individual"
  );
  const [orgName, setOrgName] = useState(profile.org_name ?? "");
  const [wantsUpdates, setWantsUpdates] = useState(profile.wants_updates);
  const [wantsWhatsapp, setWantsWhatsapp] = useState(profile.wants_whatsapp);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [requestType, setRequestType] = useState<"access" | "erasure" | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestDone, setRequestDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    await supabase.from("profiles").update({
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      account_type: accountType,
      org_name: accountType === "organisation" ? orgName.trim() || null : null,
      wants_updates: wantsUpdates,
      wants_whatsapp: wantsWhatsapp,
    }).eq("id", profile.id);

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
            <label htmlFor="fullName" className="block text-sm font-medium text-ink mb-1.5">Name</label>
            <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-taupe rounded-lg px-4 py-2.5 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-red focus:ring-offset-1" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-ink mb-1.5">Phone</label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 …"
              className="w-full border border-taupe rounded-lg px-4 py-2.5 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-red focus:ring-offset-1" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink mb-1">You're giving as</legend>
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
              <label htmlFor="orgName" className="block text-sm font-medium text-ink mb-1.5">Organisation name</label>
              <input id="orgName" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                className="w-full border border-taupe rounded-lg px-4 py-2.5 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-red focus:ring-offset-1" />
            </div>
          )}
          <Button type="submit" loading={saving} size="sm">
            {saved ? "Saved ✓" : "Save changes"}
          </Button>
        </form>
      </Card>

      {/* Preferences */}
      <Card>
        <EyebrowLabel>Staying in touch</EyebrowLabel>
        <div className="space-y-4 mt-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={wantsUpdates} onChange={(e) => setWantsUpdates(e.target.checked)}
              className="mt-0.5 accent-red w-4 h-4 flex-shrink-0" />
            <span className="text-sm text-soft leading-relaxed">
              Occasional updates about our work
              <span className="block text-xs text-taupe-dark mt-0.5">A few times a year. Never spam.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={wantsWhatsapp} onChange={(e) => setWantsWhatsapp(e.target.checked)}
              className="mt-0.5 accent-red w-4 h-4 flex-shrink-0" />
            <span className="text-sm text-soft leading-relaxed">
              Drive alerts on WhatsApp
              <span className="block text-xs text-taupe-dark mt-0.5">Only when something's happening on the ground.</span>
            </span>
          </label>
          <Button onClick={() => handleSave()} loading={saving} size="sm" variant="ghost">
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
