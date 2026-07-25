import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Public endpoint — /jobready beneficiary funnel. Inserts via service role
// (the jobready_signups table is RLS-locked with no anon policies).
//
// EMAIL: no email provider is configured in this app (no Resend/SMTP dependency,
// no provider key in .env.local — the old src/lib/email/* was removed 2026-07-16).
// So we do NOT send a confirmation email; every response returns emailSent:false.
// The beneficiary's official invite comes from Seva Stack out-of-band. If a
// provider is ever added, send here (Step-2 Wadhwani link + wa.me/918001880016).

// Accept +91XXXXXXXXXX or a bare 10-digit Indian mobile (starts 6-9).
function normalizePhone(raw: string): string | null {
  const d = raw.replace(/[\s-]/g, "");
  const m = /^(?:\+91)?([6-9]\d{9})$/.exec(d);
  return m ? `+91${m[1]}` : null;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  // Honeypot: a filled "company" field means a bot. Return a success-shaped
  // response so we don't tip it off, but insert nothing.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true, emailSent: false });
  }

  const full_name = String(body.full_name ?? "").trim();
  const phone = normalizePhone(String(body.whatsapp_phone ?? ""));
  const emailRaw = String(body.email ?? "").trim();
  const email = emailRaw === "" ? null : emailRaw;
  const language = body.language === "en" ? "en" : "bn";
  const is_minor = body.is_minor === true;
  const guardian_consent = body.guardian_consent === true;

  if (!full_name) {
    return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ ok: false, error: "invalid_phone" }, { status: 400 });
  }
  if (is_minor && !guardian_consent) {
    return NextResponse.json({ ok: false, error: "guardian_consent_required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Basic dedupe: same phone already in the table → already-registered variant.
  const { data: existing } = await admin
    .from("jobready_signups")
    .select("id")
    .eq("whatsapp_phone", phone)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyRegistered: true, emailSent: false });
  }

  const { error } = await admin.from("jobready_signups").insert({
    full_name: full_name.slice(0, 200),
    whatsapp_phone: phone,
    email,
    language,
    is_minor,
    guardian_consent,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, emailSent: false });
}
