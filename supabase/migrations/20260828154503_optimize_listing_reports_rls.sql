-- Restored from Supabase schema history: 20260828154503 / optimize_listing_reports_rls.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

drop policy if exists "Members can create own listing reports" on public.listing_reports;

drop policy if exists "Members can view own listing reports" on public.listing_reports;

create policy "Members can create own listing reports"
on public.listing_reports for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'pending' and reviewed_at is null and reviewed_by is null);

create policy "Members can view own listing reports"
on public.listing_reports for select to authenticated
using ((select auth.uid()) = user_id or is_directory_admin());
