-- Restored from Supabase schema history: 20260829044348 / phase7_data_authority_scale.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;

revoke all on schema private from public;

create or replace function public.normalize_arabic_search(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select trim(
    regexp_replace(
      translate(
        regexp_replace(lower(coalesce(input, '')), '[ًٌٍَُِّْـ]', '', 'g'),
        'أإآٱىةؤئ٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
        'اااايهوي01234567890123456789'
      ),
      '[^[:alnum:]ء-ي ]+',
      ' ',
      'g'
    )
  );
$$;

create table if not exists public.directory_entities (
  id text primary key,
  slug text not null unique,
  title text not null,
  category text not null check (category in ('doctors','pharmacies','shops','education','crafts','restaurants','lawyers','clerics','government','community','emergency')),
  sub_category text,
  location text not null default '',
  village text not null,
  locality text,
  phone text,
  whatsapp text,
  hours text,
  description text,
  rating numeric(3,2),
  review_count integer not null default 0 check (review_count >= 0),
  rating_source text check (rating_source is null or rating_source in ('legacy','google')),
  source text not null check (source in ('legacy_directory','user_collected','google_maps')),
  source_status text not null check (source_status in ('source_only','cross_checked','google_verified','needs_review')),
  delivery_available boolean,
  emergency boolean not null default false,
  google_place_id text,
  google_maps_plus_code text,
  google_maps_url text,
  last_updated_at timestamptz,
  origin text not null default 'static' check (origin in ('static','published')),
  is_active boolean not null default true,
  search_text text not null default '',
  quality_score smallint not null default 20 check (quality_score between 20 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.directory_entity_sources (
  id uuid primary key default gen_random_uuid(),
  entity_id text not null references public.directory_entities(id) on delete cascade,
  source_type text not null check (source_type in ('legacy_directory','user_collected','google_maps')),
  source_status text not null check (source_status in ('source_only','cross_checked','google_verified','needs_review')),
  source_label text,
  source_key text,
  source_url text,
  is_primary boolean not null default false,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists directory_entity_sources_identity_idx
  on public.directory_entity_sources(entity_id, source_type, coalesce(source_key, ''), coalesce(source_url, ''));

create index if not exists directory_entities_active_category_idx
  on public.directory_entities(is_active, category);

create index if not exists directory_entities_active_village_idx
  on public.directory_entities(is_active, village);

create index if not exists directory_entities_status_idx
  on public.directory_entities(source_status, quality_score desc);

create index if not exists directory_entities_search_trgm_idx
  on public.directory_entities using gin (search_text extensions.gin_trgm_ops);

create index if not exists directory_entity_sources_entity_idx
  on public.directory_entity_sources(entity_id, is_primary desc, checked_at desc);

create or replace function private.set_directory_entity_derived_fields()
returns trigger
language plpgsql
security invoker
set search_path = 'public', 'private'
as $$
begin
  new.search_text := public.normalize_arabic_search(
    concat_ws(' ', new.title, new.sub_category, new.location, new.village, new.locality, new.description, new.phone, new.whatsapp)
  );

  new.quality_score := greatest(20, least(100,
    35
    + case when nullif(trim(coalesce(new.phone, '')), '') is not null and new.phone <> '0' then 15 else 0 end
    + case when nullif(trim(coalesce(new.description, '')), '') is not null then 10 else 0 end
    + case when nullif(trim(coalesce(new.hours, '')), '') is not null then 10 else 0 end
    + case when nullif(trim(coalesce(new.google_place_id, '')), '') is not null or nullif(trim(coalesce(new.google_maps_url, '')), '') is not null then 12 else 0 end
    + case when new.last_updated_at is not null then 8 else 0 end
    + case when nullif(trim(coalesce(new.locality, '')), '') is not null then 4 else 0 end
    + case when new.source_status = 'cross_checked' then 3 else 0 end
    + case when new.source_status = 'google_verified' then 6 else 0 end
    - case when new.source_status = 'needs_review' then 12 else 0 end
  ));

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_directory_entity_derived_fields() from public, anon, authenticated;

drop trigger if exists directory_entities_derived_fields on public.directory_entities;

create trigger directory_entities_derived_fields
before insert or update of title, sub_category, location, village, locality, phone, whatsapp, hours, description, google_place_id, google_maps_url, last_updated_at, source_status
on public.directory_entities
for each row execute function private.set_directory_entity_derived_fields();

create or replace function private.touch_directory_entity_source()
returns trigger
language plpgsql
security invoker
set search_path = 'public', 'private'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_directory_entity_source() from public, anon, authenticated;

drop trigger if exists directory_entity_sources_touch on public.directory_entity_sources;

create trigger directory_entity_sources_touch
before update on public.directory_entity_sources
for each row execute function private.touch_directory_entity_source();

alter table public.directory_entities enable row level security;

alter table public.directory_entity_sources enable row level security;

drop policy if exists "Public can read active directory entities" on public.directory_entities;

create policy "Public can read active directory entities"
on public.directory_entities for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can insert directory entities" on public.directory_entities;

create policy "Admins can insert directory entities"
on public.directory_entities for insert
to authenticated
with check ((select public.is_directory_admin()));

drop policy if exists "Admins can update directory entities" on public.directory_entities;

create policy "Admins can update directory entities"
on public.directory_entities for update
to authenticated
using ((select public.is_directory_admin()))
with check ((select public.is_directory_admin()));

drop policy if exists "Admins can delete directory entities" on public.directory_entities;

create policy "Admins can delete directory entities"
on public.directory_entities for delete
to authenticated
using ((select public.is_directory_admin()));

drop policy if exists "Public can read directory entity sources" on public.directory_entity_sources;

create policy "Public can read directory entity sources"
on public.directory_entity_sources for select
to anon, authenticated
using (exists (
  select 1 from public.directory_entities e
  where e.id = entity_id and e.is_active = true
));

drop policy if exists "Admins can insert directory entity sources" on public.directory_entity_sources;

create policy "Admins can insert directory entity sources"
on public.directory_entity_sources for insert
to authenticated
with check ((select public.is_directory_admin()));

drop policy if exists "Admins can update directory entity sources" on public.directory_entity_sources;

create policy "Admins can update directory entity sources"
on public.directory_entity_sources for update
to authenticated
using ((select public.is_directory_admin()))
with check ((select public.is_directory_admin()));

drop policy if exists "Admins can delete directory entity sources" on public.directory_entity_sources;

create policy "Admins can delete directory entity sources"
on public.directory_entity_sources for delete
to authenticated
using ((select public.is_directory_admin()));

grant select on public.directory_entities to anon, authenticated;

grant insert, update, delete on public.directory_entities to authenticated;

grant select on public.directory_entity_sources to anon, authenticated;

grant insert, update, delete on public.directory_entity_sources to authenticated;

create or replace function public.search_directory_entities(
  p_query text default null,
  p_category text default null,
  p_village text default null,
  p_page integer default 1,
  p_page_size integer default 24
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = 'public', 'extensions'
as $$
declare
  v_query text := public.normalize_arabic_search(coalesce(p_query, ''));
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 24), 60));
  v_requested_page integer := greatest(1, coalesce(p_page, 1));
  v_total bigint;
  v_total_pages integer;
  v_page integer;
  v_offset integer;
  v_items jsonb;
begin
  select count(*) into v_total
  from public.directory_entities e
  where e.is_active = true
    and (p_category is null or p_category = '' or e.category = p_category)
    and (p_village is null or p_village = '' or p_village = 'all' or e.village = p_village)
    and (
      v_query = ''
      or e.search_text like '%' || v_query || '%'
      or e.search_text operator(extensions.%) v_query
    );

  v_total_pages := greatest(1, ceil(v_total::numeric / v_page_size)::integer);
  v_page := least(v_requested_page, v_total_pages);
  v_offset := (v_page - 1) * v_page_size;

  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.search_rank desc, row_data.quality_score desc, row_data.title), '[]'::jsonb)
  into v_items
  from (
    select
      e.id,
      e.slug,
      e.title,
      e.category,
      e.sub_category,
      e.location,
      e.village,
      e.locality,
      e.phone,
      e.whatsapp,
      e.hours,
      e.description,
      e.rating,
      e.review_count,
      e.rating_source,
      e.source,
      e.source_status,
      e.delivery_available,
      e.emergency,
      e.google_place_id,
      e.google_maps_plus_code,
      e.google_maps_url,
      e.last_updated_at,
      e.quality_score,
      case
        when v_query = '' then 0::real
        when e.search_text like '%' || v_query || '%' then 2::real
        else extensions.similarity(e.search_text, v_query)
      end as search_rank
    from public.directory_entities e
    where e.is_active = true
      and (p_category is null or p_category = '' or e.category = p_category)
      and (p_village is null or p_village = '' or p_village = 'all' or e.village = p_village)
      and (
        v_query = ''
        or e.search_text like '%' || v_query || '%'
        or e.search_text operator(extensions.%) v_query
      )
    order by search_rank desc, e.quality_score desc, e.title
    limit v_page_size offset v_offset
  ) row_data;

  return jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'totalPages', v_total_pages,
    'pageSize', v_page_size,
    'from', case when v_total = 0 then 0 else v_offset + 1 end,
    'to', case when v_total = 0 then 0 else least(v_offset + v_page_size, v_total::integer) end
  );
end;
$$;

revoke all on function public.search_directory_entities(text, text, text, integer, integer) from public;

grant execute on function public.search_directory_entities(text, text, text, integer, integer) to anon, authenticated;

create or replace function public.sync_directory_entities(
  p_entities jsonb,
  p_sources jsonb default '[]'::jsonb
)
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
  );

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

revoke all on function public.sync_directory_entities(jsonb, jsonb) from public, anon;

grant execute on function public.sync_directory_entities(jsonb, jsonb) to authenticated;

create or replace function private.mirror_published_business_to_directory()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if tg_op = 'DELETE' then
    update public.directory_entities
    set is_active = false
    where id = old.listing_id and origin = 'published';
    return old;
  end if;

  insert into public.directory_entities (
    id, slug, title, category, sub_category, location, village, locality,
    phone, whatsapp, hours, description, review_count, source, source_status,
    google_maps_url, last_updated_at, origin, is_active
  ) values (
    new.listing_id, new.slug, new.title, new.category, new.sub_category, new.location,
    new.village, new.locality, new.phone, new.whatsapp, new.hours, new.description,
    0, 'user_collected', 'cross_checked', new.google_maps_url, new.updated_at,
    'published', new.is_active
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
    source = excluded.source,
    source_status = excluded.source_status,
    google_maps_url = excluded.google_maps_url,
    last_updated_at = excluded.last_updated_at,
    origin = excluded.origin,
    is_active = excluded.is_active;

  return new;
end;
$$;

revoke all on function private.mirror_published_business_to_directory() from public, anon, authenticated;

drop trigger if exists published_businesses_directory_mirror on public.published_businesses;

create trigger published_businesses_directory_mirror
after insert or update or delete on public.published_businesses
for each row execute function private.mirror_published_business_to_directory();
