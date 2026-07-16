import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// sevastack.ts — server-only Seva Stack (donation ledger) client.
//
// Ported from supabase/functions/donor-history/index.ts. Same security model:
//   • The caller's email is ALWAYS the verified session email (passed in by
//     donor.ts / the route, which read it from supabase.auth.getUser()) —
//     never from request input.
//   • list_donors search is fuzzy (name/email/phone), so an EXACT lowercased
//     email match is mandatory, else a fuzzy hit could leak another donor.
//   • Only whitelisted fields cross to the caller (id/date/amountInr/status/
//     receiptNo/purpose). PAN, phone, address, gateway ids stay server-side.
//   • resendReceipt is guarded to the caller's OWN donations.
//
// Fail-soft: SEVASTACK_API_KEY unset → getDonationsForEmail returns [],
// resendReceipt returns false. Routes that must 503 check SEVASTACK_CONFIGURED.
// ─────────────────────────────────────────────────────────────────────────────

const SEVA_KEY = process.env.SEVASTACK_API_KEY ?? "";
const MCP_URL = process.env.SEVASTACK_MCP_URL ?? "https://www.sevastack.in/api/mcp";

export const SEVASTACK_CONFIGURED = !!SEVA_KEY;

export type SevaDonation = {
  id: string;
  date: string; // ISO date
  amountInr: number;
  status: "VERIFIED" | "PENDING" | string;
  receiptNo: string | null;
  purpose: string | null;
};

// Seva Stack speaks MCP over HTTP and replies as SSE ("data: {json}"). One
// stateless tools/call per request. The tool result is a JSON string inside
// result.content[0].text.
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
  const dataLine = raw.split("\n").filter((l) => l.startsWith("data:")).pop();
  const envelope = JSON.parse(dataLine ? dataLine.slice(5).trim() : raw);
  if (envelope.error) throw new Error(`sevastack ${name}: ${envelope.error.message ?? "rpc_error"}`);
  const text = envelope.result?.content?.[0]?.text;
  return text !== undefined ? JSON.parse(text) : envelope.result;
}

// Raw shapes coming back from Seva Stack (superset — we only read a subset).
interface RawDonation {
  id: string;
  amount: number;
  date: string;
  status: string;
  receiptNo: string | null;
  purpose?: string | null;
  project?: string | null;
  designation?: string | null;
}
interface RawDonor {
  id: string;
  email: string;
  name: string;
  donations?: RawDonation[];
}

// Find the donor whose email EXACTLY matches the verified login email.
async function findDonor(email: string): Promise<RawDonor | null> {
  const list = (await seva("list_donors", { search: email, limit: 20 })) as RawDonor[];
  const match = Array.isArray(list)
    ? list.find((d) => (d.email ?? "").trim().toLowerCase() === email)
    : null;
  if (!match) return null;
  return (await seva("get_donor", { donor_id: match.id })) as RawDonor;
}

function toSafe(d: RawDonation): SevaDonation {
  return {
    id: d.id,
    date: d.date,
    amountInr: d.amount,
    status: d.status,
    receiptNo: d.receiptNo ?? null,
    purpose: d.purpose ?? d.project ?? d.designation ?? null,
  };
}

// All of the caller's donations, whitelisted. email MUST be the verified
// session email. [] on not-found, not-configured, or any Seva Stack failure —
// callers (pages) must render gracefully.
export async function getDonationsForEmail(email: string): Promise<SevaDonation[]> {
  if (!SEVASTACK_CONFIGURED) return [];
  const clean = email.trim().toLowerCase();
  if (!clean) return [];
  try {
    const donor = await findDonor(clean);
    const donations = donor && Array.isArray(donor.donations) ? donor.donations : [];
    return donations.map(toSafe);
  } catch (e) {
    console.error("sevastack getDonationsForEmail:", e);
    return [];
  }
}

// Email the 80G receipt for ONE of the caller's own donations. email MUST be
// the verified session email. Returns false if not configured, not the
// caller's donation, no receipt yet, or on any Seva Stack failure.
export async function resendReceipt(email: string, donationId: string): Promise<boolean> {
  if (!SEVASTACK_CONFIGURED) return false;
  const clean = email.trim().toLowerCase();
  if (!clean || !donationId) return false;
  try {
    const donor = await findDonor(clean);
    const donations = donor && Array.isArray(donor.donations) ? donor.donations : [];
    const target = donations.find((d) => d.id === donationId);
    if (!target) return false; // not the caller's donation
    if (target.status !== "VERIFIED" || !target.receiptNo) return false; // no receipt yet
    await seva("send_receipt", { donation_id: target.id });
    return true;
  } catch (e) {
    console.error("sevastack resendReceipt:", e);
    return false;
  }
}
