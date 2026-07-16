import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { rupeesInWords } from "@/lib/amountWords";
import { fyLabel } from "@/lib/fy";
import type { SevaDonation } from "@/lib/sevastack";

// Branded 80G receipt / FY statement PDFs (A4). StandardFonts only (no font
// files bundled): TimesRoman echoes the serif brand for headings, Helvetica for
// body. WinAnsi encoding has no rupee glyph, so amounts render as "Rs.".

// ── Org constants (public — from the spec) ─────────────────────────────────
const ORG = {
  name: "Humrahi Foundation",
  kind: "TRUST",
  reg: "Reg. No. IV-62 of 2023",
  pan: "AACTH8636F",
  reg80g: "AACTH8636FF20251",
  reg80gValid: "valid to AY 2028-29",
  darpan: "WB/2025/0721671",
  email: "wecare@myhumrahi.org",
  phone: "+91 8001880016",
  address: "Parmeshwar Niwas, Nagru Jote, Guria, Matigara, West Bengal",
};

const RED = rgb(187 / 255, 28 / 255, 42 / 255);
const INK = rgb(44 / 255, 40 / 255, 39 / 255);
const SOFT = rgb(90 / 255, 79 / 255, 74 / 255);

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 56;

function figures(amount: number): string {
  return "Rs. " + new Intl.NumberFormat("en-IN").format(Math.floor(amount));
}
function enIN(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

type Fonts = { serif: PDFFont; serifBold: PDFFont; body: PDFFont; bodyBold: PDFFont };

// Draws the org masthead + red rule; returns the y below it.
function drawHeader(page: PDFPage, f: Fonts, title: string): number {
  let y = A4.h - MARGIN;
  page.drawText(ORG.name, { x: MARGIN, y: y - 18, size: 22, font: f.serifBold, color: RED });
  y -= 30;
  page.drawText(`${ORG.kind} · ${ORG.reg}`, { x: MARGIN, y: y - 10, size: 9, font: f.body, color: SOFT });
  y -= 22;
  page.drawText(ORG.address, { x: MARGIN, y: y - 10, size: 9, font: f.body, color: SOFT });
  y -= 14;
  page.drawText(`${ORG.email}  ·  ${ORG.phone}`, { x: MARGIN, y: y - 10, size: 9, font: f.body, color: SOFT });
  y -= 22;
  page.drawRectangle({ x: MARGIN, y, width: A4.w - 2 * MARGIN, height: 2, color: RED });
  y -= 30;
  page.drawText(title, { x: MARGIN, y: y - 14, size: 15, font: f.serifBold, color: INK });
  return y - 30;
}

// A label: value row. Returns the new y.
function drawRow(page: PDFPage, f: Fonts, y: number, label: string, value: string): number {
  page.drawText(label, { x: MARGIN, y, size: 9.5, font: f.bodyBold, color: SOFT });
  page.drawText(value, { x: MARGIN + 150, y, size: 10.5, font: f.body, color: INK });
  return y - 22;
}

function drawFooter(page: PDFPage, f: Fonts) {
  let y = MARGIN + 62;
  page.drawText("Donations to Humrahi Foundation are eligible for 50% deduction under section 80G of the", {
    x: MARGIN, y, size: 8.5, font: f.body, color: SOFT,
  });
  y -= 12;
  page.drawText(`Income Tax Act, 1961. 80G Reg. No. ${ORG.reg80g} (${ORG.reg80gValid}).`, {
    x: MARGIN, y, size: 8.5, font: f.body, color: SOFT,
  });
  y -= 12;
  page.drawText(`PAN ${ORG.pan}  ·  NITI Aayog Darpan ${ORG.darpan}`, {
    x: MARGIN, y, size: 8.5, font: f.body, color: SOFT,
  });
  y -= 16;
  page.drawText("The official receipt is also emailed by our donation partner Seva Stack.", {
    x: MARGIN, y, size: 8.5, font: f.bodyBold, color: INK,
  });
  y -= 14;
  page.drawText("This is a computer-generated document and does not require a signature.", {
    x: MARGIN, y, size: 8, font: f.body, color: SOFT,
  });
}

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  return {
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
    body: await doc.embedFont(StandardFonts.Helvetica),
    bodyBold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

export async function buildReceiptPdf(opts: {
  donation: SevaDonation;
  donorName: string;
  donorEmail: string;
}): Promise<Uint8Array> {
  const { donation, donorName, donorEmail } = opts;
  const doc = await PDFDocument.create();
  const f = await loadFonts(doc);
  const page = doc.addPage([A4.w, A4.h]);

  let y = drawHeader(page, f, "80G Donation Receipt");
  y = drawRow(page, f, y, "Receipt No.", donation.receiptNo ?? "—");
  y = drawRow(page, f, y, "Date", enIN(donation.date));
  y = drawRow(page, f, y, "Received from", donorName);
  y = drawRow(page, f, y, "Email", donorEmail);
  if (donation.purpose) y = drawRow(page, f, y, "Purpose", donation.purpose);
  y = drawRow(page, f, y, "Status", donation.status);
  y -= 8;

  // Amount block — figures (big, serif) + words.
  page.drawText("Amount received", { x: MARGIN, y, size: 9.5, font: f.bodyBold, color: SOFT });
  y -= 26;
  page.drawText(figures(donation.amountInr), { x: MARGIN, y, size: 24, font: f.serifBold, color: RED });
  y -= 22;
  page.drawText(rupeesInWords(donation.amountInr), { x: MARGIN, y, size: 10.5, font: f.body, color: INK });

  drawFooter(page, f);
  return doc.save();
}

export async function buildStatementPdf(opts: {
  fy: string;
  donations: SevaDonation[]; // already filtered to this FY
  donorName: string;
  donorEmail: string;
  totalInr: number;
}): Promise<Uint8Array> {
  const { fy, donations, donorName, donorEmail, totalInr } = opts;
  const doc = await PDFDocument.create();
  const f = await loadFonts(doc);
  const page = doc.addPage([A4.w, A4.h]);

  let y = drawHeader(page, f, `Consolidated 80G Statement — ${fyLabel(fy)}`);
  y = drawRow(page, f, y, "Donor", donorName);
  y = drawRow(page, f, y, "Email", donorEmail);
  y -= 6;

  // Table header.
  const cols = { date: MARGIN, receipt: MARGIN + 120, purpose: MARGIN + 250, amount: A4.w - MARGIN - 90 };
  page.drawText("Date", { x: cols.date, y, size: 9, font: f.bodyBold, color: SOFT });
  page.drawText("Receipt No.", { x: cols.receipt, y, size: 9, font: f.bodyBold, color: SOFT });
  page.drawText("Purpose", { x: cols.purpose, y, size: 9, font: f.bodyBold, color: SOFT });
  page.drawText("Amount", { x: cols.amount, y, size: 9, font: f.bodyBold, color: SOFT });
  y -= 6;
  page.drawRectangle({ x: MARGIN, y, width: A4.w - 2 * MARGIN, height: 0.75, color: SOFT });
  y -= 18;

  for (const d of donations) {
    if (y < MARGIN + 130) break; // single page; statements rarely overflow
    page.drawText(enIN(d.date), { x: cols.date, y, size: 9.5, font: f.body, color: INK });
    page.drawText(d.receiptNo ?? "—", { x: cols.receipt, y, size: 9.5, font: f.body, color: INK });
    page.drawText((d.purpose ?? "General").slice(0, 22), { x: cols.purpose, y, size: 9.5, font: f.body, color: INK });
    page.drawText(figures(d.amountInr), { x: cols.amount, y, size: 9.5, font: f.body, color: INK });
    y -= 18;
  }

  y -= 6;
  page.drawRectangle({ x: MARGIN, y, width: A4.w - 2 * MARGIN, height: 0.75, color: SOFT });
  y -= 24;
  page.drawText("Total donated this FY", { x: MARGIN, y, size: 11, font: f.bodyBold, color: INK });
  page.drawText(figures(totalInr), { x: cols.amount, y, size: 14, font: f.serifBold, color: RED });
  y -= 20;
  page.drawText(rupeesInWords(totalInr), { x: MARGIN, y, size: 10, font: f.body, color: SOFT });

  drawFooter(page, f);
  return doc.save();
}
