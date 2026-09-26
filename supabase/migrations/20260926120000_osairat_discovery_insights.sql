-- Daily visits are recorded from publication of this change; older page views were rejected by the event constraint.
alter table public.directory_analytics_events
  drop constraint directory_analytics_event_type_chk;
alter table public.directory_analytics_events
  add constraint directory_analytics_event_type_chk
  check (event_type = any (array[
    'page_view', 'directory_search', 'view_listing', 'phone_click',
    'whatsapp_click', 'maps_click', 'favorite_add', 'favorite_remove'
  ]::text[]));

create or replace function public.get_osairat_discovery_insights()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_from date := (now() at time zone 'Africa/Cairo')::date - 29;
  v_start timestamptz;
  v_result jsonb;
begin
  if not public.is_directory_admin() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  v_start := v_from::timestamp at time zone 'Africa/Cairo';

  with
  page_events as (
    select (created_at at time zone 'Africa/Cairo')::date as day,
           visitor_id, source_path
    from public.directory_analytics_events
    where event_type = 'page_view' and created_at >= v_start
      and source_path is not null and source_path !~ '^/(admin|api)(/|$)'
  ),
  daily as (
    select day, count(distinct visitor_id) as visitors, count(*) as views
    from page_events group by day
  ),
  first_visit as (
    select visitor_id, min((created_at at time zone 'Africa/Cairo')::date) as day
    from public.directory_analytics_events
    where event_type = 'page_view' and visitor_id is not null
      and source_path is not null and source_path !~ '^/(admin|api)(/|$)'
    group by visitor_id
  ),
  new_daily as (
    select day, count(*) as visitors from first_visit
    where day >= v_from group by day
  ),
  series as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'date', to_char(calendar.day, 'YYYY-MM-DD'),
      'newVisitors', coalesce(n.visitors, 0),
      'visitors', coalesce(d.visitors, 0),
      'views', coalesce(d.views, 0)
    ) order by calendar.day), '[]'::jsonb) as result
    from generate_series(v_from::timestamp, v_today::timestamp, interval '1 day') as calendar(day)
    left join daily d on d.day = calendar.day::date
    left join new_daily n on n.day = calendar.day::date
  ),
  pages as (
    select coalesce(jsonb_agg(jsonb_build_object('path', ranked.source_path,
      'views', ranked.views, 'visitors', ranked.visitors) order by ranked.views desc), '[]'::jsonb) as result
    from (select source_path, count(*) as views, count(distinct visitor_id) as visitors
      from page_events group by source_path order by views desc limit 8) ranked
  ),
  searches as (
    select search_term, village, category, result_count, created_at
    from public.directory_analytics_events
    where event_type = 'directory_search' and created_at >= v_start
      and search_term is not null and length(btrim(search_term)) >= 2
  ),
  search_total as (
    select count(*) as total, count(*) filter (where result_count = 0) as missed
    from searches
  ),
  misses as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'query', ranked.search_term, 'village', ranked.village,
      'category', ranked.category, 'count', ranked.occurrences,
      'lastSeenAt', ranked.last_seen
    ) order by ranked.occurrences desc, ranked.last_seen desc), '[]'::jsonb) as result
    from (
      select search_term, coalesce(village, 'all') as village,
        coalesce(category, 'all') as category, count(*) as occurrences, max(created_at) as last_seen
      from searches where result_count = 0
        and search_term !~ '[0-9]{7,}'
        and search_term !~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}'
      group by search_term, village, category
      order by occurrences desc, last_seen desc limit 12
    ) ranked
  )
  select jsonb_build_object(
    'generatedAt', now(), 'dailySeries', series.result,
    'topPages', pages.result,
    'searchSummary', jsonb_build_object('total', search_total.total, 'missed', search_total.missed),
    'missedSearches', misses.result
  )
  into v_result
  from series cross join pages cross join search_total cross join misses;
  return v_result;
end;
$function$;

revoke all on function public.get_osairat_discovery_insights() from public, anon;
grant execute on function public.get_osairat_discovery_insights() to authenticated;