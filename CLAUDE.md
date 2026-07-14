# CLAUDE.md — humrahi-app

Donor/volunteer portal at **app.myhumrahi.org**. Next.js 15 App Router, React 19, Tailwind 3, Supabase.
Deploys: Vercel project `humrahi-app-iuvy`, production = `main`. Supabase project `ogmizlviplorxstknlaj` (ap-southeast-2).
The public site myhumrahi.org is a separate codebase — never touch it from here.

## Commands
- `npm run dev` / `build` / `start` / `lint` / `type-check` (tsc --noEmit). No test suite exists.
- Migrations are applied MANUALLY in Supabase Dashboard → SQL Editor (project `ogmizlviplorxstknlaj`). Repo is CLI-linked; do not `supabase db push` without asking. A migration file existing in the repo does NOT mean it's live — confirm in the Dashboard.

## Structure
- `src/app` — routes. Public (middleware allowlist): `/donate`, `/auth/*`, `/api/razorpay/{order,subscription,verify,webhook}`, `/api/donations/webhook` (Sevastack), `/api/sync/daily-reconcile` (Vercel cron `0 2 * * *` UTC via vercel.json; code comment says IST — wrong). Authed: `/` dashboard, `/account`, `/claim`. Admin: `/admin/*`, gated only by `requireAdmin()` in `src/app/admin/layout.tsx`.
- `src/lib/supabase/server.ts` — `createClient` (anon key + cookies, RLS applies) vs `createAdminClient` (SUPABASE_SERVICE_ROLE_KEY, bypasses RLS). Admin client is server-only; never let it reach client components.
- `src/lib/utils/ingest.ts` — single ingestion path for all donation sources; idempotent on `external_id`.
- `src/lib/razorpay.ts` — REST helpers + timing-safe HMAC verification (checkout + webhook).
- `supabase/migrations/001–006`. `006_razorpay.sql` adds `'razorpay'` to the `donation_source` enum.

## Auth flow
Email magic link (`signInWithOtp`) → `/auth/callback` (PKCE code exchange; users without a profile name → `/auth/setup`, which client-side upserts their `humrahis` row with role `humrahi`) or `/auth/confirm` (token_hash links). Middleware only refreshes the session and redirects signed-out users; the admin check is `requireAdmin()`, which trusts the **humrahis.role column** (read via service role). Migration 003 mirrors that role into the JWT for RLS policies.

## Env vars (NAMES only — values in Vercel prod env + local `.env.local`; never print or commit values)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STATIC_SITE_URL`, `NEXT_PUBLIC_SEVASTACK_DONATE_URL`, `NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL`, `SEVASTACK_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
`CRON_SECRET` is referenced in code but absent from `.env.local` and `.env.example` — it must be set in Vercel. `.env.example` also lists future keys: `TWILIO_*`, `SEVASTACK_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`.
`RESEND_API_KEY` is needed in **two separate places** (see Notification emails below): Supabase Edge Function secrets (for `submit-enquiry`) AND Vercel prod env (for donation emails). Optional `DONATION_NOTIFY_EMAILS` (Vercel, comma-separated; defaults to wecare@) sets who gets the internal donation alert.

## Notification emails (added 2026-07-09)
Branded transactional emails share one design (Cloud Dancer/Charcoal/Sindoor-Red shell, `manavta ki ek nayi pehchaan` sign-off). Two runtimes, two copies of the shell — keep them visually in sync if you touch one:
- **Donations** (Next.js): `src/lib/email/{render,send}.ts`. Fired from `/api/razorpay/verify` AND `/api/razorpay/webhook`, but **only when `ingestDonation` returns `inserted:true`** — that's why `ingest.ts` now does `.select("id")` on the upsert (an `ignoreDuplicates` conflict returns 0 rows). This is the exactly-once guard so verify+webhook don't double-email the donor. Sends: donor thank-you+receipt (only if `payment.email` present) and owner alert. **Never move the send into `ingestDonation`** — CSV/admin imports go through it too and must stay silent.
- **Enquiries** (Deno edge fn `submit-enquiry`): branded owner alert + warm auto-reply to the sender (volunteer/contact/newsletter). Redeploy after edits: `supabase functions deploy submit-enquiry --no-verify-jwt`.
- **GOTCHA — emails no-op silently until config is done** (all sends are fail-soft):
  1. `RESEND_API_KEY` must be in **Vercel** for donation emails (was only in Supabase edge secrets historically). Without it the code just `console.warn`s and skips.
  2. **Resend must be out of sandbox/test mode** with `myhumrahi.org` domain verified (DKIM/SPF DNS records), incl. `wecare@` and `noreply@` as From addresses. In sandbox, mail only reaches the account owner and comes from `onboarding@resend.dev` — this is the "test period" look. DNS for myhumrahi.org is on Hostinger (but MX = Google Workspace — never touch `@`/MX records).
  3. Edge fn also needs `NOTIFY_EMAILS` set in Supabase secrets for the team alert.

## KNOWN OPEN SECURITY ITEMS (verified in code)
1. **CRON_SECRET unset in Vercel** → `/api/sync/daily-reconcile` compares the header to the literal string `Bearer undefined`, so anyone sending that header passes — and legitimate Vercel cron gets 401. In non-production the check is skipped entirely. Set `CRON_SECRET`. (Route is a stub that only stamps `reconciled_at` via service role.)
2. **Self role-escalation to admin — fix written, PENDING MANUAL APPLY**: RLS policies `humrahis: self update` AND `self insert` (002_rls.sql) have no column restriction, so any signed-in user could set `role='admin'` on their own row via the anon client; `requireAdmin()` trusts exactly that column → full admin takeover. `007_role_guard.sql` adds a BEFORE INSERT/UPDATE trigger that pins `role` for anon/authenticated writers (silently preserves the old value — SetupForm upserts an explicit `role:'humrahi'`, so raising would break admins re-running setup). Run 007 in the Dashboard SQL editor, then run its commented spot-check. Item closes only when applied live. Role changes remain possible via service role/Dashboard; the trigger function must stay SECURITY INVOKER.
3. **FIXED in commit 0dbb7d1 (2026-07-10)** — `ingestDonation` now accumulates `contributed_amount_inr` (read-then-add, guarded by the once-per-payment `inserted` flag) instead of overwriting with the latest gift.
4. **GitHub PAT embedded in the `origin` remote URL** (`.git/config`). Rotate the token and re-add the remote without credentials.
Rotate on any suspected leak: SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, SEVASTACK_WEBHOOK_SECRET, CRON_SECRET, GitHub PAT, RESEND_API_KEY.

## Monthly recurring donations (Razorpay Subscriptions, added 2026-07-10)
- `/api/razorpay/subscription` creates plan+subscription server-side (`findOrCreateMonthlyPlan` reuses a monthly INR plan of the same amount from the first 100 plans; `total_count` 120 = 10 years; `customer_notify=1` so Razorpay emails the donor the mandate + manage/cancel link). DonateForm has a Give once / Give monthly toggle; the static site passes `?freq=monthly` through.
- Signature GOTCHA: subscription checkout signs `payment_id|subscription_id` (REVERSED vs orders' `order_id|payment_id`) — `verifySubscriptionCheckoutSignature` in `src/lib/razorpay.ts`.
- Webhook: subscribe `subscription.charged` in addition to `payment.captured` (Dashboard → Webhooks), but the code no longer depends on it — a `payment.captured` carrying an `invoice_id` resolves invoice → subscription via the API and ingests with the right designation/`is_recurring`; if that lookup fails it returns 500 so Razorpay retries rather than mislabeling. Both events firing = idempotent no-op duplicate.
- Designation for recurring gifts lives in the SUBSCRIPTION notes, not payment notes — never read it from a recurring payment entity. The verify route defers to the webhook (`deferred:true`) when it can't fetch subscription notes, because the first idempotent write wins forever.

## Rules
- Run `supabase/migrations/006_razorpay.sql` on live Supabase BEFORE the first Razorpay donation: ingestion inserts `source='razorpay'` and fails on the old enum (webhook 500s and retries; verify-path errors are swallowed, so the donation silently never lands in the DB).
- NEVER commit `.env.local` or echo secret values; `.gitignore` covers `.env*` — keep it that way.
- Razorpay commits (876f6d5, 03b5e8e) live on `fix/security-hardening`, pushed but unmerged → NOT in prod until merged to main. Local `main` is behind `origin/main` (merged PRs #1, #2); fetch before comparing branches.
- All donation writes go through `ingestDonation` with the service-role client; RLS intentionally blocks client-side donation inserts — preserve that.
- In `/api/razorpay/webhook`, read the raw body BEFORE JSON.parse — the signature covers the exact bytes. Both webhooks fail closed when their secret is unset; keep that behavior.
- `README-OWNER-APP.md` says admin login is phone + SMS OTP — stale; auth is email magic link.

See also: ../SECURITY-ROTATION.md (open rotation runbook) and ../CLAUDE.md (workspace rules).
