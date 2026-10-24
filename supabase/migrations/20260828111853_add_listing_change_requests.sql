-- Restored from Supabase schema history: 20260828111853 / add_listing_change_requests.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create table if not exists public.listing_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null,
  snapshot jsonb not null default '{}'::jsonb,
  changes jsonb not null,
  status text not null default 'pending' check (status in ('pending','needs_changes','approved','rejected')),
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  applied_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint listing_change_requests_changes_object check (jsonb_typeof(changes) = 'object'),
  constraint listing_change_requests_snapshot_object check (jsonb_typeof(snapshot) = 'object')
);

create unique index if not exists listing_change_requests_one_open_per_listing
  on public.listing_change_requests(user_id, listing_id)
  where status in ('pending','needs_changes');

create index if not exists listing_change_requests_listing_idx
  on public.listing_change_requests(listing_id, created_at desc);

create table if not exists public.listing_overrides (
  listing_id text primary key,
  fields jsonb not null default '{}'::jsonb,
  approved_request_id uuid references public.listing_change_requests(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint listing_overrides_fields_object check (jsonb_typeof(fields) = 'object')
);

alter table public.listing_change_requests enable row level security;

alter table public.listing_overrides enable row level security;

drop policy if exists "members read own listing changes" on public.listing_change_requests;

create policy "members read own listing changes"
  on public.listing_change_requests for select
  to authenticated
  using (user_id = auth.uid() or public.is_directory_admin());

drop policy if exists "public reads listing overrides" on public.listing_overrides;

create policy "public reads listing overrides"
  on public.listing_overrides for select
  to anon, authenticated
  using (true);

revoke all on public.listing_change_requests from anon, authenticated;

grant select on public.listing_change_requests to authenticated;

revoke all on public.listing_overrides from anon, authenticated;

grant select on public.listing_overrides to anon, authenticated;

create or replace function public.submit_listing_change(
  p_listing_id text,
  p_snapshot jsonb,
  p_changes jsonb
)
returns public.listing_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.listing_change_requests%rowtype;
  v_key text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if nullif(btrim(coalesce(p_listing_id, '')), '') is null then
    raise exception 'INVALID_LISTING';
  end if;

  if not exists (
    select 1 from public.listing_ownerships o
    where o.user_id = auth.uid() and o.listing_id = btrim(p_listing_id)
  ) then
    raise exception 'OWNERSHIP_REQUIRED';
  end if;

  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'INVALID_SNAPSHOT';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then
    raise exception 'NO_CHANGES';
  end if;

  for v_key in select jsonb_object_keys(p_changes)
  loop
    if v_key not in ('title','subCategory','location','village','locality','phone','whatsapp','hours','description','googleMapsUrl') then
      raise exception 'INVALID_CHANGE_FIELD';
    end if;
  end loop;

  if exists (
    select 1 from public.listing_change_requests r
    where r.user_id = auth.uid()
      and r.listing_id = btrim(p_listing_id)
      and r.status in ('pending','needs_changes')
  ) then
    raise exception 'OPEN_REQUEST_EXISTS';
  end if;

  insert into public.listing_change_requests(user_id, listing_id, snapshot, changes, status)
  values (auth.uid(), btrim(p_listing_id), p_snapshot, p_changes, 'pending')
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.review_listing_change(
  p_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.listing_change_requests%rowtype;
  v_changes jsonb;
  v_is_published boolean;
begin
  if not public.is_directory_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_status not in ('pending','needs_changes','approved','rejected') then
    raise exception 'INVALID_STATUS';
  end if;

  select * into v_row
  from public.listing_change_requests
  where id = p_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  v_changes := v_row.changes;

  if p_status = 'approved' then
    if (v_changes ? 'title') and char_length(btrim(coalesce(v_changes->>'title',''))) < 2 then
      raise exception 'INVALID_TITLE';
    end if;
    if (v_changes ? 'location') and char_length(btrim(coalesce(v_changes->>'location',''))) < 3 then
      raise exception 'INVALID_LOCATION';
    end if;
    if (v_changes ? 'village') and btrim(coalesce(v_changes->>'village','')) not in (
      'أولاد حمزة','جزيرة أولاد حمزة','الرشايدة','الأحايوة غرب','النويرات',
      'عوامر العسيرات','الشهداء','أولاد جبارة','المساعيد','أولاد بهيج'
    ) then
      raise exception 'INVALID_VILLAGE';
    end if;

    select exists(
      select 1 from public.published_businesses p where p.listing_id = v_row.listing_id
    ) into v_is_published;

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
$$;

revoke all on function public.submit_listing_change(text,jsonb,jsonb) from public, anon;

grant execute on function public.submit_listing_change(text,jsonb,jsonb) to authenticated;

revoke all on function public.review_listing_change(uuid,text,text) from public, anon, authenticated;

grant execute on function public.review_listing_change(uuid,text,text) to authenticated;
