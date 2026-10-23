-- Restored from Supabase schema history: 20260828101818 / harden_business_submission_grants.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

revoke all privileges on table public.business_submissions from anon;

revoke all privileges on table public.business_submissions from authenticated;

grant select, insert on table public.business_submissions to authenticated;
