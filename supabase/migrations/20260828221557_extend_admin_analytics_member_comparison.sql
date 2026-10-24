-- Restored from Supabase schema history: 20260828221557 / extend_admin_analytics_member_comparison.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create or replace function public.get_admin_analytics_stats()
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'auth'
as $$
declare
  v_result jsonb;
begin
  if not public.is_directory_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select jsonb_build_object(
    'members', jsonb_build_object(
      'total', (select count(*) from auth.users),
      'verified', (select count(*) from auth.users where email_confirmed_at is not null or phone_confirmed_at is not null),
      'last7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
      'previous7d', (select count(*) from auth.users where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days'),
      'last30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
      'profiles', (select count(*) from public.profiles)
    ),
    'engagement', jsonb_build_object(
      'favorites', (select count(*) from public.favorites),
      'notifications', (select count(*) from public.member_notifications),
      'unreadNotifications', (select count(*) from public.member_notifications where read_at is null)
    ),
    'submissions', jsonb_build_object(
      'total', (select count(*) from public.business_submissions),
      'pending', (select count(*) from public.business_submissions where status = 'pending'),
      'needsChanges', (select count(*) from public.business_submissions where status = 'needs_changes'),
      'approved', (select count(*) from public.business_submissions where status = 'approved'),
      'rejected', (select count(*) from public.business_submissions where status = 'rejected')
    ),
    'claims', jsonb_build_object(
      'total', (select count(*) from public.business_ownership_claims),
      'pending', (select count(*) from public.business_ownership_claims where status = 'pending'),
      'needsChanges', (select count(*) from public.business_ownership_claims where status = 'needs_changes'),
      'approved', (select count(*) from public.business_ownership_claims where status = 'approved'),
      'rejected', (select count(*) from public.business_ownership_claims where status = 'rejected')
    ),
    'reports', jsonb_build_object(
      'total', (select count(*) from public.listing_reports),
      'pending', (select count(*) from public.listing_reports where status = 'pending'),
      'reviewing', (select count(*) from public.listing_reports where status = 'reviewing'),
      'resolved', (select count(*) from public.listing_reports where status = 'resolved'),
      'rejected', (select count(*) from public.listing_reports where status = 'rejected')
    ),
    'changes', jsonb_build_object(
      'total', (select count(*) from public.listing_change_requests),
      'pending', (select count(*) from public.listing_change_requests where status = 'pending'),
      'needsChanges', (select count(*) from public.listing_change_requests where status = 'needs_changes'),
      'approved', (select count(*) from public.listing_change_requests where status = 'approved'),
      'rejected', (select count(*) from public.listing_change_requests where status = 'rejected')
    ),
    'directory', jsonb_build_object(
      'publishedBusinesses', (select count(*) from public.published_businesses where is_active is true),
      'approvedOwnerships', (select count(*) from public.listing_ownerships)
    ),
    'registrationSeries', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d.day::date, 'count', coalesce(u.count, 0)) order by d.day), '[]'::jsonb)
      from generate_series(current_date - 13, current_date, interval '1 day') as d(day)
      left join (
        select created_at::date as day, count(*) as count
        from auth.users
        where created_at >= current_date - interval '13 days'
        group by created_at::date
      ) u on u.day = d.day::date
    ),
    'activitySeries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', d.day::date,
        'submissions', coalesce(s.count, 0),
        'claims', coalesce(c.count, 0),
        'reports', coalesce(r.count, 0)
      ) order by d.day), '[]'::jsonb)
      from generate_series(current_date - 13, current_date, interval '1 day') as d(day)
      left join (
        select created_at::date as day, count(*) as count from public.business_submissions
        where created_at >= current_date - interval '13 days' group by created_at::date
      ) s on s.day = d.day::date
      left join (
        select created_at::date as day, count(*) as count from public.business_ownership_claims
        where created_at >= current_date - interval '13 days' group by created_at::date
      ) c on c.day = d.day::date
      left join (
        select created_at::date as day, count(*) as count from public.listing_reports
        where created_at >= current_date - interval '13 days' group by created_at::date
      ) r on r.day = d.day::date
    ),
    'generatedAt', now()
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_admin_analytics_stats() from anon;

grant execute on function public.get_admin_analytics_stats() to authenticated;
