"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ingestDonation } from "@/lib/utils/ingest";

type Designation = "meals" | "health" | "school" | "general";

function mapDesignation(raw: string): Designation {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("meal") || s.includes("food") || s.includes("hunger")) return "meals";
  if (s.includes("health") || s.includes("camp") || s.includes("medical")) return "health";
  if (s.includes("school") || s.includes("educat")) return "school";
  return "general";
}

// Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes, CRLF.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { cur.push(field); field = ""; }
    else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
    else if (c === "\r") { /* ignore */ }
    else field += c;
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Accepts common date formats incl. Indian DD/MM/YYYY.
function toISO(s: string): string {
  const t = (s ?? "").trim();
  if (!t) return new Date().toISOString();
  const m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const dt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (!isNaN(dt.getTime())) return dt.toISOString();
  }
  const dt = new Date(t);
  return isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
}

export type ImportResult = {
  ok: boolean;
  error?: string;
  processed?: number;
  linked?: number;
  skipped?: number;
  errors?: string[];
};

/**
 * Import donations from a pasted/uploaded CSV (e.g. a Seva Stack export).
 * Idempotent per receipt/transaction id — re-uploading the same file is safe.
 * Links each donation to a Humrahi by phone where possible.
 */
export async function importDonationsCsv(csvText: string): Promise<ImportResult> {
  await requireAdmin();

  const rows = parseCsv(csvText || "");
  if (rows.length < 2) {
    return { ok: false, error: "Need a header row and at least one data row." };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) =>
    header.findIndex((h) => names.some((n) => h.includes(n)));

  const iExt = col("receipt", "transaction", "txn", "external", "order", "id");
  const iPhone = col("phone", "mobile", "contact");
  const iEmail = col("email");
  const iAmount = col("amount", "inr", "donation");
  const iDate = col("date", "created", "donated", "time");
  const iDesig = col("fund", "designation", "purpose", "cause", "program");
  const iRec = col("recurring", "monthly", "frequency");

  if (iExt < 0 || iAmount < 0) {
    return {
      ok: false,
      error:
        "CSV must include a receipt/transaction-id column and an amount column. Found headers: " +
        header.join(", "),
    };
  }

  let processed = 0;
  let linked = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const external_id = (row[iExt] ?? "").trim();
    const amount = Number((row[iAmount] ?? "").replace(/[^0-9.]/g, ""));
    if (!external_id || !amount || amount <= 0) {
      skipped++;
      continue;
    }

    const res = await ingestDonation({
      external_id,
      donor_phone: iPhone >= 0 ? (row[iPhone] ?? "").trim() || null : null,
      donor_email: iEmail >= 0 ? (row[iEmail] ?? "").trim() || null : null,
      amount_inr: amount,
      donated_at: iDate >= 0 ? toISO(row[iDate] ?? "") : new Date().toISOString(),
      designation: iDesig >= 0 ? mapDesignation(row[iDesig] ?? "") : "general",
      is_recurring:
        iRec >= 0 ? /^(y|yes|true|1|recurring|monthly)$/i.test((row[iRec] ?? "").trim()) : false,
      source: "sevastack_csv",
      raw: Object.fromEntries(header.map((h, i) => [h, row[i] ?? ""])),
    });

    if (res.error) {
      if (errors.length < 5) errors.push(`Row ${r + 1}: ${res.error}`);
      skipped++;
    } else {
      processed++;
      if (res.humrahi_linked) linked++;
    }
  }

  revalidatePath("/admin/donations");
  revalidatePath("/admin/donors");
  revalidatePath("/admin");
  return { ok: true, processed, linked, skipped, errors };
}
