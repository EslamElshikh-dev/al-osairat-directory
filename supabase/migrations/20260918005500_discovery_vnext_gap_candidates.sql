-- Discovery VNext.1: expose privacy-safe grouped search-gap candidates to the existing admin-only intelligence RPC.
-- No new personal identifiers are collected; the function reuses directory_analytics_events and preserves the admin guard.

CREATE OR REPLACE FUNCTION public.get_directory_intelligence_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_result jsonb;
begin
  if not public.is_directory_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

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
      select coalesce(jsonb_agg(x order by (x->>'count')::int desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'term', search_term,
          'count', count(*),
          'zeroResults', count(*) filter (where result_count=0)
        ) x
        from public.directory_analytics_events
        where event_type='directory_search'
          and created_at >= now()-interval '30 days'
          and nullif(search_term,'') is not null
        group by search_term
        order by count(*) desc
        limit 12
      ) q
    ),
    'zeroResultTerms', (
      select coalesce(jsonb_agg(x order by (x->>'count')::int desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'term', search_term,
          'count', count(*),
          'village', max(village),
          'category', max(category)
        ) x
        from public.directory_analytics_events
        where event_type='directory_search'
          and result_count=0
          and created_at >= now()-interval '30 days'
          and nullif(search_term,'') is not null
        group by search_term
        order by count(*) desc
        limit 12
      ) q
    ),
    'gapCandidates', (
      select coalesce(jsonb_agg(to_jsonb(q) order by q."zeroResults30d" desc, q."uniqueSessions30d" desc, q."lastSeenAt" desc), '[]'::jsonb)
      from (
        select
          search_term as term,
          coalesce(nullif(village,''), 'all') as village,
          coalesce(nullif(category,''), 'all') as category,
          count(*) filter (where created_at >= now()-interval '7 days') as "searches7d",
          count(*) as "searches30d",
          count(*) filter (where result_count=0 and created_at >= now()-interval '7 days') as "zeroResults7d",
          count(*) filter (where result_count=0) as "zeroResults30d",
          count(distinct session_id) as "uniqueSessions30d",
          min(created_at) as "firstSeenAt",
          max(created_at) as "lastSeenAt"
        from public.directory_analytics_events
        where event_type='directory_search'
          and created_at >= now()-interval '30 days'
          and nullif(search_term,'') is not null
        group by search_term, coalesce(nullif(village,''), 'all'), coalesce(nullif(category,''), 'all')
        having count(*) filter (where result_count=0) > 0
        order by "zeroResults30d" desc, "uniqueSessions30d" desc, "lastSeenAt" desc
        limit 40
      ) q
    ),
    'topSearchVillages', (
      select coalesce(jsonb_agg(x order by (x->>'count')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('name', village, 'count', count(*)) x
        from public.directory_analytics_events
        where event_type='directory_search'
          and created_at >= now()-interval '30 days'
          and nullif(village,'') is not null
          and village <> 'all'
        group by village
        order by count(*) desc
        limit 10
      ) q
    ),
    'topSearchCategories', (
      select coalesce(jsonb_agg(x order by (x->>'count')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('name', category, 'count', count(*)) x
        from public.directory_analytics_events
        where event_type='directory_search'
          and created_at >= now()-interval '30 days'
          and nullif(category,'') is not null
          and category <> 'all'
        group by category
        order by count(*) desc
        limit 10
      ) q
    ),
    'topListings', (
      select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
        select
          listing_id as "listingId",
          max(listing_slug) as slug,
          count(*) filter (where event_type='view_listing' and created_at >= now()-interval '7 days') as "views7d",
          count(*) filter (where event_type='view_listing' and created_at >= now()-interval '30 days') as "views30d",
          count(*) filter (where event_type='phone_click' and created_at >= now()-interval '30 days') as "phone30d",
          count(*) filter (where event_type='whatsapp_click' and created_at >= now()-interval '30 days') as "whatsapp30d",
          count(*) filter (where event_type='maps_click' and created_at >= now()-interval '30 days') as "maps30d",
          count(*) filter (where event_type='favorite_add' and created_at >= now()-interval '30 days') as "favorites30d"
        from public.directory_analytics_events
        where listing_id is not null
          and created_at >= now()-interval '30 days'
        group by listing_id
        order by count(*) filter (where event_type='view_listing') desc, count(*) desc
        limit 30
      ) q
    ),
    'generatedAt', now()
  ) into v_result;

  return v_result;
end;
$function$

