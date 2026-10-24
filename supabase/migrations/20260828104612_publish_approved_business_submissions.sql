-- Restored from Supabase schema history: 20260828104612 / publish_approved_business_submissions.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

alter table public.business_submissions
  add column if not exists published_listing_id text,
  add column if not exists published_at timestamptz;

create unique index if not exists business_submissions_published_listing_id_key
  on public.business_submissions (published_listing_id)
  where published_listing_id is not null;

create table if not exists public.published_businesses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.business_submissions(id) on delete restrict,
  listing_id text not null unique,
  slug text not null unique,
  title text not null,
  category text not null check (category in ('doctors','pharmacies','shops','crafts','restaurants','lawyers','clerics')),
  sub_category text,
  location text not null,
  village text not null,
  locality text,
  phone text,
  whatsapp text,
  hours text,
  description text,
  google_maps_url text,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  published_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists published_businesses_category_idx on public.published_businesses(category);

create index if not exists published_businesses_village_idx on public.published_businesses(village);

create index if not exists published_businesses_published_at_idx on public.published_businesses(published_at desc);

alter table public.published_businesses enable row level security;

revoke all on public.published_businesses from public, anon, authenticated;

grant select on public.published_businesses to anon, authenticated;

drop policy if exists "Public can read active published businesses" on public.published_businesses;

create policy "Public can read active published businesses"
  on public.published_businesses
  for select
  to anon, authenticated
  using (is_active = true);

create or replace function public.touch_published_business_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists published_businesses_touch_updated_at on public.published_businesses;

create trigger published_businesses_touch_updated_at
before update on public.published_businesses
for each row execute function public.touch_published_business_updated_at();

create or replace function public.publish_business_submission(
  p_id uuid,
  p_slug text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.business_submissions%rowtype;
  v_existing public.published_businesses%rowtype;
  v_listing_id text;
  v_slug text;
begin
  if not public.is_directory_admin() then
    raise exception 'not_authorized';
  end if;

  select * into v_submission
  from public.business_submissions
  where id = p_id
  for update;

  if not found then
    raise exception 'submission_not_found';
  end if;

  if v_submission.status = 'rejected' then
    raise exception 'rejected_submission_cannot_publish';
  end if;

  select * into v_existing
  from public.published_businesses
  where submission_id = p_id;

  if found then
    return jsonb_build_object(
      'published', true,
      'alreadyPublished', true,
      'listingId', v_existing.listing_id,
      'slug', v_existing.slug,
      'publishedAt', v_existing.published_at
    );
  end if;

  v_slug := trim(both '-' from coalesce(p_slug, ''));
  if char_length(v_slug) < 2 or char_length(v_slug) > 140 then
    raise exception 'invalid_slug';
  end if;

  v_listing_id := 'published-' || replace(v_submission.id::text, '-', '');

  insert into public.published_businesses (
    submission_id,
    listing_id,
    slug,
    title,
    category,
    sub_category,
    location,
    village,
    locality,
    phone,
    whatsapp,
    hours,
    description,
    google_maps_url,
    submitted_by,
    published_by
  ) values (
    v_submission.id,
    v_listing_id,
    v_slug,
    v_submission.business_name,
    v_submission.category,
    v_submission.sub_category,
    v_submission.location_details,
    v_submission.village,
    v_submission.locality,
    v_submission.phone,
    v_submission.whatsapp,
    v_submission.hours,
    v_submission.description,
    v_submission.google_maps_url,
    v_submission.user_id,
    auth.uid()
  )
  returning * into v_existing;

  update public.business_submissions
  set status = 'approved',
      review_note = case
        when nullif(trim(coalesce(p_note, '')), '') is not null then trim(p_note)
        else review_note
      end,
      reviewed_at = coalesce(reviewed_at, now()),
      updated_at = now(),
      published_listing_id = v_existing.listing_id,
      published_at = v_existing.published_at
  where id = p_id;

  return jsonb_build_object(
    'published', true,
    'alreadyPublished', false,
    'listingId', v_existing.listing_id,
    'slug', v_existing.slug,
    'publishedAt', v_existing.published_at
  );
end;
$$;

revoke all on function public.publish_business_submission(uuid, text, text) from public, anon, authenticated;

grant execute on function public.publish_business_submission(uuid, text, text) to authenticated;
