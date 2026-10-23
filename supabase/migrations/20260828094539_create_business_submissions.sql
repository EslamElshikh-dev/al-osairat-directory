-- Restored from Supabase schema history: 20260828094539 / create_business_submissions.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create table if not exists public.business_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  category text not null,
  sub_category text,
  village text not null,
  locality text,
  location_details text not null,
  phone text,
  whatsapp text,
  hours text,
  description text,
  google_maps_url text,
  status text not null default 'pending' check (status in ('pending','needs_changes','approved','rejected')),
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists business_submissions_user_id_idx on public.business_submissions(user_id);

create index if not exists business_submissions_status_idx on public.business_submissions(status);

create index if not exists business_submissions_created_at_idx on public.business_submissions(created_at desc);

alter table public.business_submissions enable row level security;

drop policy if exists "Members can view own business submissions" on public.business_submissions;

create policy "Members can view own business submissions"
on public.business_submissions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Members can create own business submissions" on public.business_submissions;

create policy "Members can create own business submissions"
on public.business_submissions
for insert
to authenticated
with check (auth.uid() = user_id and status = 'pending' and review_note is null and reviewed_at is null);

create or replace function public.set_business_submissions_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_business_submissions_updated_at on public.business_submissions;

create trigger set_business_submissions_updated_at
before update on public.business_submissions
for each row execute function public.set_business_submissions_updated_at();

revoke all on function public.set_business_submissions_updated_at() from public, anon, authenticated;
