-- Restored from Supabase schema history: 20260829051615 / authority_batch_validation.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

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
  v_maps_url text := nullif(btrim(coalesce(p_google_maps_url, '')), '');
  v_place_id text := nullif(btrim(coalesce(p_google_place_id, '')), '');
  v_evidence_label text := nullif(btrim(coalesce(p_evidence_label, '')), '');
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

  if v_maps_url is not null and v_maps_url !~* '^https?://' then
    raise exception 'invalid google maps url';
  end if;

  v_evidence_url := nullif(btrim(coalesce(p_evidence_url, '')), '');
  if v_evidence_url is not null and v_evidence_url !~* '^https?://' then
    raise exception 'invalid evidence url';
  end if;

  if p_source_status = 'google_verified' then
    if p_evidence_type <> 'google_maps' then
      raise exception 'google verified requires google maps evidence';
    end if;
    if v_maps_url is null and v_place_id is null then
      raise exception 'google verified requires maps url or place id';
    end if;
  end if;

  if p_source_status = 'cross_checked' and v_evidence_label is null and v_evidence_url is null then
    raise exception 'cross checked requires evidence';
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
    'googleMapsUrl', v_maps_url,
    'googlePlaceId', v_place_id,
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
    google_maps_url = v_maps_url,
    google_place_id = v_place_id,
    source_status = p_source_status,
    last_updated_at = now()
  where id = p_id;

  delete from public.directory_entity_sources
  where entity_id = p_id and source_key = 'authority:' || p_id;

  if v_evidence_url is null and p_evidence_type = 'google_maps' then
    v_evidence_url := v_maps_url;
  end if;

  insert into public.directory_entity_sources(
    entity_id, source_type, source_status, source_label, source_key,
    source_url, is_primary, checked_at
  ) values (
    p_id,
    p_evidence_type,
    p_source_status,
    coalesce(v_evidence_label,
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
