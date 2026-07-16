// Runnable: `node src/lib/safeNext.selfcheck.mjs` — asserts the open-redirect guard.
// Mirrors safeNext.ts (kept in sync by hand; it's a one-liner).
import assert from "node:assert";

function safeNext(next) {
  if (!next || next[0] !== "/" || next[1] === "/" || next[1] === "\\") return "/";
  return next;
}

// Allowed: same-origin relative paths.
assert.equal(safeNext("/"), "/");
assert.equal(safeNext("/receipts"), "/receipts");
assert.equal(safeNext("/campaigns/abc?x=1"), "/campaigns/abc?x=1");
// Rejected: off-site tricks that would escape `${origin}${next}` / router.push.
assert.equal(safeNext("@evil.com"), "/");
assert.equal(safeNext("//evil.com"), "/");
assert.equal(safeNext("/\\evil.com"), "/"); // backslash → protocol-relative in some browsers
assert.equal(safeNext("https://evil.com"), "/");
assert.equal(safeNext("javascript:alert(1)"), "/");
assert.equal(safeNext(null), "/");
assert.equal(safeNext(""), "/");

console.log("safeNext.selfcheck: all assertions passed");
