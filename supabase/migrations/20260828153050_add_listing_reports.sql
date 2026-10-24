-- Restored from Supabase schema history: 20260828153050 / add_listing_reports.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  listing_id text not null,
  report_type text not null check (report_type in ('wrong_info','closed','duplicate','phone','location','hours','other')),
  details text not null check (char_length(details) between 8 and 1200),
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','rejected')),
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

create index if not exists listing_reports_listing_id_idx on public.listing_reports(listing_id);

create index if not exists listing_reports_status_created_idx on public.listing_reports(status, created_at desc);

create index if not exists listing_reports_user_created_idx on public.listing_reports(user_id, created_at desc);

alter table public.listing_reports enable row level security;

create policy "Members can create own listing reports"
on public.listing_reports for insert to authenticated
with check (auth.uid() = user_id and status = 'pending' and reviewed_at is null and reviewed_by is null);

create policy "Members can view own listing reports"
on public.listing_reports for select to authenticated
using (auth.uid() = user_id or is_directory_admin());

create policy "Directory admins can update listing reports"
on public.listing_reports for update to authenticated
using (is_directory_admin())
with check (is_directory_admin());
