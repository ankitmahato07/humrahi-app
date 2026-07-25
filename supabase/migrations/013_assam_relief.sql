-- ────────────────────────────────────────────────────────────
-- 013_assam_relief.sql — Assam flood relief drive (Siliguri goods collection)
--
-- Money donations already flow into Seva Stack automatically via its hosted
-- donate page. These two tables capture the parts Seva Stack can't see until
-- someone types them in: in-kind goods PLEDGES from the public, and the relief
-- BENEFICIARIES the goods were distributed to. /admin/relief exports both for
-- manual entry into the Seva Stack dashboard and tracks sync status.
--
-- Both hold PII (names, phones, villages) — locked down exactly like 011:
-- RLS on with NO anon/authenticated policies, so the ONLY reader/writer is the
-- service role (public API insert + /admin/relief), which bypasses RLS.
--
-- Apply: paste into Supabase Dashboard → SQL Editor (project ogmizlviplorxstknlaj),
-- per the project's manual-migration convention (humrahi-app/CLAUDE.md).
-- ────────────────────────────────────────────────────────────

-- In-kind goods pledges. No phone uniqueness: one person pledging twice is
-- normal and both pledges are real collections to chase.
create table if not exists public.relief_pledges (
  id                       uuid primary key default gen_random_uuid(),
  created_at               timestamptz not null default now(),
  name                     text not null,
  phone                    text not null,          -- normalized to +91XXXXXXXXXX
  email                    text,
  city                     text,
  items                    text not null,          -- free text: "20 blankets, 5 kg rice"
  note                     text,
  status                   text not null default 'pledged'
                             check (status in ('pledged','received','synced')),
  synced_to_sevastack_at   timestamptz
);

create index if not exists relief_pledges_status_idx
  on public.relief_pledges (status);

-- People the relief goods actually reached. Entered by the team in /admin/relief.
create table if not exists public.relief_beneficiaries (
  id                       uuid primary key default gen_random_uuid(),
  created_at               timestamptz not null default now(),
  name                     text not null,
  phone                    text,
  village                  text,
  district                 text default 'Assam',
  household_size           int,
  items_given              text not null,
  distributed_on           date not null default current_date,
  notes                    text,
  recorded_by              text,
  synced_to_sevastack_at   timestamptz
);

create index if not exists relief_beneficiaries_distributed_on_idx
  on public.relief_beneficiaries (distributed_on desc);

-- RLS on, NO policies → service-role-only (anon/authenticated see nothing).
alter table public.relief_pledges       enable row level security;
alter table public.relief_beneficiaries enable row level security;
