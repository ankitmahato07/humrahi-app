// ─────────────────────────────────────────────────────────────────────────────
// donor-history — Supabase Edge Function (Deno)
//
// Backs the supporter portal on the static site's account.html. A signed-in
// supporter sees their own giving history + 80G receipts, sourced live from
// Seva Stack (the unified donation ledger — one-time AND recurring land there
// via Razorpay's webhook).
//
// SECURITY MODEL (the whole point of this function):
//   • The donor's email is taken ONLY from the verified Supabase JWT, never
//     from the request body. So a caller can only ever see donations tied to
//     the email they actually logged in as. The anon key alone is NOT enough —
//     getUser() must resolve a real user, else 401.
//   • Seva Stack is reached with a server-only API key (SEVASTACK_API_KEY);
//     it never touches the browser.
//   • Only safe fields are returned (date/amount/status/receiptNo). PAN, phone,
//     address, gateway ids and the encrypted id blobs stay server-side.
//
// Env (Supabase Dashboard → Edge Functions → donor-history → Secrets):
//   SEVASTACK_API_KEY   (seva_live_… — from Website/.secrets/seva-stack-api-key.txt)
//   ALLOWED_ORIGIN      (default https://www.myhumrahi.org)
//   SEVASTACK_MCP_URL   (default https://www.sevastack.in/api/mcp)
// SUPABASE_URL / SUPABASE_ANON_KEY are injected automatically.
//
// Deploy:  supabase functions deploy donor-history   (JWT verification ON)
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SEVA_KEY = Deno.env.get("SEVASTACK_API_KEY") ?? "";
const MCP_URL = Deno.env.get("SEVASTACK_MCP_URL") ?? "https://www.sevastack.in/api/mcp";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://www.myhumrahi.org";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

// Seva Stack speaks MCP over HTTP and replies as SSE ("data: {json}"). One
// stateless tools/call per request — no initialize handshake needed. The tool
// result is a JSON string inside result.content[0].text.
async function seva(name: string, args: Record<string, unknown>): Promise<unknown> {
  const r = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SEVA_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`sevastack ${name} ${r.status}`);
  // Pull the JSON-RPC envelope out of the (possibly SSE) body.
  const dataLine = raw.split("\n").filter((l) => l.startsWith("data:")).pop();
  const envelope = JSON.parse(dataLine ? dataLine.slice(5).trim() : raw);
  if (envelope.error) throw new Error(`sevastack ${name}: ${envelope.error.message ?? "rpc_error"}`);
  const text = envelope.result?.content?.[0]?.text;
  return text !== undefined ? JSON.parse(text) : envelope.result;
}

interface SevaDonation {
  id: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  receiptNo: string | null;
  paymentMethod: string;
}
interface SevaDonor {
  id: string;
  email: string;
  name: string;
  category: string;
  totalDonated: number;
  donations?: SevaDonation[];
}

// Find the donor whose email EXACTLY matches the verified login email. The
// search is fuzzy (name/email/phone), so an exact-email filter is mandatory —
// without it a fuzzy hit could leak another donor's history.
async function findDonor(email: string): Promise<SevaDonor | null> {
  const list = (await seva("list_donors", { search: email, limit: 20 })) as SevaDonor[];
  const match = Array.isArray(list)
    ? list.find((d) => (d.email ?? "").trim().toLowerCase() === email)
    : null;
  if (!match) return null;
  return (await seva("get_donor", { donor_id: match.id })) as SevaDonor;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  if (!SEVA_KEY) return json({ ok: false, error: "not_configured" }, 503);

  // ── Identity: trust ONLY the verified JWT, never the body ──────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "unauthorized" }, 401);
  let email: string;
  try {
    const ures = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY },
    });
    if (!ures.ok) return json({ ok: false, error: "unauthorized" }, 401);
    const user = await ures.json();
    email = (user?.email ?? "").trim().toLowerCase();
    if (!email) return json({ ok: false, error: "no_email" }, 401);
  } catch {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let body: { action?: string; donation_id?: string } = {};
  try {
    if (req.headers.get("content-length") !== "0") body = await req.json();
  } catch { /* empty body = default history action */ }

  try {
    const donor = await findDonor(email);
    if (!donor) return json({ ok: true, found: false, email, totalDonated: 0, donations: [] });

    const donations: SevaDonation[] = Array.isArray(donor.donations) ? donor.donations : [];

    // ── Action: email me the 80G receipt for one of MY verified donations ────
    if (body.action === "resend_receipt") {
      const target = donations.find((d) => d.id === body.donation_id);
      if (!target) return json({ ok: false, error: "not_your_donation" }, 403);
      if (target.status !== "VERIFIED" || !target.receiptNo) {
        return json({ ok: false, error: "no_receipt_yet" }, 409);
      }
      await seva("send_receipt", { donation_id: target.id });
      return json({ ok: true, resent: true });
    }

    // ── Default: return the whitelisted history ─────────────────────────────
    return json({
      ok: true,
      found: true,
      email,
      donor: { name: donor.name, category: donor.category, totalDonated: donor.totalDonated ?? 0 },
      donations: donations.map((d) => ({
        id: d.id,
        amount: d.amount,
        currency: d.currency,
        date: d.date,
        status: d.status,
        receiptNo: d.receiptNo,
        paymentMethod: d.paymentMethod,
      })),
    });
  } catch (e) {
    console.error("donor-history error:", e);
    return json({ ok: false, error: "server_error" }, 502);
  }
});
