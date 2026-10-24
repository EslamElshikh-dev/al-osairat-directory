-- Restored from Supabase schema history: 20260829051342 / authority_batch_workflow.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

alter table public.listing_overrides enable row level security;

grant insert, update on public.listing_overrides to authenticated;

create policy "Admins can insert listing overrides"
on public.listing_overrides for insert
to authenticated
with check ((select public.is_directory_admin()));

create policy "Admins can update listing overrides"
on public.listing_overrides for update
to authenticated
using ((select public.is_directory_admin()))
with check ((select public.is_directory_admin()));

create or replace function public.get_directory_authority_batch(p_limit integer default 20)
returns jsonb
language sql
stable
security invoker
set search_path = 'public'
as $$
with ranked as (
  select
    e.id,
    e.slug,
    e.title,
    e.category,
    e.village,
    e.origin,
    e.phone,
    e.description,
    e.google_maps_url,
    e.google_place_id,
    e.source_status,
    e.quality_score,
    (
      case when e.source_status = 'needs_review' then 100 else 0 end
      + case when e.google_maps_url is null or btrim(e.google_maps_url) = '' then 25 else 0 end
      + case when e.google_place_id is null or btrim(e.google_place_id) = '' then 20 else 0 end
      + case when e.phone is null or btrim(e.phone) = '' then 18 else 0 end
      + case when e.description is null or btrim(e.description) = '' then 12 else 0 end
      + greatest(0, 70 - e.quality_score)
    )::integer as authority_priority
  from public.directory_entities e
  where e.is_active = true
), batch as (
  select *
  from ranked
  where authority_priority > 0
  order by authority_priority desc, quality_score asc, title asc
  limit greatest(1, least(coalesce(p_limit, 20), 50))
)
select coalesce(jsonb_agg(
  jsonb_build_object(
    'id', b.id,
    'slug', b.slug,
    'title', b.title,
    'category', b.category,
    'village', b.village,
    'origin', b.origin,
    'phone', b.phone,
    'description', b.description,
    'googleMapsUrl', b.google_maps_url,
    'googlePlaceId', b.google_place_id,
    'sourceStatus', b.source_status,
    'qualityScore', b.quality_score,
    'authorityPriority', b.authority_priority,
    'evidenceType', s.source_type,
    'evidenceLabel', s.source_label,
    'evidenceUrl', s.source_url,
    'evidenceCheckedAt', s.checked_at
  ) order by b.authority_priority desc, b.quality_score asc, b.title asc
), '[]'::jsonb)
from batch b
left join lateral (
  select ds.source_type, ds.source_label, ds.source_url, ds.checked_at
  from public.directory_entity_sources ds
  where ds.entity_id = b.id
    and ds.source_key = 'authority:' || b.id
  order by ds.updated_at desc
  limit 1
) s on true;
$$;

revoke all on function public.get_directory_authority_batch(integer) from public, anon;

grant execute on function public.get_directory_authority_batch(integer) to authenticated;

create or replace function public.update_directory_authority_record(
  p_id text,
  p_source_status text,
  p_phone text default null,
  p_description text default null,
  p_google_maps_url text default null,
  p_google_place_id text default null,
  p_evidence_type text default 'legacy_directory',
  p_evidence_label text default null,
  p_evidence_url text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = 'public'
as $$
declare
  v_origin text;
  v_fields jsonb;
  v_quality integer;
  v_priority integer;
  v_evidence_url text;
begin
  if not (select public.is_directory_admin()) then
    raise exception 'not authorized';
  end if;

  if p_source_status not in ('source_only', 'cross_checked', 'google_verified', 'needs_review') then
    raise exception 'invalid source status';
  end if;

  if p_evidence_type not in ('legacy_directory', 'user_collected', 'google_maps') then
    raise exception 'invalid evidence type';
  end if;

  select origin into v_origin
  from public.directory_entities
  where id = p_id and is_active = true;

  if v_origin is null then
    raise exception 'directory entity not found';
  end if;

  if v_origin <> 'static' then
    raise exception 'authority batch currently supports static directory records only';
  end if;

  select coalesce(fields, '{}'::jsonb) into v_fields
  from public.listing_overrides
  where listing_id = p_id;

  v_fields := coalesce(v_fields, '{}'::jsonb) || jsonb_build_object(
    'phone', nullif(btrim(coalesce(p_phone, '')), ''),
    'description', nullif(btrim(coalesce(p_description, '')), ''),
    'googleMapsUrl', nullif(btrim(coalesce(p_google_maps_url, '')), ''),
    'googlePlaceId', nullif(btrim(coalesce(p_google_place_id, '')), ''),
    'sourceStatus', p_source_status
  );

  insert into public.listing_overrides(listing_id, fields, updated_by, updated_at)
  values (p_id, v_fields, (select auth.uid()), now())
  on conflict (listing_id) do update set
    fields = excluded.fields,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  update public.directory_entities
  set
    phone = nullif(btrim(coalesce(p_phone, '')), ''),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    google_maps_url = nullif(btrim(coalesce(p_google_maps_url, '')), ''),
    google_place_id = nullif(btrim(coalesce(p_google_place_id, '')), ''),
    source_status = p_source_status,
    last_updated_at = now()
  where id = p_id;

  delete from public.directory_entity_sources
  where entity_id = p_id and source_key = 'authority:' || p_id;

  v_evidence_url := nullif(btrim(coalesce(p_evidence_url, '')), '');
  if v_evidence_url is null and p_evidence_type = 'google_maps' then
    v_evidence_url := nullif(btrim(coalesce(p_google_maps_url, '')), '');
  end if;

  insert into public.directory_entity_sources(
    entity_id, source_type, source_status, source_label, source_key,
    source_url, is_primary, checked_at
  ) values (
    p_id,
    p_evidence_type,
    p_source_status,
    coalesce(nullif(btrim(coalesce(p_evidence_label, '')), ''),
      case p_evidence_type
        when 'google_maps' then 'Google Maps — مراجعة سلطة البيانات'
        when 'user_collected' then 'مصدر محلي — مراجعة سلطة البيانات'
        else 'بيانات الدليل — مراجعة سلطة البيانات'
      end),
    'authority:' || p_id,
    v_evidence_url,
    false,
    now()
  );

  select
    quality_score,
    (
      case when source_status = 'needs_review' then 100 else 0 end
      + case when google_maps_url is null or btrim(google_maps_url) = '' then 25 else 0 end
      + case when google_place_id is null or btrim(google_place_id) = '' then 20 else 0 end
      + case when phone is null or btrim(phone) = '' then 18 else 0 end
      + case when description is null or btrim(description) = '' then 12 else 0 end
      + greatest(0, 70 - quality_score)
    )::integer
  into v_quality, v_priority
  from public.directory_entities
  where id = p_id;

  return jsonb_build_object(
    'ok', true,
    'id', p_id,
    'qualityScore', v_quality,
    'authorityPriority', v_priority,
    'updatedAt', now()
  );
end;
$$;

revoke all on function public.update_directory_authority_record(text,text,text,text,text,text,text,text,text) from public, anon;

grant execute on function public.update_directory_authority_record(text,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.sync_directory_entities(p_entities jsonb, p_sources jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = 'public'
as $$
declare
  v_entity_count integer := 0;
  v_source_count integer := 0;
begin
  if not (select public.is_directory_admin()) then
    raise exception 'not authorized';
  end if;

  if jsonb_typeof(coalesce(p_entities, '[]'::jsonb)) <> 'array' then
    raise exception 'entities must be a JSON array';
  end if;

  insert into public.directory_entities (
    id, slug, title, category, sub_category, location, village, locality,
    phone, whatsapp, hours, description, rating, review_count, rating_source,
    source, source_status, delivery_available, emergency, google_place_id,
    google_maps_plus_code, google_maps_url, last_updated_at, origin, is_active
  )
  select
    x.id, x.slug, x.title, x.category, x.sub_category, coalesce(x.location, ''), x.village, x.locality,
    x.phone, x.whatsapp, x.hours, x.description, x.rating, coalesce(x.review_count, 0), x.rating_source,
    x.source, x.source_status, x.delivery_available, coalesce(x.emergency, false), x.google_place_id,
    x.google_maps_plus_code, x.google_maps_url, x.last_updated_at, coalesce(x.origin, 'static'), true
  from jsonb_to_recordset(coalesce(p_entities, '[]'::jsonb)) as x(
    id text, slug text, title text, category text, sub_category text, location text,
    village text, locality text, phone text, whatsapp text, hours text, description text,
    rating numeric, review_count integer, rating_source text, source text, source_status text,
    delivery_available boolean, emergency boolean, google_place_id text, google_maps_plus_code text,
    google_maps_url text, last_updated_at timestamptz, origin text
  )
  on conflict (id) do update set
    slug = excluded.slug,
    title = excluded.title,
    category = excluded.category,
    sub_category = excluded.sub_category,
    location = excluded.location,
    village = excluded.village,
    locality = excluded.locality,
    phone = excluded.phone,
    whatsapp = excluded.whatsapp,
    hours = excluded.hours,
    description = excluded.description,
    rating = excluded.rating,
    review_count = excluded.review_count,
    rating_source = excluded.rating_source,
    source = excluded.source,
    source_status = excluded.source_status,
    delivery_available = excluded.delivery_available,
    emergency = excluded.emergency,
    google_place_id = excluded.google_place_id,
    google_maps_plus_code = excluded.google_maps_plus_code,
    google_maps_url = excluded.google_maps_url,
    last_updated_at = excluded.last_updated_at,
    origin = excluded.origin,
    is_active = true;

  get diagnostics v_entity_count = row_count;

  update public.directory_entities e
  set is_active = false
  where e.origin in ('static', 'published')
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_entities, '[]'::jsonb)) payload
      where payload->>'id' = e.id
    );

  delete from public.directory_entity_sources s
  where exists (
    select 1 from jsonb_array_elements(coalesce(p_entities, '[]'::jsonb)) payload
    where payload->>'id' = s.entity_id
  )
  and coalesce(s.source_key, '') not like 'authority:%';

  if jsonb_typeof(coalesce(p_sources, '[]'::jsonb)) = 'array' then
    insert into public.directory_entity_sources (
      entity_id, source_type, source_status, source_label, source_key, source_url, is_primary, checked_at
    )
    select
      s.entity_id, s.source_type, s.source_status, s.source_label, s.source_key, s.source_url,
      coalesce(s.is_primary, false), s.checked_at
    from jsonb_to_recordset(coalesce(p_sources, '[]'::jsonb)) as s(
      entity_id text, source_type text, source_status text, source_label text,
      source_key text, source_url text, is_primary boolean, checked_at timestamptz
    )
    on conflict do nothing;
    get diagnostics v_source_count = row_count;
  end if;

  return jsonb_build_object(
    'entitiesUpserted', v_entity_count,
    'sourcesInserted', v_source_count,
    'activeEntities', (select count(*) from public.directory_entities where is_active = true)
  );
end;
$$;
