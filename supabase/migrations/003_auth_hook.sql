-- ============================================================
-- Custom Access Token Hook
-- Mirrors the humrahi role from humrahis.role into the JWT
-- so RLS policies can read auth.jwt()->>'role'.
--
-- Apply in Supabase Dashboard:
--   Authentication → Hooks → Custom Access Token → enable this function.
-- ============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
stable
as $$
declare
  claims jsonb;
  user_role text;
begin
  -- Fetch role from humrahis table
  select role::text
  into user_role
  from public.humrahis
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  -- Inject role claim
  if user_role is not null then
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  else
    -- New user not yet in humrahis — default to humrahi
    claims := jsonb_set(claims, '{role}', '"humrahi"');
  end if;

  -- Return modified event
  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Grant the hook function access to read humrahis
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on public.humrahis to supabase_auth_admin;
