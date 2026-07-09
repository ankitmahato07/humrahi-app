// Branded transactional-email templates for Humrahi Foundation.
//
// These are the emails a donor / supporter actually receives, so they carry
// the brand: Cloud Dancer canvas, Charcoal Ink header, a single Sindoor Red
// rule, a warm grounded voice, and the tagline as a quiet sign-off. Everything
// is inline-styled, table-based and font-stack-only (no web fonts, no flexbox)
// so it renders the same in Gmail, Apple Mail and Outlook.
//
// Palette mirrors the site (assets/site.css):
//   Cloud Dancer #F0EDE6 · Charcoal Ink #2C2827 · Sindoor Red #BB1C2A
//   Deep Crimson #7E1A20 · Warm Sand #E5D9C2 · Whisper #F8F6F1 · Soft Ink #5A4F4A
//   Stone Taupe #B8A78D

const C = {
  cloud: "#F0EDE6",
  ink: "#2C2827",
  red: "#BB1C2A",
  crimson: "#7E1A20",
  sand: "#E5D9C2",
  taupe: "#B8A78D",
  whisper: "#F8F6F1",
  soft: "#5A4F4A",
} as const;

const SERIF = "'Georgia', 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

const SITE = "https://www.myhumrahi.org";

export function inr(amount: number): string {
  return "₹" + Number(amount).toLocaleString("en-IN");
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Wraps body HTML in the Humrahi email chrome (header rule + footer + tagline).
 * `preheader` is the grey preview line inbox lists show next to the subject.
 */
export function emailShell(opts: {
  preheader: string;
  bodyHtml: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:${C.cloud};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.cloud};font-size:1px;line-height:1px;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cloud};padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px rgba(44,40,39,0.08);">
      <!-- header -->
      <tr><td style="background:${C.ink};padding:30px 40px 26px;">
        <div style="font-family:${SERIF};color:#ffffff;font-size:21px;font-weight:700;letter-spacing:0.01em;">Humrahi Foundation</div>
        <div style="height:3px;width:44px;background:${C.red};margin-top:14px;border-radius:2px;"></div>
      </td></tr>
      <!-- body -->
      <tr><td style="padding:38px 40px 8px;font-family:${SANS};color:${C.soft};font-size:16px;line-height:1.7;">
        ${opts.bodyHtml}
      </td></tr>
      <!-- tagline sign-off -->
      <tr><td style="padding:20px 40px 34px;">
        <div style="font-family:${SERIF};font-style:italic;color:${C.taupe};font-size:15px;">manavta ki ek nayi pehchaan</div>
      </td></tr>
      <!-- footer -->
      <tr><td style="background:${C.whisper};border-top:1px solid ${C.sand};padding:22px 40px;font-family:${SANS};color:${C.taupe};font-size:12px;line-height:1.7;">
        Humrahi Foundation · Parameshwar Niwas, Gudiya Jote, Matigara, Siliguri, Darjeeling, West Bengal<br>
        <a href="${SITE}" style="color:${C.red};text-decoration:none;">myhumrahi.org</a>
        &nbsp;·&nbsp; <a href="mailto:wecare@myhumrahi.org" style="color:${C.red};text-decoration:none;">wecare@myhumrahi.org</a>
        &nbsp;·&nbsp; +91 80018 80016
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// Reusable body atoms ────────────────────────────────────────────────────────
const h1 = (t: string) =>
  `<h1 style="margin:0 0 18px;font-family:${SERIF};color:${C.ink};font-size:25px;line-height:1.25;font-weight:700;">${t}</h1>`;
const p = (t: string) =>
  `<p style="margin:0 0 18px;font-family:${SANS};color:${C.soft};font-size:16px;line-height:1.7;">${t}</p>`;

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 22px;"><tr>
    <td style="background:${C.red};border-radius:3px;">
      <a href="${href}" style="display:inline-block;padding:13px 30px;font-family:${SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
    </td></tr></table>`;
}

// A quiet key/value receipt card.
function detailCard(rows: Array<[string, string]>): string {
  const trs = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:9px 16px 9px 0;font-family:${SANS};font-size:13px;color:${C.taupe};white-space:nowrap;vertical-align:top;">${esc(k)}</td>
          <td style="padding:9px 0;font-family:${SANS};font-size:14px;color:${C.ink};font-weight:600;">${esc(v)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.whisper};border:1px solid ${C.sand};border-radius:4px;padding:8px 20px;margin:4px 0 24px;">${trs}</table>`;
}

// What a gift becomes, by designation — keeps the receipt human, not clerical.
function designationLine(designation: string): string {
  switch (designation) {
    case "meals":
      return "warm meals, served from a kitchen that opens at six every morning";
    case "health":
      return "a free health or blood-donation camp for families who would otherwise go without";
    case "school":
      return "school support for a child we've promised not to leave behind";
    default:
      return "food, health camps and school support — carried straight to the ground in Siliguri";
  }
}

// ── Donor thank-you + provisional receipt ────────────────────────────────────
export function donationThankYou(d: {
  amount_inr: number;
  designation: string;
  payment_id: string;
  donated_at: string;
  donor_name?: string | null;
}): { subject: string; html: string } {
  const greeting = d.donor_name ? `Namaste ${esc(d.donor_name)},` : "Namaste,";
  const date = new Date(d.donated_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const body =
    h1("Your gift has reached us.") +
    p(greeting) +
    p(
      `Thank you. Your donation of <strong style="color:${C.ink};">${inr(
        d.amount_inr,
      )}</strong> is already on its way to becoming ${designationLine(
        d.designation,
      )}.`,
    ) +
    p(
      "We don't take this lightly. Every rupee you've given walks with someone — a family at a meal, a child at a desk, a stranger at a camp. That is the whole of what we do, and today you're part of it.",
    ) +
    detailCard([
      ["Amount", inr(d.amount_inr)],
      ["Received", date],
      ["Reference", d.payment_id],
    ]) +
    p(
      `An official <strong style="color:${C.ink};">80G tax receipt</strong> — eligible for 50% exemption under Section 80G — will follow from our team. If we don't already have it, do reply with your PAN so we can raise it in your name.`,
    ) +
    p("With gratitude,<br>Ankit &amp; the Humrahi Foundation team") +
    button("See where your gift goes →", `${SITE}/transparency.html`);

  return {
    subject: `Thank you — your ${inr(d.amount_inr)} gift has reached the ground`,
    html: emailShell({
      preheader: `A receipt for your ${inr(
        d.amount_inr,
      )} donation, and a thank-you from Siliguri.`,
      bodyHtml: body,
    }),
  };
}

// ── Internal owner alert for a new donation ──────────────────────────────────
export function donationOwnerAlert(d: {
  amount_inr: number;
  designation: string;
  payment_id: string;
  donated_at: string;
  donor_email?: string | null;
  donor_phone?: string | null;
  humrahi_linked: boolean;
}): { subject: string; html: string } {
  const date = new Date(d.donated_at).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const body =
    h1(`New donation · ${inr(d.amount_inr)}`) +
    p("A donation just came through Razorpay on the site.") +
    detailCard([
      ["Amount", inr(d.amount_inr)],
      ["Designation", d.designation],
      ["Donor email", d.donor_email || "—"],
      ["Donor phone", d.donor_phone || "—"],
      ["Linked to a Humrahi", d.humrahi_linked ? "Yes" : "Not yet"],
      ["Received", date],
      ["Payment id", d.payment_id],
    ]) +
    p(
      d.humrahi_linked
        ? "This donor already has a Humrahi profile — the gift is linked."
        : "No matching Humrahi profile yet. Consider linking or inviting them.",
    ) +
    button("Open the donations desk →", "https://app.myhumrahi.org/admin/donations");

  return {
    subject: `New donation · ${inr(d.amount_inr)}${
      d.donor_email ? ` · ${d.donor_email}` : ""
    }`,
    html: emailShell({
      preheader: `${inr(d.amount_inr)} · ${d.designation} · via Razorpay`,
      bodyHtml: body,
    }),
  };
}
