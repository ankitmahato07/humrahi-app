# Sevastack Integration — Probe Report

> **Status: Pending owner action.** This document must be completed before Phase 2 (donations sync) begins.
> The owner needs to log into the Sevastack dashboard and check the items below, then share findings.

---

## What we need to determine

Our donations sync depends on how Sevastack exposes donor data. There are three tiers (best → fallback):

| Tier | Method | Donor phone available? | Effort |
|------|--------|------------------------|--------|
| **A** | Sevastack webhook or REST API | Yes (ideally) | Low — automatic |
| **B** | Scheduled CSV/Sheet export | Depends | Medium — cron job |
| **C** | Manual admin entry + CSV upload | We control what we capture | High — owner does this |

---

## Owner action items

Log into your Sevastack dashboard at `dashboard.sevastack.in` (or the URL they gave you) and check:

### 1. API / Webhooks
- Is there a **"Webhooks"** or **"API"** section in settings?
- If yes: can you set a webhook URL to receive per-donation events?
- Does each donation event include the **donor's phone number**?
- Is there a **bearer token** or API key to authenticate requests?

### 2. Data exports
- Is there a **"Download / Export"** button for donor data?
- What columns does the export include? (We specifically need: donor phone, amount, date, designation/fund, transaction/receipt ID)
- Is the export manual (you click each time) or can it be scheduled / automated?

### 3. Existing integration options
- Does Sevastack mention integration with Google Sheets, Zapier, or any webhook service?
- Is there a **"Donor portal"** URL pattern we can deep-link to for a specific amount?

---

## Why donor phone matters

Our dashboard matches a Humrahi to their donation history by phone number. If Sevastack captures and exposes the donor's phone, a new Humrahi who signs up with that same number instantly sees their full impact history — no extra steps.

If Sevastack does **not** capture/expose donor phone, we activate the **receipt-claim fallback**:
- The new Humrahi types in their Sevastack receipt number or the email they donated with
- We search our synced `donations` table for a match
- On match, the donation is linked to their account

This fallback is already built into the app. But the clean path (phone match) is far smoother.

---

## Integration choice (to be filled after probe)

After the owner checks the above, one of these paths will be selected:

### Path A — Sevastack Webhook (preferred)

If Sevastack offers a webhook:
1. We deploy a Route Handler at `app.myhumrahi.org/api/donations/webhook`
2. We give Sevastack our endpoint URL + a shared secret (stored as `SEVASTACK_WEBHOOK_SECRET`)
3. Each new donation triggers the webhook → our `ingestDonation()` function normalises and stores it
4. Near-real-time — dashboards update within minutes of a donation

**Required env vars:**
```
SEVASTACK_WEBHOOK_SECRET=<the_shared_secret_sevastack_gives_us>
```

### Path B — Scheduled CSV / Sheet Sync

If no webhook, but there's a scheduled export:
1. Owner exports a CSV from Sevastack (or Sevastack sends to Google Sheets)
2. An admin "Import CSV" button in the admin console reads the file and calls `ingestDonation()` for each row
3. A daily cron (Vercel Cron Jobs) can automate this if the Sheet is publicly readable

**Required env vars:**
```
SEVASTACK_SHEET_ID=<google_sheet_id>
GOOGLE_SERVICE_ACCOUNT_JSON=<json_blob>
```

### Path C — Manual Entry / CSV Upload (fallback, always available)

Regardless of which path is primary, the admin console will always support:
- **Manual single-donation entry** — admin types in receipt ID, amount, donor info
- **CSV upload** — upload a Sevastack export CSV; our parser normalises each row

No additional env vars beyond the standard setup.

---

## Sevastack capabilities (preliminary notes)

*As of June 2026, Sevastack's public documentation is limited. Known capabilities:*

- Hosted donation page (Razorpay-backed) — the primary integration for `donate.html`
- Automated 80G receipts emailed to donors
- Basic donor CRM in their dashboard
- **API: not publicly documented** — check inside the dashboard
- **Webhooks: not confirmed** — check inside the dashboard

*This section will be updated once the probe is complete.*

---

## Next steps

1. **Owner probes** the Sevastack dashboard per the action items above
2. Owner shares findings with the developer (Ankit → Claude Code session)
3. We select Path A, B, or C and build the corresponding sync
4. Path C manual entry is always the immediate fallback — the admin console has it on day 1

---

*Document status: DRAFT — pending owner probe*
*Last updated: 2026-06-26*
