// Self-check for donor-history's security-critical pure logic.
// Mirrors the edge function's SSE parsing + exact-email match + ownership guard.
// Run: node selfcheck.mjs   (no network, no deps)
import assert from "node:assert/strict";

// ── replicas of the edge function's pure logic ────────────────────────────────
function parseSeva(rawText) {
  const dataLine = rawText.split("\n").filter((l) => l.startsWith("data:")).pop();
  const envelope = JSON.parse(dataLine ? dataLine.slice(5).trim() : rawText);
  if (envelope.error) throw new Error(envelope.error.message ?? "rpc_error");
  const text = envelope.result?.content?.[0]?.text;
  return text !== undefined ? JSON.parse(text) : envelope.result;
}
function matchDonor(list, email) {
  return Array.isArray(list)
    ? list.find((d) => (d.email ?? "").trim().toLowerCase() === email) ?? null
    : null;
}
function ownsDonation(donations, id) {
  return (donations ?? []).some((d) => d.id === id);
}

// ── 1. SSE-wrapped JSON-RPC (Seva Stack's real reply shape) parses to the array
const SSE =
  'event: message\n' +
  'data: {"result":{"content":[{"type":"text","text":"[\\n  {\\n    \\"id\\": \\"donor_1\\",\\n    \\"email\\": \\"psunri@gmail.com\\",\\n    \\"category\\": \\"ONE_TIME\\"\\n  }\\n]"}]},"jsonrpc":"2.0","id":1}\n';
const donors = parseSeva(SSE);
assert.equal(donors.length, 1);
assert.equal(donors[0].email, "psunri@gmail.com");

// ── 2. Plain (non-SSE) JSON body also parses (fallback path)
const PLAIN = '{"result":{"content":[{"type":"text","text":"{\\"id\\":\\"donor_1\\",\\"donations\\":[]}"}]},"jsonrpc":"2.0","id":1}';
assert.equal(parseSeva(PLAIN).id, "donor_1");

// ── 3. RPC error surfaces as a throw
assert.throws(() => parseSeva('data: {"error":{"message":"nope"},"jsonrpc":"2.0","id":1}\n'));

// ── 4. Exact-email match (the caller's email is lowercased upstream)
const list = [
  { id: "d_other", email: "someone.else@gmail.com" }, // fuzzy search can return neighbours
  { id: "d_me", email: "PSunri@Gmail.com" },
];
assert.equal(matchDonor(list, "psunri@gmail.com").id, "d_me", "case-insensitive exact match");

// ── 5. LEAK GUARD: a fuzzy list with NO exact match must resolve to null,
//       never to a near-miss donor.
assert.equal(matchDonor([{ id: "d_x", email: "psunri99@gmail.com" }], "psunri@gmail.com"), null);
assert.equal(matchDonor([{ id: "d_x", email: "" }], "psunri@gmail.com"), null);

// ── 6. Resend ownership guard: only donations in the caller's own list qualify
const mine = [{ id: "don_1" }, { id: "don_2" }];
assert.equal(ownsDonation(mine, "don_1"), true);
assert.equal(ownsDonation(mine, "don_forged"), false, "cannot resend a receipt for someone else's donation");

console.log("donor-history selfcheck: all assertions passed ✓");
