-- Restored from Supabase schema history: 20260828085450 / lock_down_internal_auth_functions.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- This managed Supabase helper is optional on a fresh/local stack.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
