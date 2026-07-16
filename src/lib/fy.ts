// Indian financial year helpers (FY runs 1 Apr – 31 Mar).

// '2026-27' for any date in FY 2026-27 (Apr 2026 – Mar 2027).
export function fyOf(dateIso: string): string {
  const d = new Date(dateIso);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0 = Jan
  const startYear = m >= 3 ? y : y - 1; // Jan–Mar belong to the prior FY start
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYY}`;
}

// 'FY 2026–27 (Apr 2026 – Mar 2027)' from '2026-27'.
export function fyLabel(fy: string): string {
  const startYear = parseInt(fy.slice(0, 4), 10);
  const endYY = fy.slice(5);
  return `FY ${startYear}–${endYY} (Apr ${startYear} – Mar ${startYear + 1})`;
}
