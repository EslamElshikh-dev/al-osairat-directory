-- Restored from Supabase schema history: 20260829035503 / member_content_reviews.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create table public.content_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('site', 'article')),
  target_key text not null,
  rating smallint not null check (rating between 1 and 5),
  body text not null,
  author_name text not null,
  avatar_url text,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_reviews_target_key_check check (
    (target_type = 'site' and target_key = 'site')
    or
    (target_type = 'article' and target_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
  ),
  constraint content_reviews_body_length_check check (char_length(btrim(body)) between 20 and 1200),
  constraint content_reviews_author_name_length_check check (char_length(btrim(author_name)) between 1 and 100),
  constraint content_reviews_avatar_url_length_check check (avatar_url is null or char_length(avatar_url) <= 500),
  constraint content_reviews_one_per_member unique (user_id, target_type, target_key)
);

create index content_reviews_target_published_idx
  on public.content_reviews (target_type, target_key, created_at desc)
  where status = 'published';

create index content_reviews_user_idx
  on public.content_reviews (user_id, updated_at desc);

alter table public.content_reviews enable row level security;

create policy content_reviews_read_published_or_own
  on public.content_reviews
  for select
  to anon, authenticated
  using (status = 'published' or user_id = auth.uid());

create policy content_reviews_insert_own
  on public.content_reviews
  for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'published');

create policy content_reviews_update_own
  on public.content_reviews
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy content_reviews_delete_own
  on public.content_reviews
  for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on public.content_reviews from anon, authenticated;

grant select on public.content_reviews to anon, authenticated;

grant insert (user_id, target_type, target_key, rating, body, author_name, avatar_url) on public.content_reviews to authenticated;

grant update (rating, body, author_name, avatar_url) on public.content_reviews to authenticated;

grant delete on public.content_reviews to authenticated;

create or replace function public.touch_content_reviews_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_content_reviews_updated_at() from public, anon, authenticated;

create trigger content_reviews_touch_updated_at
before update on public.content_reviews
for each row execute function public.touch_content_reviews_updated_at();

create or replace function public.get_content_review_summary(p_target_type text, p_target_key text)
returns table (
  review_count bigint,
  average_rating numeric,
  star_5 bigint,
  star_4 bigint,
  star_3 bigint,
  star_2 bigint,
  star_1 bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint,
    coalesce(round(avg(rating)::numeric, 2), 0::numeric),
    count(*) filter (where rating = 5)::bigint,
    count(*) filter (where rating = 4)::bigint,
    count(*) filter (where rating = 3)::bigint,
    count(*) filter (where rating = 2)::bigint,
    count(*) filter (where rating = 1)::bigint
  from public.content_reviews
  where target_type = p_target_type
    and target_key = p_target_key
    and status = 'published';
$$;

grant execute on function public.get_content_review_summary(text, text) to anon, authenticated;
