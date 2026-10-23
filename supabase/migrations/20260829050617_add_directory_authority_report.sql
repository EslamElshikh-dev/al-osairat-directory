-- Restored from Supabase schema history: 20260829050617 / add_directory_authority_report.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create or replace function public.get_directory_authority_report(p_limit integer default 12)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with visible as (
  select *
  from public.directory_entities
  where is_active = true
), summary as (
  select
    count(*)::integer as total,
    coalesce(round(avg(quality_score)::numeric, 1), 0) as average_quality,
    count(*) filter (where quality_score >= 75)::integer as strong,
    count(*) filter (where quality_score < 55)::integer as needs_attention,
    count(*) filter (where source_status = 'needs_review')::integer as needs_review,
    count(*) filter (where phone is null or btrim(phone) = '')::integer as missing_phone,
    count(*) filter (where description is null or btrim(description) = '')::integer as missing_description,
    count(*) filter (where google_maps_url is null or btrim(google_maps_url) = '')::integer as missing_maps_url,
    count(*) filter (where google_place_id is null or btrim(google_place_id) = '')::integer as missing_place_id,
    count(*) filter (where source_status = 'google_verified')::integer as google_verified,
    count(*) filter (where source_status = 'cross_checked')::integer as cross_checked,
    count(*) filter (where source_status = 'source_only')::integer as source_only
  from visible
), ranked as (
  select
    id,
    slug,
    title,
    category,
    village,
    quality_score,
    source_status,
    (google_maps_url is null or btrim(google_maps_url) = '') as missing_maps_url,
    (google_place_id is null or btrim(google_place_id) = '') as missing_place_id,
    (phone is null or btrim(phone) = '') as missing_phone,
    (description is null or btrim(description) = '') as missing_description,
    (
      case when source_status = 'needs_review' then 100 else 0 end
      + case when google_maps_url is null or btrim(google_maps_url) = '' then 25 else 0 end
      + case when google_place_id is null or btrim(google_place_id) = '' then 20 else 0 end
      + case when phone is null or btrim(phone) = '' then 18 else 0 end
      + case when description is null or btrim(description) = '' then 12 else 0 end
      + greatest(0, 70 - quality_score)
    )::integer as authority_priority
  from visible
), queue as (
  select *
  from ranked
  where authority_priority > 0
  order by authority_priority desc, quality_score asc, title asc
  limit greatest(1, least(coalesce(p_limit, 12), 50))
)
select jsonb_build_object(
  'canonicalReady', (select total > 0 from summary),
  'summary', (
    select jsonb_build_object(
      'total', total,
      'averageQuality', average_quality,
      'strong', strong,
      'needsAttention', needs_attention,
      'needsReview', needs_review,
      'missingPhone', missing_phone,
      'missingDescription', missing_description,
      'missingMapsUrl', missing_maps_url,
      'missingPlaceId', missing_place_id,
      'googleVerified', google_verified,
      'crossChecked', cross_checked,
      'sourceOnly', source_only,
      'trusted', google_verified + cross_checked
    )
    from summary
  ),
  'coverage', (
    select jsonb_build_object(
      'trustedPct', case when total = 0 then 0 else round(((google_verified + cross_checked)::numeric / total) * 100, 1) end,
      'phonePct', case when total = 0 then 0 else round(((total - missing_phone)::numeric / total) * 100, 1) end,
      'descriptionPct', case when total = 0 then 0 else round(((total - missing_description)::numeric / total) * 100, 1) end,
      'mapsUrlPct', case when total = 0 then 0 else round(((total - missing_maps_url)::numeric / total) * 100, 1) end,
      'placeIdPct', case when total = 0 then 0 else round(((total - missing_place_id)::numeric / total) * 100, 1) end
    )
    from summary
  ),
  'queue', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id,
      'slug', slug,
      'title', title,
      'category', category,
      'village', village,
      'qualityScore', quality_score,
      'sourceStatus', source_status,
      'missingMapsUrl', missing_maps_url,
      'missingPlaceId', missing_place_id,
      'missingPhone', missing_phone,
      'missingDescription', missing_description,
      'authorityPriority', authority_priority
    ) order by authority_priority desc, quality_score asc, title asc)
    from queue
  ), '[]'::jsonb)
);
$$;

grant execute on function public.get_directory_authority_report(integer) to anon, authenticated;
