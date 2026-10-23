-- Restored from Supabase schema history: 20260828101752 / grant_member_business_submission_access.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

grant select, insert on table public.business_submissions to authenticated;

revoke update, delete on table public.business_submissions from authenticated;

revoke select, insert, update, delete on table public.business_submissions from anon;
