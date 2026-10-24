-- Restored from Supabase schema history: 20260828212454 / restrict_admin_analytics_rpc.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

revoke execute on function public.get_admin_analytics_stats() from public;

revoke execute on function public.get_admin_analytics_stats() from anon;

grant execute on function public.get_admin_analytics_stats() to authenticated;
