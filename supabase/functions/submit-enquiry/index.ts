// ─────────────────────────────────────────────────────────────────────────────
// submit-enquiry — Supabase Edge Function (Deno)
//
// Receives volunteer / contact / newsletter submissions from the static site
// (Hostinger) and writes them into Supabase using the SERVICE ROLE. The anon
// key never has insert rights on these tables, so all writes go through here.
//
// Spam protection (launch-grade):
//   1. Honeypot — a hidden `bot-field`; if filled, silently accept + drop.
//   2. Cloudflare Turnstile — verify the token server-side (only enforced when
//      TURNSTILE_SECRET is set, so launch isn't blocked on provisioning).
//   3. Service-role insert — no client can write directly.
//
// Env (set in Supabase Dashboard → Edge Functions → submit-enquiry → Secrets):
//   SUPABASE_URL              (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY (auto-provided)
//   TURNSTILE_SECRET          (optional until Turnstile is provisioned)
//   ALLOWED_ORIGIN            (e.g. https://www.myhumrahi.org)
//
// Deploy:  supabase functions deploy submit-enquiry --no-verify-jwt
// (public endpoint — it is called by unauthenticated website visitors)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET") ?? "";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://www.myhumrahi.org";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

function clean(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  // Not configured yet → skip (honeypot still applies). Once TURNSTILE_SECRET
  // is set, a missing/invalid token is rejected.
  if (!TURNSTILE_SECRET) return true;
  if (!token) return false;
  const form = new FormData();
  form.append("secret", TURNSTILE_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form },
    );
    const data = await r.json();
    return data.success === true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // 1 · Honeypot — pretend success so bots don't learn they were caught.
  if (clean(payload["bot-field"])) return json({ ok: true });

  // 2 · Turnstile
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "";
  const passed = await verifyTurnstile(clean(payload["cf-turnstile-response"], 4000), ip);
  if (!passed) return json({ ok: false, error: "verification_failed" }, 403);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const type = clean(payload["form"]) || "volunteer";

  try {
    if (type === "newsletter") {
      const email = clean(payload["email"], 320).toLowerCase();
      if (!isEmail(email)) return json({ ok: false, error: "invalid_email" }, 400);
      // Idempotent — a repeat sign-up isn't an error.
      const { error } = await supabase
        .from("newsletter_signups")
        .upsert({ email, source: "web:newsletter" }, { onConflict: "email" });
      if (error) throw error;
      return json({ ok: true });
    }

    // volunteer / contact → enquiries
    const name = clean(payload["name"], 200);
    const email = clean(payload["email"], 320);
    if (!name) return json({ ok: false, error: "name_required" }, 400);
    if (email && !isEmail(email)) return json({ ok: false, error: "invalid_email" }, 400);

    const source = type === "contact" ? "web:contact" : "web:volunteer";
    const { error } = await supabase.from("enquiries").insert({
      name,
      email: email || null,
      phone: clean(payload["phone"], 40) || null,
      interest: clean(payload["interest"], 200) || null,
      availability: clean(payload["availability"], 200) || null,
      message: clean(payload["message"], 4000) || null,
      source,
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    console.error("submit-enquiry error:", e);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
