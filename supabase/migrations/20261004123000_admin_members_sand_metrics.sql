-- Admin-only account list and privacy-preserving daily Sand metrics.
create or replace function public.get_osairat_member_accounts()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_directory_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'name', coalesce(nullif(p.full_name, ''), nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
      'createdAt', u.created_at,
      'verified', u.email_confirmed_at is not null or u.phone_confirmed_at is not null,
      'avatarUrl', p.avatar_url,
      'village', p.village
    ) order by u.created_at desc), '[]'::jsonb)
    from auth.users u left join public.profiles p on p.id = u.id
    where u.deleted_at is null
  );
end;
$$;
revoke all on function public.get_osairat_member_accounts() from public, anon;
grant execute on function public.get_osairat_member_accounts() to authenticated;

create table if not exists public.sand_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  mode text not null check (mode in ('direct', 'emergency', 'groq', 'cloudflare')),
  intent text not null check (length(intent) between 1 and 40),
  data_source text not null check (data_source in ('none', 'supabase', 'local_snapshot', 'static_emergency')),
  result_count integer not null check (result_count between 0 and 10000),
  duration_ms integer not null check (duration_ms between 0 and 60000)
);
create index if not exists sand_requests_created_at_idx on public.sand_requests (created_at desc);
alter table public.sand_requests enable row level security;
revoke all on public.sand_requests from public, anon, authenticated;
grant insert on public.sand_requests to anon, authenticated;
grant select on public.sand_requests to authenticated;
grant usage on sequence public.sand_requests_id_seq to anon, authenticated;
drop policy if exists sand_requests_insert on public.sand_requests;
create policy sand_requests_insert on public.sand_requests for insert to anon, authenticated
  with check (created_at between now() - interval '5 minutes' and now() + interval '1 minute');
drop policy if exists sand_requests_admin_read on public.sand_requests;
create policy sand_requests_admin_read on public.sand_requests for select to authenticated
  using ((select public.is_directory_admin()));

create or replace function public.get_osairat_sand_insights()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if auth.uid() is null or not public.is_directory_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;
  return jsonb_build_object(
    'today', (select count(*) from public.sand_requests where (created_at at time zone 'Africa/Cairo')::date = v_today),
    'yesterday', (select count(*) from public.sand_requests where (created_at at time zone 'Africa/Cairo')::date = v_today - 1),
    'requests30d', (select count(*) from public.sand_requests where created_at >= now() - interval '30 days'),
    'withResults30d', (select count(*) from public.sand_requests where created_at >= now() - interval '30 days' and result_count > 0),
    'noResults30d', (select count(*) from public.sand_requests where created_at >= now() - interval '30 days' and intent = 'directory' and result_count = 0),
    'ai30d', (select count(*) from public.sand_requests where created_at >= now() - interval '30 days' and mode in ('groq', 'cloudflare')),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', d.day::date, 'requests', coalesce(s.total, 0),
        'withResults', coalesce(s.matched, 0), 'noResults', coalesce(s.missed, 0)
      ) order by d.day), '[]'::jsonb)
      from generate_series(v_today - 13, v_today, interval '1 day') as d(day)
      left join (
        select (created_at at time zone 'Africa/Cairo')::date as report_date,
          count(*) as total,
          count(*) filter (where result_count > 0) as matched,
          count(*) filter (where intent = 'directory' and result_count = 0) as missed
        from public.sand_requests
        where created_at >= ((v_today - 13)::timestamp at time zone 'Africa/Cairo')
        group by 1
      ) s on s.report_date = d.day::date
    ),
    'generatedAt', now()
  );
end;
$$;
revoke all on function public.get_osairat_sand_insights() from public, anon;
grant execute on function public.get_osairat_sand_insights() to authenticated;
