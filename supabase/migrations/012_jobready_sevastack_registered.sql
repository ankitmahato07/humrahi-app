-- ────────────────────────────────────────────────────────────
-- 012_jobready_sevastack_registered.sql — mark a JobReady lead as a
-- confirmed Seva Stack beneficiary.
--
-- The team creates the person in Seva Stack out-of-band, then flips this in
-- /admin/jobready. Only once this is set does the logged-in Humrahi dashboard
-- unlock the Wadhwani enrolment button for that person (matched by email).
-- NULL = not yet registered; a timestamp = registered at that time.
--
-- Apply: paste into Supabase Dashboard → SQL Editor (project ogmizlviplorxstknlaj),
-- per the project's manual-migration convention (humrahi-app/CLAUDE.md).
-- ────────────────────────────────────────────────────────────

alter table public.jobready_signups
  add column if not exists sevastack_registered_at timestamptz;
