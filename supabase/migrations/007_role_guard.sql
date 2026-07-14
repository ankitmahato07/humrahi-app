-- ============================================================
-- 007 — Guard humrahis.role against client-side escalation
--
-- Closes KNOWN OPEN SECURITY ITEM #2: the "humrahis: self update"
-- and "humrahis: self insert" policies (002_rls.sql) have no column
-- restriction, so any signed-in user could set role='admin' on their
-- own row via the anon client, and requireAdmin() trusts that column.
--
-- Approach: BEFORE INSERT OR UPDATE trigger that pins the role column
-- whenever the write arrives through an API-reachable untrusted DB
-- role (anon / authenticated / authenticator). It silently preserves
-- the existing value instead of raising, because the setup flow
-- (SetupForm.tsx) upserts with an explicit role:'humrahi' — raising
-- would break that upsert for existing admins. service_role, postgres
-- and the Dashboard SQL editor are untouched, so admin role changes
-- keep working through requireAdmin()'s service client.
--
-- The function MUST stay SECURITY INVOKER (the default): with
-- SECURITY DEFINER, current_user inside would be the function owner
-- and the check would pass for everyone.
--
-- Migration 003's JWT mirror (custom_access_token_hook) only SELECTs
-- humrahis.role as supabase_auth_admin and is unaffected.
-- ============================================================

create or replace function public.guard_humrahi_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated', 'authenticator') then
    if tg_op = 'INSERT' then
      new.role := 'humrahi';
    else
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists humrahis_guard_role on public.humrahis;

create trigger humrahis_guard_role
  before insert or update on public.humrahis
  for each row
  execute function public.guard_humrahi_role();

-- ── Post-apply spot-check (run in SQL editor) ────────────────
-- select tgname from pg_trigger
--   where tgrelid = 'public.humrahis'::regclass and not tgisinternal;
-- → expect humrahis_guard_role + humrahis_updated_at.
--
-- Full behavioral test (safe, rolls back):
-- begin;
--   insert into auth.users (id, instance_id, aud, role, email)
--     values ('00000000-0000-4000-8000-00000000f007',
--             '00000000-0000-0000-0000-000000000000',
--             'authenticated', 'authenticated', 'guardtest@example.invalid');
--   insert into public.humrahis (id, first_name)
--     values ('00000000-0000-4000-8000-00000000f007', 'GuardTest');
--   set local role authenticated;
--   set local request.jwt.claims =
--     '{"sub":"00000000-0000-4000-8000-00000000f007","role":"authenticated"}';
--   update public.humrahis set role = 'admin'
--     where id = '00000000-0000-4000-8000-00000000f007';
--   select role from public.humrahis
--     where id = '00000000-0000-4000-8000-00000000f007';  -- must be 'humrahi'
-- rollback;
