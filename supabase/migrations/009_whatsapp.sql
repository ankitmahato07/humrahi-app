-- ────────────────────────────────────────────────────────────
-- 009_whatsapp.sql — "Send me drive alerts on WhatsApp" opt-in
--
-- Adds a WhatsApp opt-in flag to the two places the static site captures it:
--   • profiles  — the account details form (account.html / auth.js upsert)
--   • enquiries — the homepage volunteer form (submit-enquiry Edge Function)
--
-- Both are additive, nullable-with-default columns → safe, reversible, and no
-- backfill needed (existing rows default to false = not opted in).
--
-- Apply: paste into Supabase Dashboard → SQL Editor (project ogmizlviplorxstknlaj),
-- per the project's manual-migration convention (humrahi-app/CLAUDE.md).
--
-- IMPORTANT — two-part rollout:
--   1. profiles.wants_whatsapp works as soon as this runs. auth.js already
--      sends it and self-heals if it's missing (drops the field + retries), so
--      Save never breaks; the opt-in simply starts persisting once this lands.
--   2. enquiries.wants_whatsapp ALSO needs the submit-enquiry Edge Function
--      updated to read + insert `wants_whatsapp` (it currently stores a fixed
--      column set), then redeployed:
--          supabase functions deploy submit-enquiry --no-verify-jwt
--      Until that redeploy, the volunteer form still captures the opt-in by
--      appending "[WhatsApp drive alerts: opted in]" to the enquiry message
--      (see assets/forms.js), so nothing is lost in the meantime.
-- ────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists wants_whatsapp boolean not null default false;

alter table public.enquiries
  add column if not exists wants_whatsapp boolean not null default false;
