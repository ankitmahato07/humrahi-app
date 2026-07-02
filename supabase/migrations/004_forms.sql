-- ────────────────────────────────────────────────────────────
-- 004_forms.sql — public website form intake
--
-- The static site (Hostinger) posts volunteer + contact enquiries into the
-- existing `enquiries` table and newsletter sign-ups into `newsletter_signups`,
-- via the `submit-enquiry` Edge Function (service role). No table below is
-- writable by the anon key — all inserts go through the function.
-- ────────────────────────────────────────────────────────────

create table if not exists newsletter_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  source      text,                       -- e.g. 'web:newsletter'
  created_at  timestamptz not null default now()
);

create index if not exists newsletter_signups_created_idx on newsletter_signups(created_at desc);

-- RLS on, with NO anon/authenticated policies: only the service role (used by
-- the Edge Function and admin server routes) can read/write. This mirrors how
-- `enquiries` is locked down in 002_rls.sql.
alter table newsletter_signups enable row level security;

-- Admin read access is granted through the same admin-role policy pattern used
-- elsewhere; add here if/when the admin console surfaces newsletter sign-ups.
-- (Intentionally left with no permissive policies for now.)
