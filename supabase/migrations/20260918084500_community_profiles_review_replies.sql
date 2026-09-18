-- Community profiles + member review replies V1
-- Keeps private account data in public.profiles private and exposes only an explicit safe projection.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Restore only the Data API privileges the existing content_reviews RLS policies require.
revoke all on table public.content_reviews from anon, authenticated;
grant select on table public.content_reviews to anon, authenticated;
grant insert, update, delete on table public.content_reviews to authenticated;

create table if not exists public.member_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  village text,
  locality text,
  show_location boolean not null default false,
  is_public boolean not null default false,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint member_public_profiles_slug_check
    check (slug ~ '^[a-z0-9][a-z0-9-]{7,48}$'),
  constraint member_public_profiles_display_name_check
    check (char_length(btrim(display_name)) between 2 and 100),
  constraint member_public_profiles_avatar_url_check
    check (avatar_url is null or (char_length(avatar_url) <= 500 and avatar_url ~* '^https://')),
  constraint member_public_profiles_bio_check
    check (bio is null or char_length(btrim(bio)) between 2 and 320),
  constraint member_public_profiles_village_check
    check (village is null or char_length(btrim(village)) between 2 and 80),
  constraint member_public_profiles_locality_check
    check (locality is null or char_length(btrim(locality)) between 2 and 100)
);

comment on table public.member_public_profiles is
  'Privacy-safe public member profile projection. Never store email, phone, tokens, or other private account fields here.';

alter table public.member_public_profiles enable row level security;

revoke all on table public.member_public_profiles from anon, authenticated;
grant select on table public.member_public_profiles to anon, authenticated;
grant update (bio, is_public, show_location) on table public.member_public_profiles to authenticated;

drop policy if exists member_public_profiles_read_public_or_own on public.member_public_profiles;
create policy member_public_profiles_read_public_or_own
on public.member_public_profiles
for select
to anon, authenticated
using (
  is_public = true
  or user_id = (select auth.uid())
);

drop policy if exists member_public_profiles_update_own on public.member_public_profiles;
create policy member_public_profiles_update_own
on public.member_public_profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function private.member_public_slug(p_user_id uuid)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select 'member-' || substr(md5(p_user_id::text || ':usayrat-public-profile:v1'), 1, 12);
$$;

revoke all on function private.member_public_slug(uuid) from public, anon, authenticated;

create or replace function private.sync_member_public_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.member_public_profiles (
    user_id,
    slug,
    display_name,
    avatar_url,
    village,
    locality,
    joined_at
  )
  values (
    new.id,
    private.member_public_slug(new.id),
    coalesce(nullif(btrim(new.full_name), ''), 'عضو دليل العسيرات'),
    case
      when new.avatar_url is not null and new.avatar_url ~* '^https://' then left(new.avatar_url, 500)
      else null
    end,
    nullif(btrim(new.village), ''),
    nullif(btrim(new.locality), ''),
    coalesce(new.created_at, now())
  )
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    village = excluded.village,
    locality = excluded.locality,
    updated_at = now();

  return new;
end;
$$;

revoke all on function private.sync_member_public_profile() from public, anon, authenticated;

drop trigger if exists sync_member_public_profile on public.profiles;
create trigger sync_member_public_profile
after insert or update of full_name, avatar_url, village, locality
on public.profiles
for each row
execute function private.sync_member_public_profile();

insert into public.member_public_profiles (
  user_id,
  slug,
  display_name,
  avatar_url,
  village,
  locality,
  joined_at
)
select
  p.id,
  private.member_public_slug(p.id),
  coalesce(nullif(btrim(p.full_name), ''), 'عضو دليل العسيرات'),
  case
    when p.avatar_url is not null and p.avatar_url ~* '^https://' then left(p.avatar_url, 500)
    else null
  end,
  nullif(btrim(p.village), ''),
  nullif(btrim(p.locality), ''),
  p.created_at
from public.profiles p
on conflict (user_id) do update
set
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url,
  village = excluded.village,
  locality = excluded.locality,
  updated_at = now();

create table if not exists public.content_review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.content_reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  author_name text not null,
  avatar_url text,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint content_review_replies_one_per_member unique (review_id, user_id),
  constraint content_review_replies_body_check
    check (char_length(btrim(body)) between 2 and 600),
  constraint content_review_replies_author_name_check
    check (char_length(btrim(author_name)) between 1 and 100),
  constraint content_review_replies_avatar_url_check
    check (avatar_url is null or (char_length(avatar_url) <= 500 and avatar_url ~* '^https://')),
  constraint content_review_replies_status_check
    check (status in ('published', 'hidden'))
);

comment on table public.content_review_replies is
  'Flat member replies to published content reviews. One reply per member per review in V1.';

create index if not exists content_review_replies_review_created_idx
  on public.content_review_replies (review_id, created_at asc);

create index if not exists content_review_replies_user_created_idx
  on public.content_review_replies (user_id, created_at desc);

alter table public.content_review_replies enable row level security;

revoke all on table public.content_review_replies from anon, authenticated;
grant select on table public.content_review_replies to anon, authenticated;
grant insert, update, delete on table public.content_review_replies to authenticated;

drop policy if exists content_review_replies_read_published_or_own on public.content_review_replies;
create policy content_review_replies_read_published_or_own
on public.content_review_replies
for select
to anon, authenticated
using (
  status = 'published'
  or user_id = (select auth.uid())
);

drop policy if exists content_review_replies_insert_own on public.content_review_replies;
create policy content_review_replies_insert_own
on public.content_review_replies
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'published'
  and exists (
    select 1
    from public.content_reviews r
    where r.id = review_id
      and r.status = 'published'
  )
);

drop policy if exists content_review_replies_update_own on public.content_review_replies;
create policy content_review_replies_update_own
on public.content_review_replies
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and status = 'published'
);

drop policy if exists content_review_replies_delete_own on public.content_review_replies;
create policy content_review_replies_delete_own
on public.content_review_replies
for delete
to authenticated
using (user_id = (select auth.uid()));

create or replace function private.touch_content_review_reply()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_content_review_reply() from public, anon, authenticated;

drop trigger if exists set_content_review_replies_updated_at on public.content_review_replies;
create trigger set_content_review_replies_updated_at
before update on public.content_review_replies
for each row
execute function private.touch_content_review_reply();
