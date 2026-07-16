// Runnable: `node src/lib/fy.selfcheck.mjs` — asserts the Indian-FY boundaries.
// Mirrors fy.ts (kept in sync by hand; it's ~10 lines of pure date math).
import assert from "node:assert";

function fyOf(dateIso) {
  const d = new Date(dateIso);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const startYear = m >= 3 ? y : y - 1;
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYY}`;
}
function fyLabel(fy) {
  const startYear = parseInt(fy.slice(0, 4), 10);
  const endYY = fy.slice(5);
  return `FY ${startYear}–${endYY} (Apr ${startYear} – Mar ${startYear + 1})`;
}

// Boundaries: 1 Apr starts a new FY, 31 Mar ends the prior one.
assert.equal(fyOf("2026-04-01"), "2026-27");
assert.equal(fyOf("2027-03-31"), "2026-27");
assert.equal(fyOf("2026-03-31"), "2025-26");
assert.equal(fyOf("2026-12-15"), "2026-27");
assert.equal(fyOf("2026-01-10"), "2025-26");
// Century roll: 2099-00.
assert.equal(fyOf("2099-05-01"), "2099-00");
assert.equal(fyLabel("2026-27"), "FY 2026–27 (Apr 2026 – Mar 2027)");

console.log("fy.selfcheck: all assertions passed");
