-- Restored from Supabase schema history: 20260828233508 / final_security_least_privilege_hardening.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

-- Remove legacy table capabilities that browser-facing roles never need.
revoke truncate, trigger, references on table public.favorites from anon, authenticated;

revoke truncate, trigger, references on table public.listing_reports from anon, authenticated;

revoke truncate, trigger, references on table public.profiles from anon, authenticated;

-- Restore only the application privileges required by existing RLS policies/routes.
grant select, insert on table public.listing_reports to authenticated;

grant update on table public.member_notifications to authenticated;

-- Analytics inserts need sequence USAGE, not sequence inspection.
revoke select on sequence public.directory_analytics_events_id_seq from anon, authenticated;

grant usage on sequence public.directory_analytics_events_id_seq to anon, authenticated;

-- Trigger helpers must not remain directly executable through PUBLIC defaults.
revoke all on function public.set_business_ownership_claims_updated_at() from public, anon, authenticated;

revoke all on function public.touch_published_business_updated_at() from public, anon, authenticated;

grant execute on function public.set_business_ownership_claims_updated_at() to postgres;

grant execute on function public.touch_published_business_updated_at() to postgres;
