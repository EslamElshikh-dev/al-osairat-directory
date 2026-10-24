-- Restored from Supabase schema history: 20260828154932 / add_admin_listing_report_resolution.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

alter table public.listing_reports
  add column if not exists correction jsonb not null default '{}'::jsonb,
  add column if not exists applied_at timestamptz;

create or replace function public.review_listing_report(
  p_id uuid,
  p_status text,
  p_note text default null,
  p_correction jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_row public.listing_reports%rowtype;
  v_correction jsonb := coalesce(p_correction, '{}'::jsonb);
  v_is_published boolean;
begin
  if not public.is_directory_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status not in ('pending','reviewing','resolved','rejected') then raise exception 'INVALID_STATUS'; end if;
  if jsonb_typeof(v_correction) <> 'object' then raise exception 'INVALID_CORRECTION'; end if;

  select * into v_row
  from public.listing_reports
  where id = p_id
  for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  if p_status = 'resolved' and v_correction <> '{}'::jsonb then
    perform public.assert_valid_listing_changes(v_correction);

    select exists(
      select 1 from public.published_businesses p where p.listing_id = v_row.listing_id
    ) into v_is_published;

    if v_is_published then
      update public.published_businesses p
      set title = case when v_correction ? 'title' then btrim(v_correction->>'title') else p.title end,
          sub_category = case when v_correction ? 'subCategory' then nullif(btrim(coalesce(v_correction->>'subCategory','')), '') else p.sub_category end,
          location = case when v_correction ? 'location' then btrim(v_correction->>'location') else p.location end,
          village = case when v_correction ? 'village' then btrim(v_correction->>'village') else p.village end,
          locality = case when v_correction ? 'locality' then nullif(btrim(coalesce(v_correction->>'locality','')), '') else p.locality end,
          phone = case when v_correction ? 'phone' then nullif(btrim(coalesce(v_correction->>'phone','')), '') else p.phone end,
          whatsapp = case when v_correction ? 'whatsapp' then nullif(btrim(coalesce(v_correction->>'whatsapp','')), '') else p.whatsapp end,
          hours = case when v_correction ? 'hours' then nullif(btrim(coalesce(v_correction->>'hours','')), '') else p.hours end,
          description = case when v_correction ? 'description' then nullif(btrim(coalesce(v_correction->>'description','')), '') else p.description end,
          google_maps_url = case when v_correction ? 'googleMapsUrl' then nullif(btrim(coalesce(v_correction->>'googleMapsUrl','')), '') else p.google_maps_url end,
          updated_at = now()
      where p.listing_id = v_row.listing_id;
    else
      insert into public.listing_overrides(listing_id, fields, updated_by, updated_at)
      values (v_row.listing_id, v_correction, auth.uid(), now())
      on conflict (listing_id) do update
      set fields = public.listing_overrides.fields || excluded.fields,
          updated_by = excluded.updated_by,
          updated_at = now();
    end if;
  end if;

  update public.listing_reports
  set status = p_status,
      review_note = nullif(btrim(coalesce(p_note,'')), ''),
      correction = case when p_status = 'resolved' then v_correction else correction end,
      reviewed_at = case when p_status = 'pending' then null else now() end,
      reviewed_by = case when p_status = 'pending' then null else auth.uid() end,
      applied_at = case when p_status = 'resolved' and v_correction <> '{}'::jsonb then now() else applied_at end,
      updated_at = now()
  where id = p_id
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'listingId', v_row.listing_id,
    'status', v_row.status,
    'reviewNote', v_row.review_note,
    'correction', v_row.correction,
    'reviewedAt', v_row.reviewed_at,
    'appliedAt', v_row.applied_at
  );
end;
$function$;

revoke all on function public.review_listing_report(uuid,text,text,jsonb) from public, anon;

grant execute on function public.review_listing_report(uuid,text,text,jsonb) to authenticated;
