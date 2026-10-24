-- Restored from Supabase schema history: 20260828222554 / directory_intelligence_and_security_hardening.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

-- First-party operational analytics for search intelligence and per-listing performance.
create table if not exists public.directory_analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  session_id text not null,
  listing_id text,
  listing_slug text,
  search_term text,
  village text,
  category text,
  result_count integer,
  source_path text,
  created_at timestamptz not null default now(),
  constraint directory_analytics_event_type_chk check (event_type in ('directory_search','view_listing','phone_click','whatsapp_click','maps_click','favorite_add','favorite_remove')),
  constraint directory_analytics_session_chk check (char_length(session_id) between 8 and 80),
  constraint directory_analytics_listing_id_chk check (listing_id is null or char_length(listing_id) <= 180),
  constraint directory_analytics_listing_slug_chk check (listing_slug is null or char_length(listing_slug) <= 180),
  constraint directory_analytics_search_chk check (search_term is null or char_length(search_term) <= 120),
  constraint directory_analytics_village_chk check (village is null or char_length(village) <= 100),
  constraint directory_analytics_category_chk check (category is null or char_length(category) <= 100),
  constraint directory_analytics_result_chk check (result_count is null or result_count between 0 and 100000),
  constraint directory_analytics_path_chk check (source_path is null or char_length(source_path) <= 240)
);

alter table public.directory_analytics_events enable row level security;

revoke all on table public.directory_analytics_events from public, anon, authenticated;

grant insert on table public.directory_analytics_events to anon, authenticated;

grant usage, select on sequence public.directory_analytics_events_id_seq to anon, authenticated;

create policy directory_analytics_insert_only
on public.directory_analytics_events
for insert
to anon, authenticated
with check (
  event_type in ('directory_search','view_listing','phone_click','whatsapp_click','maps_click','favorite_add','favorite_remove')
  and session_id ~ '^[A-Za-z0-9_-]{8,80}$'
  and (source_path is null or source_path like '/%')
  and (search_term is null or search_term !~* '([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|(^|[^0-9])01[0-9]{9}([^0-9]|$))')
);

create index if not exists directory_analytics_created_idx on public.directory_analytics_events(created_at desc);

create index if not exists directory_analytics_event_created_idx on public.directory_analytics_events(event_type, created_at desc);

create index if not exists directory_analytics_listing_created_idx on public.directory_analytics_events(listing_id, created_at desc) where listing_id is not null;

create index if not exists directory_analytics_search_created_idx on public.directory_analytics_events(search_term, created_at desc) where event_type = 'directory_search';

create index if not exists directory_analytics_session_created_idx on public.directory_analytics_events(session_id, created_at desc);

-- Trigger functions are invoked by PostgreSQL triggers and should not be RPC-callable.
revoke execute on function public.notify_listing_report_status() from public, anon, authenticated;

create or replace function public.get_directory_intelligence_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if not public.is_directory_admin() then raise exception 'ADMIN_REQUIRED'; end if;

  select jsonb_build_object(
    'search', jsonb_build_object(
      'total7d', (select count(*) from public.directory_analytics_events where event_type='directory_search' and created_at >= now()-interval '7 days'),
      'total30d', (select count(*) from public.directory_analytics_events where event_type='directory_search' and created_at >= now()-interval '30 days'),
      'zero7d', (select count(*) from public.directory_analytics_events where event_type='directory_search' and result_count=0 and created_at >= now()-interval '7 days'),
      'converted7d', (
        select count(*) from public.directory_analytics_events s
        where s.event_type='directory_search' and s.created_at >= now()-interval '7 days'
          and exists (
            select 1 from public.directory_analytics_events v
            where v.session_id=s.session_id and v.event_type='view_listing'
              and v.created_at >= s.created_at and v.created_at <= s.created_at + interval '30 minutes'
          )
      )
    ),
    'topTerms', (
      select coalesce(jsonb_agg(x order by x->>'count' desc), '[]'::jsonb) from (
        select jsonb_build_object('term', search_term, 'count', count(*), 'zeroResults', count(*) filter (where result_count=0)) x
        from public.directory_analytics_events
        where event_type='directory_search' and created_at >= now()-interval '30 days' and nullif(search_term,'') is not null
        group by search_term order by count(*) desc limit 12
      ) q
    ),
    'zeroResultTerms', (
      select coalesce(jsonb_agg(x order by (x->>'count')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('term', search_term, 'count', count(*), 'village', max(village), 'category', max(category)) x
        from public.directory_analytics_events
        where event_type='directory_search' and result_count=0 and created_at >= now()-interval '30 days' and nullif(search_term,'') is not null
        group by search_term order by count(*) desc limit 12
      ) q
    ),
    'topSearchVillages', (
      select coalesce(jsonb_agg(x order by (x->>'count')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('name', village, 'count', count(*)) x
        from public.directory_analytics_events
        where event_type='directory_search' and created_at >= now()-interval '30 days' and nullif(village,'') is not null and village <> 'all'
        group by village order by count(*) desc limit 10
      ) q
    ),
    'topSearchCategories', (
      select coalesce(jsonb_agg(x order by (x->>'count')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('name', category, 'count', count(*)) x
        from public.directory_analytics_events
        where event_type='directory_search' and created_at >= now()-interval '30 days' and nullif(category,'') is not null and category <> 'all'
        group by category order by count(*) desc limit 10
      ) q
    ),
    'topListings', (
      select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
        select listing_id as "listingId", max(listing_slug) as slug,
          count(*) filter (where event_type='view_listing' and created_at >= now()-interval '7 days') as "views7d",
          count(*) filter (where event_type='view_listing' and created_at >= now()-interval '30 days') as "views30d",
          count(*) filter (where event_type='phone_click' and created_at >= now()-interval '30 days') as "phone30d",
          count(*) filter (where event_type='whatsapp_click' and created_at >= now()-interval '30 days') as "whatsapp30d",
          count(*) filter (where event_type='maps_click' and created_at >= now()-interval '30 days') as "maps30d",
          count(*) filter (where event_type='favorite_add' and created_at >= now()-interval '30 days') as "favorites30d"
        from public.directory_analytics_events
        where listing_id is not null and created_at >= now()-interval '30 days'
        group by listing_id
        order by count(*) filter (where event_type='view_listing') desc, count(*) desc
        limit 30
      ) q
    ),
    'generatedAt', now()
  ) into v_result;
  return v_result;
end;
$$;

revoke execute on function public.get_directory_intelligence_stats() from public, anon;

grant execute on function public.get_directory_intelligence_stats() to authenticated;

create or replace function public.get_my_listing_performance()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) into v_result
  from (
    select o.listing_id as "listingId",
      count(e.id) filter (where e.event_type='view_listing' and e.created_at >= now()-interval '7 days') as "views7d",
      count(e.id) filter (where e.event_type='view_listing' and e.created_at >= now()-interval '30 days') as "views30d",
      count(e.id) filter (where e.event_type='phone_click' and e.created_at >= now()-interval '30 days') as "phone30d",
      count(e.id) filter (where e.event_type='whatsapp_click' and e.created_at >= now()-interval '30 days') as "whatsapp30d",
      count(e.id) filter (where e.event_type='maps_click' and e.created_at >= now()-interval '30 days') as "maps30d",
      count(e.id) filter (where e.event_type='favorite_add' and e.created_at >= now()-interval '30 days') as "favorites30d"
    from public.listing_ownerships o
    left join public.directory_analytics_events e on e.listing_id=o.listing_id and e.created_at >= now()-interval '30 days'
    where o.user_id=auth.uid()
    group by o.listing_id
    order by o.listing_id
  ) q;
  return v_result;
end;
$$;

revoke execute on function public.get_my_listing_performance() from public, anon;

grant execute on function public.get_my_listing_performance() to authenticated;
