import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Public endpoint — Assam flood relief in-kind goods pledges. Inserts via
// service role (relief_pledges is RLS-locked with no anon policies, migration 013).
//
// CORS: the static site (myhumrahi.org) hosts the pledge form and POSTs here
// cross-origin. Echo back the request Origin only when it's one of ours — never
// "*", and never an arbitrary origin. Same-origin requests send no Origin and
// just get no CORS header, which is fine.
//
// No phone dedupe on purpose: pledging twice is legitimate, and each pledge is a
// separate collection to chase.

const ALLOWED_ORIGINS = new Set([
  "https://www.myhumrahi.org",
  "https://myhumrahi.org",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin",
  };
}

// json() clone that always carries the CORS headers for this request.
function json(req: Request, body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, { status: init?.status, headers: corsHeaders(req) });
}

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

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
    return json(req, { ok: false, error: "bad_json" }, { status: 400 });
  }

  // Honeypot: a filled "website" field means a bot. Return a success-shaped
  // response so we don't tip it off, but insert nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json(req, { ok: true });
  }

  const name = String(body.name ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? ""));
  const items = String(body.items ?? "").trim();
  const emailRaw = String(body.email ?? "").trim();
  const cityRaw = String(body.city ?? "").trim();
  const noteRaw = String(body.note ?? "").trim();

  if (!name) {
    return json(req, { ok: false, error: "name_required" }, { status: 400 });
  }
  if (!phone) {
    return json(req, { ok: false, error: "invalid_phone" }, { status: 400 });
  }
  if (!items) {
    return json(req, { ok: false, error: "items_required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin.from("relief_pledges").insert({
    name: name.slice(0, 200),
    phone,
    email: emailRaw === "" ? null : emailRaw.slice(0, 200),
    city: cityRaw === "" ? null : cityRaw.slice(0, 120),
    items: items.slice(0, 2000),
    note: noteRaw === "" ? null : noteRaw.slice(0, 2000),
  });

  if (error) {
    return json(req, { ok: false, error: "insert_failed" }, { status: 500 });
  }

  return json(req, { ok: true });
}
