-- ────────────────────────────────────────────────────────────
-- 011_jobready_signups.sql — JobReady skilling funnel (beneficiary leads)
--
-- Public /jobready page collects beneficiaries who want the free Wadhwani
-- Foundation JobReady skilling programme (Humrahi = local training partner).
-- These are PII leads (name, WhatsApp, sometimes minors) — locked down HARD:
-- RLS on, and NO anon/authenticated policies at all. The ONLY reader/writer is
-- the service role (API route insert + /admin/jobready reads), which bypasses
-- RLS. No browser client ever touches this table.
--
-- Apply: paste into Supabase Dashboard → SQL Editor (project ogmizlviplorxstknlaj),
-- per the project's manual-migration convention (humrahi-app/CLAUDE.md).
-- ────────────────────────────────────────────────────────────

create table if not exists public.jobready_signups (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  full_name             text not null,
  whatsapp_phone        text not null,
  email                 text,
  language              text not null default 'bn' check (language in ('bn','en')),
  is_minor              boolean not null default false,
  guardian_consent      boolean not null default false,
  invited_to_sevastack  boolean not null default false,
  notes                 text
);

-- Fast dedupe-by-phone lookups (the API checks this on every signup).
create index if not exists jobready_signups_phone_idx
  on public.jobready_signups (whatsapp_phone);

-- RLS on, NO policies → table is service-role-only (anon/authenticated see nothing).
alter table public.jobready_signups enable row level security;
