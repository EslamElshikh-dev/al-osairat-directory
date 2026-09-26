-- Local offers and job seekers for Al Osairat. Submissions stay private until reviewed.
create table if not exists public.osairat_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('offer', 'seeker')),
  origin text not null default 'community' check (origin in ('community', 'external')),
  title text not null check (char_length(title) between 5 and 160),
  organization text check (char_length(organization) <= 120),
  village text not null check (char_length(village) between 2 and 100),
  field text not null check (char_length(field) between 2 and 80),
  description text not null check (char_length(description) between 20 and 2000),
  experience text check (char_length(experience) <= 300),
  work_type text check (work_type in ('full-time', 'part-time', 'temporary', 'flexible')),
  contact_kind text not null check (contact_kind in ('phone', 'whatsapp', 'email', 'link')),
  contact_value text not null check (char_length(contact_value) between 6 and 500),
  source_name text check (char_length(source_name) <= 120),
  source_url text check (char_length(source_url) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  expires_at timestamptz not null default (now() + interval '45 days'),
  constraint osairat_jobs_source_valid check (origin = 'community' or (source_name is not null and source_url is not null))
);

create index if not exists osairat_jobs_public_idx on public.osairat_jobs (published_at desc)
  where status = 'approved';
create index if not exists osairat_jobs_owner_idx on public.osairat_jobs (user_id, created_at desc);
create index if not exists osairat_jobs_pending_idx on public.osairat_jobs (created_at desc)
  where status = 'pending';

alter table public.osairat_jobs enable row level security;

create policy "Published active jobs visible to everyone" on public.osairat_jobs
  for select to anon, authenticated
  using (status = 'approved' and expires_at > now());
create policy "Members see own job submissions" on public.osairat_jobs
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Admins see all job submissions" on public.osairat_jobs
  for select to authenticated
  using ((select public.is_directory_admin()));
create policy "Members submit jobs for moderation" on public.osairat_jobs
  for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and origin = 'community' and status = 'pending'
      and published_at is null and source_name is null and source_url is null)
    or (select public.is_directory_admin())
  );
create policy "Admins review job submissions" on public.osairat_jobs
  for update to authenticated
  using ((select public.is_directory_admin()))
  with check ((select public.is_directory_admin()));

revoke all on public.osairat_jobs from public, anon, authenticated;
grant select on public.osairat_jobs to anon;
grant select, insert, update on public.osairat_jobs to authenticated;
