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
//   RESEND_API_KEY            (optional — enables the branded team alert AND the
//                              warm auto-reply to whoever wrote in. The sending
//                              domain myhumrahi.org must be verified in Resend,
//                              incl. wecare@ as a From address.)
//   NOTIFY_EMAILS             (comma-separated recipients for the team alert)
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

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const NOTIFY_EMAILS = (Deno.env.get("NOTIFY_EMAILS") ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

// From addresses. Auto-replies come from the human wecare inbox (so a reply
// reaches a person); the internal alert comes from noreply.
const FROM_CARE = "Humrahi Foundation <wecare@myhumrahi.org>";
const FROM_SYSTEM = "Humrahi Website <noreply@myhumrahi.org>";
const REPLY_TO = "wecare@myhumrahi.org";
const CARE_PHONE = "+91 80018 80016";

const escHtml = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── Brand email chrome (mirrors the site: Cloud Dancer canvas, Charcoal Ink
//    header, one Sindoor Red rule, tagline sign-off). Inline styles + tables
//    only, so it renders the same in Gmail / Apple Mail / Outlook. ────────────
function emailShell(preheader: string, bodyHtml: string): string {
  const SERIF = "'Georgia','Times New Roman',serif";
  const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light"></head>` +
    `<body style="margin:0;padding:0;background:#F0EDE6;">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F0EDE6;font-size:1px;line-height:1px;">${escHtml(preheader)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE6;padding:32px 12px;"><tr><td align="center">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px rgba(44,40,39,0.08);">` +
    `<tr><td style="background:#2C2827;padding:30px 40px 26px;">` +
    `<div style="font-family:${SERIF};color:#ffffff;font-size:21px;font-weight:700;letter-spacing:0.01em;">Humrahi Foundation</div>` +
    `<div style="height:3px;width:44px;background:#BB1C2A;margin-top:14px;border-radius:2px;"></div></td></tr>` +
    `<tr><td style="padding:38px 40px 8px;font-family:${SANS};color:#5A4F4A;font-size:16px;line-height:1.7;">${bodyHtml}</td></tr>` +
    `<tr><td style="padding:20px 40px 34px;"><div style="font-family:${SERIF};font-style:italic;color:#B8A78D;font-size:15px;">manavta ki ek nayi pehchaan</div></td></tr>` +
    `<tr><td style="background:#F8F6F1;border-top:1px solid #E5D9C2;padding:22px 40px;font-family:${SANS};color:#B8A78D;font-size:12px;line-height:1.7;">` +
    `Humrahi Foundation · Parameshwar Niwas, Gudiya Jote, Matigara, Siliguri, Darjeeling, West Bengal<br>` +
    `<a href="https://www.myhumrahi.org" style="color:#BB1C2A;text-decoration:none;">myhumrahi.org</a> &nbsp;·&nbsp; ` +
    `<a href="mailto:wecare@myhumrahi.org" style="color:#BB1C2A;text-decoration:none;">wecare@myhumrahi.org</a> &nbsp;·&nbsp; ${CARE_PHONE}` +
    `</td></tr></table></td></tr></table></body></html>`;
}

const H1 = (t: string) =>
  `<h1 style="margin:0 0 18px;font-family:'Georgia',serif;color:#2C2827;font-size:24px;line-height:1.3;font-weight:700;">${t}</h1>`;
const P = (t: string) =>
  `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#5A4F4A;">${t}</p>`;

// Generic best-effort Resend send. A failure must never fail the submission.
async function sendEmail(opts: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  if (!RESEND_API_KEY || opts.to.length === 0) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: opts.from,
        to: opts.to,
        reply_to: opts.replyTo ?? REPLY_TO,
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!r.ok) console.error("sendEmail failed:", r.status, await r.text());
  } catch (e) {
    console.error("sendEmail error:", e);
  }
}

// Internal alert to the team when a new lead lands.
async function notifyOwner(kind: string, fields: Record<string, string | null>) {
  if (NOTIFY_EMAILS.length === 0) return;
  const rows = Object.entries(fields)
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:9px 16px 9px 0;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:13px;color:#B8A78D;white-space:nowrap;vertical-align:top;">${escHtml(k)}</td>` +
        `<td style="padding:9px 0;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:14px;color:#2C2827;font-weight:600;">${escHtml(v)}</td></tr>`,
    )
    .join("");
  const body =
    H1(`New ${escHtml(kind)}`) +
    P("Someone just reached out through myhumrahi.org. Their details are below.") +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F6F1;border:1px solid #E5D9C2;border-radius:4px;padding:8px 20px;margin:4px 0 24px;">${rows}</table>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 8px;"><tr><td style="background:#BB1C2A;border-radius:3px;">` +
    `<a href="https://app.myhumrahi.org/admin/volunteers" style="display:inline-block;padding:13px 30px;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Open the CRM →</a>` +
    `</td></tr></table>`;
  await sendEmail({
    from: FROM_SYSTEM,
    to: NOTIFY_EMAILS,
    subject: `New ${kind}: ${fields["Name"] ?? fields["Email"] ?? "someone"}`,
    html: emailShell(`New ${kind} on myhumrahi.org`, body),
  });
}

// Warm auto-reply to the person who reached out. Skipped when we have no email
// (e.g. a volunteer who left only a phone number).
async function sendAutoReply(
  type: "volunteer" | "contact" | "newsletter",
  to: string,
  name: string | null,
  interest: string | null,
) {
  if (!to) return;
  const hi = name ? `Namaste ${escHtml(name)},` : "Namaste,";
  let subject = "";
  let body = "";

  if (type === "newsletter") {
    subject = "You're on the list — welcome";
    body =
      H1("You're with us now.") +
      P("Namaste,") +
      P("Thank you for choosing to stay close to the work. We'll only write when something real happens on the ground — a drive, a health camp, a story worth telling. No noise, and you can step away whenever you like.") +
      P("Until then — walk with us on <a href=\"https://www.instagram.com/myhumrahi/\" style=\"color:#BB1C2A;text-decoration:none;\">Instagram</a> or read the longer stories on our <a href=\"https://ankitmahat0.substack.com\" style=\"color:#BB1C2A;text-decoration:none;\">blog</a>.") +
      P("Warmly,<br>The Humrahi Foundation team");
  } else if (type === "volunteer") {
    subject = "Welcome — we'll see you at the kitchen";
    body =
      H1("Thank you for offering to walk with us.") +
      P(hi) +
      P("We've got your details, and someone from the Humrahi team will be in touch about the next drive, camp or kitchen shift you can join.") +
      (interest
        ? P(`You told us you'd like to help with <strong style="color:#2C2827;">${escHtml(interest)}</strong> — we'll keep that in mind.`)
        : "") +
      P("There's no special skill required here. Presence is the skill, and the kitchen opens at six.") +
      P("With gratitude,<br>The Humrahi Foundation team");
  } else {
    subject = "We've got your note — thank you for reaching out";
    body =
      H1("Thank you for writing to us.") +
      P(hi) +
      P("We've received your message, and someone from our team will reply personally within a few working days. If your work aligns with what we're building in Siliguri, we'd love to find a way to walk together.") +
      P(`If it's time-sensitive, you can always reach us directly at ${CARE_PHONE}.`) +
      P("Warmly,<br>The Humrahi Foundation team");
  }

  await sendEmail({
    from: FROM_CARE,
    to: [to],
    subject,
    html: emailShell(subject, body),
    replyTo: REPLY_TO,
  });
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
      // Confirm to the subscriber, alert the team. Both best-effort.
      await Promise.all([
        sendAutoReply("newsletter", email, null, null),
        notifyOwner("newsletter signup", { Email: email }),
      ]);
      return json({ ok: true });
    }

    // volunteer / contact → enquiries
    const name = clean(payload["name"], 200);
    const email = clean(payload["email"], 320);
    if (!name) return json({ ok: false, error: "name_required" }, 400);
    if (email && !isEmail(email)) return json({ ok: false, error: "invalid_email" }, 400);

    const source = type === "contact" ? "web:contact" : "web:volunteer";
    const phone = clean(payload["phone"], 40) || null;
    const interest = clean(payload["interest"], 200) || null;
    const availability = clean(payload["availability"], 200) || null;
    const message = clean(payload["message"], 4000) || null;
    const { error } = await supabase.from("enquiries").insert({
      name,
      email: email || null,
      phone,
      interest,
      availability,
      message,
      source,
    });
    if (error) throw error;
    // Warm confirmation to the sender (if we have their email), alert the team.
    const replyType = type === "contact" ? "contact" : "volunteer";
    await Promise.all([
      email ? sendAutoReply(replyType, email, name, interest) : Promise.resolve(),
      notifyOwner(type === "contact" ? "contact enquiry" : "volunteer sign-up", {
        Name: name,
        Phone: phone,
        Email: email || null,
        Interest: interest,
        Availability: availability,
        Message: message,
      }),
    ]);
    return json({ ok: true });
  } catch (e) {
    console.error("submit-enquiry error:", e);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
