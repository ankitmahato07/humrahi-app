// Transactional email delivery via Resend.
//
// Every send is best-effort and fail-soft: a bounced or unconfigured mailer
// must NEVER turn a successful donation into an error the donor sees. Callers
// await sendDonationEmails() but it swallows its own failures and only logs.
//
// Required env (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY        re_...   — enables sending; without it we no-op.
//   DONATION_NOTIFY_EMAILS         — comma-separated internal recipients for
//                                    the owner alert (defaults to wecare@).
// The sending domain (myhumrahi.org) must be verified in Resend first.

import { donationThankYou, donationOwnerAlert } from "./render";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_DONOR = "Humrahi Foundation <wecare@myhumrahi.org>";
const FROM_SYSTEM = "Humrahi Website <noreply@myhumrahi.org>";
const REPLY_TO = "wecare@myhumrahi.org";

const OWNER_RECIPIENTS = (process.env.DONATION_NOTIFY_EMAILS ?? "wecare@myhumrahi.org")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(args: SendArgs): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY unset — skipping:", args.subject);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: args.from ?? FROM_SYSTEM,
        to: Array.isArray(args.to) ? args.to : [args.to],
        reply_to: args.replyTo ?? REPLY_TO,
        subject: args.subject,
        html: args.html,
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend error", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}

export interface DonationEmailInput {
  amount_inr: number;
  designation: string;
  payment_id: string;
  donated_at: string;
  donor_email?: string | null;
  donor_phone?: string | null;
  donor_name?: string | null;
  humrahi_linked: boolean;
}

/**
 * Fires the donor thank-you (only if we have their email) and the internal
 * owner alert. Call this exactly once per NEW donation — i.e. only when
 * ingestDonation reports `inserted: true` — so a Razorpay verify + webhook
 * double-delivery doesn't email the donor twice.
 */
export async function sendDonationEmails(d: DonationEmailInput): Promise<void> {
  try {
    const jobs: Promise<boolean>[] = [];

    if (d.donor_email) {
      const donor = donationThankYou({
        amount_inr: d.amount_inr,
        designation: d.designation,
        payment_id: d.payment_id,
        donated_at: d.donated_at,
        donor_name: d.donor_name,
      });
      jobs.push(
        sendEmail({
          to: d.donor_email,
          subject: donor.subject,
          html: donor.html,
          from: FROM_DONOR,
          replyTo: REPLY_TO,
        }),
      );
    }

    if (OWNER_RECIPIENTS.length) {
      const owner = donationOwnerAlert({
        amount_inr: d.amount_inr,
        designation: d.designation,
        payment_id: d.payment_id,
        donated_at: d.donated_at,
        donor_email: d.donor_email,
        donor_phone: d.donor_phone,
        humrahi_linked: d.humrahi_linked,
      });
      jobs.push(
        sendEmail({
          to: OWNER_RECIPIENTS,
          subject: owner.subject,
          html: owner.html,
          from: FROM_SYSTEM,
        }),
      );
    }

    await Promise.all(jobs);
  } catch (err) {
    // Never let email failure surface to the donation flow.
    console.error("[email] sendDonationEmails error:", err);
  }
}
