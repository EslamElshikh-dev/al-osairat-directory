-- Additive photo review support; existing text fields, rows and permissions retained.
begin;
CREATE OR REPLACE FUNCTION public.assert_valid_listing_changes(p_changes jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_key text;
  v_value text;
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then
    raise exception 'NO_CHANGES';
  end if;

  for v_key in select jsonb_object_keys(p_changes)
  loop
    if v_key not in ('title','subCategory','location','village','locality','phone','whatsapp','hours','description','googleMapsUrl','imagePaths') then
      raise exception 'INVALID_CHANGE_FIELD';
    end if;
    if v_key = 'imagePaths' then
      if jsonb_typeof(p_changes->v_key) <> 'array' then raise exception 'INVALID_IMAGES'; end if;
      if jsonb_array_length(p_changes->v_key)>3 then raise exception 'INVALID_IMAGES'; end if;
      if exists(select 1 from jsonb_array_elements(p_changes->v_key) e where jsonb_typeof(e)<>'string' or (e#>>'{}') !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp)$') then raise exception 'INVALID_IMAGES'; end if;
      if (select count(*)<>count(distinct e) from jsonb_array_elements(p_changes->v_key) e) then raise exception 'DUPLICATE_IMAGES'; end if;
      continue;
    end if;
    v_value := coalesce(p_changes->>v_key, '');

    if v_key = 'title' and (char_length(btrim(v_value)) < 2 or char_length(v_value) > 120) then
      raise exception 'INVALID_TITLE';
    elsif v_key = 'subCategory' and char_length(v_value) > 120 then
      raise exception 'INVALID_SUBCATEGORY';
    elsif v_key = 'location' and char_length(v_value) > 240 then
      raise exception 'INVALID_LOCATION';
    elsif v_key = 'village' and btrim(v_value) not in (
      'مركز العسيرات','أولاد حمزة','جزيرة أولاد حمزة','الرشايدة','الأحايوة غرب','النويرات',
      'عوامر العسيرات','الشهداء','أولاد جبارة','المساعيد','أولاد بهيج'
    ) then
      raise exception 'INVALID_VILLAGE';
    elsif v_key = 'locality' and char_length(v_value) > 100 then
      raise exception 'INVALID_LOCALITY';
    elsif v_key = 'phone' and btrim(v_value) <> '' and btrim(v_value) !~ '^(01[0125][0-9]{8}|0[2-9][0-9]{7,8})$' then
      raise exception 'INVALID_PHONE';
    elsif v_key = 'whatsapp' and btrim(v_value) <> '' and btrim(v_value) !~ '^01[0125][0-9]{8}$' then
      raise exception 'INVALID_WHATSAPP';
    elsif v_key = 'hours' and char_length(v_value) > 180 then
      raise exception 'INVALID_HOURS';
    elsif v_key = 'description' and char_length(v_value) > 800 then
      raise exception 'INVALID_DESCRIPTION';
    elsif v_key = 'googleMapsUrl' and btrim(v_value) <> '' and not (
      btrim(v_value) ~ '^https://maps[.]app[.]goo[.]gl/' or
      btrim(v_value) ~ '^https://goo[.]gl/maps' or
      btrim(v_value) ~ '^https://maps[.]google[.]' or
      btrim(v_value) ~ '^https://([a-z0-9-]+[.])?google[.]com/maps'
    ) then
      raise exception 'INVALID_MAPS_URL';
    end if;
  end loop;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.review_listing_change(p_id uuid, p_status text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
declare
  v_row public.listing_change_requests%rowtype;
  v_changes jsonb;
  v_is_published boolean;
begin
  if not public.is_directory_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status not in ('pending','needs_changes','approved','rejected') then raise exception 'INVALID_STATUS'; end if;

  select * into v_row
  from public.listing_change_requests
  where id = p_id
  for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  v_changes := v_row.changes;
  perform public.assert_valid_listing_changes(v_changes);

  if p_status = 'approved' then
    select exists(select 1 from public.published_businesses p where p.listing_id = v_row.listing_id)
      into v_is_published;

    if v_is_published then
      update public.published_businesses p
      set title = case when v_changes ? 'title' then btrim(v_changes->>'title') else p.title end,
          sub_category = case when v_changes ? 'subCategory' then nullif(btrim(coalesce(v_changes->>'subCategory','')), '') else p.sub_category end,
          location = case when v_changes ? 'location' then btrim(v_changes->>'location') else p.location end,
          village = case when v_changes ? 'village' then btrim(v_changes->>'village') else p.village end,
          locality = case when v_changes ? 'locality' then nullif(btrim(coalesce(v_changes->>'locality','')), '') else p.locality end,
          phone = case when v_changes ? 'phone' then nullif(btrim(coalesce(v_changes->>'phone','')), '') else p.phone end,
          whatsapp = case when v_changes ? 'whatsapp' then nullif(btrim(coalesce(v_changes->>'whatsapp','')), '') else p.whatsapp end,
          hours = case when v_changes ? 'hours' then nullif(btrim(coalesce(v_changes->>'hours','')), '') else p.hours end,
          description = case when v_changes ? 'description' then nullif(btrim(coalesce(v_changes->>'description','')), '') else p.description end,
          google_maps_url = case when v_changes ? 'googleMapsUrl' then nullif(btrim(coalesce(v_changes->>'googleMapsUrl','')), '') else p.google_maps_url end,
          image_paths = case when v_changes ? 'imagePaths' then array(select jsonb_array_elements_text(v_changes->'imagePaths')) else p.image_paths end,
          updated_at = now()
      where p.listing_id = v_row.listing_id;
    else
      insert into public.listing_overrides(listing_id, fields, approved_request_id, updated_by, updated_at)
      values (v_row.listing_id, v_changes, v_row.id, auth.uid(), now())
      on conflict (listing_id) do update
      set fields = public.listing_overrides.fields || excluded.fields,
          approved_request_id = excluded.approved_request_id,
          updated_by = excluded.updated_by,
          updated_at = now();
    end if;
  end if;

  update public.listing_change_requests
  set status = p_status,
      review_note = nullif(btrim(coalesce(p_note,'')), ''),
      reviewed_at = case when p_status = 'pending' then null else now() end,
      applied_at = case when p_status = 'approved' then now() else applied_at end,
      reviewed_by = case when p_status = 'pending' then null else auth.uid() end,
      updated_at = now()
  where id = p_id
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'listingId', v_row.listing_id,
    'status', v_row.status,
    'reviewNote', v_row.review_note,
    'reviewedAt', v_row.reviewed_at,
    'appliedAt', v_row.applied_at
  );
end;
$function$
;

-- Validate photo provenance at request submission, not after publication.
create or replace function directory_internal.validate_change_images() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,storage,auth as $$
declare path text;
begin
 if tg_op='UPDATE' and new.changes is not distinct from old.changes then return new; end if;
 if not (new.changes ? 'imagePaths') then return new; end if;
 if auth.uid() is null or auth.uid()<>new.user_id or not exists(select 1 from public.listing_ownerships where listing_id=new.listing_id and user_id=new.user_id) then raise exception 'OWNERSHIP_REQUIRED'; end if;
 perform public.assert_valid_listing_changes(new.changes);
 for path in select jsonb_array_elements_text(new.changes->'imagePaths') loop
   if not exists(select 1 from storage.objects where bucket_id='business-images' and name=path) then raise exception 'IMAGE_NOT_FOUND'; end if;
   if split_part(path,'/',1)<>new.user_id::text
      and not exists(select 1 from public.published_businesses where listing_id=new.listing_id and path=any(image_paths))
      and not exists(select 1 from public.listing_overrides where listing_id=new.listing_id and fields->'imagePaths' ? path)
   then raise exception 'IMAGE_OWNER_REQUIRED'; end if;
 end loop;
 return new;
end $$;
revoke all on function directory_internal.validate_change_images() from public,anon,authenticated;
create trigger validate_listing_change_images before insert or update of changes on public.listing_change_requests
for each row execute function directory_internal.validate_change_images();
-- Only approved photos attached to an already public override become public.
create policy "Read approved directory override photos" on storage.objects for select to anon,authenticated
using(bucket_id='business-images' and exists(select 1 from public.listing_overrides o where o.fields->'imagePaths' ? name));

commit;
