# CLAUDE.md — humrahi-app

Donor dashboard at **app.myhumrahi.org** (LIVE again since 2026-07-16 — revamped per
`../dashboard-revamp-spec.md`). Next.js 15 App Router, React 19, Tailwind 3, Supabase.
Deploys: Vercel project **`humrahi-app`** (the old `humrahi-app-iuvy` was deleted 2026-07-14),
production = `main`, git-connected. Supabase project `ogmizlviplorxstknlaj` (ap-southeast-2).
The public site myhumrahi.org is a separate codebase — never touch it from here.

**2026-07-16 revamp (donor-facing):** identity = `profiles` table (shared with the static site's
account.html) — `humrahis` is ONLY the admin-role gate; donations are read from **Seva Stack**
server-side (`src/lib/sevastack.ts`, env `SEVASTACK_API_KEY`) — the local `donations` table and
ingest/webhook/reconcile paths are dormant, do not revive for donor pages; 80G receipts are
pdf-lib PDFs at `/api/receipts/[id]` + `/api/receipts/statement?fy=` (org constants inline) with
Seva Stack `send_receipt` for email resends; campaigns = `drives` rows (`/campaigns`, admin CRUD
at /admin/drives); first-login tour persists in `profiles.tour_done_at` (010); Google OAuth +
magic link on /auth/login; post-auth redirects go through `src/lib/safeNext.ts` (open-redirect
guard — keep it on every `next` param consumer).

**⚠️ VERCEL GOTCHA:** a project created via bare `vercel project add` gets Framework Preset
"Other" — builds look successful but EVERY path (pages and /_next/static) platform-404s.
Fix in dashboard: Settings → Build and Deployment → Framework Preset → Next.js, redeploy.

## Commands
- `npm run dev` / `build` / `start` / `lint` / `type-check` (tsc --noEmit). No test suite exists.
- Migrations are applied MANUALLY in Supabase Dashboard → SQL Editor (project `ogmizlviplorxstknlaj`). Repo is CLI-linked; do not `supabase db push` without asking. A migration file existing in the repo does NOT mean it's live — confirm in the Dashboard.

## Structure
- `src/app` — routes. Public (middleware allowlist): `/donate` (a bare 308 redirect to the static donate.html — the app takes NO money itself), `/auth/*`. Authed: `/` dashboard, `/account`, `/donations`, `/receipts`, `/campaigns`. Admin: `/admin/*`, gated only by `requireAdmin()` in `src/app/admin/layout.tsx`.
- `src/lib/supabase/server.ts` — `createClient` (anon key + cookies, RLS applies) vs `createAdminClient` (SUPABASE_SERVICE_ROLE_KEY, bypasses RLS). Admin client is server-only; never let it reach client components.
- `supabase/migrations/001–010` (applied manually; a file in the repo does NOT mean it's live).

**RAZORPAY/INGEST SUBSYSTEM REMOVED 2026-07-16 (commit 646f4c7).** The internal donate checkout,
`/api/razorpay/*`, `/api/donations/webhook`, `/api/sync/daily-reconcile` + its vercel.json cron,
`src/lib/razorpay.ts`, `src/lib/utils/ingest.ts`, `src/lib/email/*`, `/claim`, and the admin CSV
importer are GONE — it was dormant by design but its /donate was live+indexable and could capture
money Seva Stack never saw (= no 80G receipt). Donor pages read Seva Stack only (VERIFIED-only,
`src/lib/sevastack.ts`); the local `donations` table is a read-only leftover (admin view renders
it; no writer exists). Don't resurrect any of it — `git show 646f4c7` if you need the old code.
Leftover-but-harmless: `donation_source` enum values, `*.razorpay.com` CSP entries in
next.config.ts, RAZORPAY_*/SEVASTACK_WEBHOOK_SECRET/CRON_SECRET/RESEND_API_KEY env vars in Vercel.

## Auth flow
Email magic link (`signInWithOtp`) → `/auth/callback` (PKCE code exchange; users without a profile name → `/auth/setup`, which client-side upserts their `humrahis` row with role `humrahi`) or `/auth/confirm` (token_hash links). Middleware only refreshes the session and redirects signed-out users; the admin check is `requireAdmin()`, which trusts the **humrahis.role column** (read via service role). Migration 003 mirrors that role into the JWT for RLS policies.

## Env vars (NAMES only — values in Vercel prod env + local `.env.local`; never print or commit values)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STATIC_SITE_URL`, `NEXT_PUBLIC_SEVASTACK_DONATE_URL`, `NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL`, `SEVASTACK_API_KEY`.
(Razorpay/webhook/cron/Resend vars still set in Vercel are dead since the 2026-07-16 excision — harmless, remove whenever.)

## Notification emails
Only the **enquiries** email path remains (Deno edge fn `submit-enquiry`, branded owner alert +
auto-reply; redeploy after edits: `supabase functions deploy submit-enquiry --no-verify-jwt`; needs
`RESEND_API_KEY` + `NOTIFY_EMAILS` in Supabase edge secrets; Resend must be out of sandbox with
myhumrahi.org DKIM/SPF verified — DNS on Hostinger, MX = Google Workspace, never touch `@`/MX).
The Next.js donation-email path was removed with the Razorpay subsystem (2026-07-16). Donor 80G
receipt emails come from Seva Stack (`send_receipt`).

## SECURITY ITEMS (status as of 2026-07-16)
1. **CLOSED 2026-07-16** — `CRON_SECRET` set in Vercel prod; `Bearer undefined` probe returns 401 (verified live).
2. **CLOSED 2026-07-16** — `007_role_guard.sql` APPLIED on the live project (trigger `humrahis_guard_role` verified via pg_trigger). Role changes remain possible via service role/Dashboard; the trigger function must stay SECURITY INVOKER.
3. **OBSOLETE** — the `ingestDonation` accumulation fix (0dbb7d1) went away with ingest.ts itself (646f4c7, 2026-07-16).
4. **CLOSED 2026-07-16** — origin remote is credential-free (`https://github.com/ankitmahato07/humrahi-app.git`); pushes use `gh` auth. Still rotate the old PAT at github.com if it was never revoked.
5. **FIXED 2026-07-16** — post-auth open redirect (`?next=@evil.com` / `//evil.com`) in auth/callback, auth/confirm, SetupForm; all `next` params now pass through `src/lib/safeNext.ts`.
Rotate on any suspected leak: SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, SEVASTACK_WEBHOOK_SECRET, CRON_SECRET, GitHub PAT, RESEND_API_KEY.

## Monthly recurring donations
Handled entirely OUTSIDE this app since the 2026-07-16 excision: the static site's donate.html
calls the `create-subscription` edge function (in `supabase/functions/` here) → Razorpay hosted
subscription checkout. Seva Stack's Razorpay webhook records the money and issues 80G receipts.

## Rules
- NEVER commit `.env.local` or echo secret values; `.gitignore` covers `.env*` — keep it that way.
- RLS intentionally blocks client-side donation inserts — preserve that (the local `donations`
  table is a read-only leftover; no app writer exists anymore).

See also: ../SECURITY-ROTATION.md (open rotation runbook) and ../CLAUDE.md (workspace rules).
