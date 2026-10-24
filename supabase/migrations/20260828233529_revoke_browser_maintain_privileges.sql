-- Restored from Supabase schema history: 20260828233529 / revoke_browser_maintain_privileges.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

revoke maintain on table public.favorites from anon, authenticated;

revoke maintain on table public.listing_reports from anon, authenticated;

revoke maintain on table public.profiles from anon, authenticated;
