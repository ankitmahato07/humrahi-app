-- ────────────────────────────────────────────────────────────
-- 008_profiles.sql — supporter accounts (Supabase Auth + profile)
--
-- Backs the static site's account.html (sign up / log in with Google or an
-- email magic-link). One profile row per auth user, holding the light
-- supporter details we actually need: name, phone, organisation, and an
-- "email me updates" flag. PAN + postal address are NOT here — those stay in
-- the donation flow (Seva Stack), collected at first gift.
--
-- Locked down like every other table (see 002_rls.sql): RLS on, and a user can
-- only ever see or edit their OWN row. Admin/CRM reads go through the service
-- role, which bypasses RLS.
--
-- Apply: paste into Supabase Dashboard → SQL Editor (project ogmizlviplorxstknlaj),
-- per the project's manual-migration convention (humrahi-app/CLAUDE.md).
-- ────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  phone         text,
  org_name      text,
  account_type  text not null default 'individual'
                check (account_type in ('individual','organisation')),
  wants_updates boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Own-row-only access. No anon/public policies at all.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create the row on signup, pulling the name from Google metadata when
-- present so a Google sign-up lands with the name already filled.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_touch_updated on public.profiles;
create trigger profiles_touch_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();
