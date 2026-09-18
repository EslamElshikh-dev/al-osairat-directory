-- Community V2.1 hardening: replace public SECURITY DEFINER aggregate RPCs
-- with privacy-safe aggregate tables maintained by private triggers.

create table if not exists public.community_reaction_totals (
  target_type text not null,
  target_id uuid not null,
  like_count bigint not null default 0,
  helpful_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (target_type, target_id),
  constraint community_reaction_totals_target_type_check
    check (target_type in ('review', 'reply')),
  constraint community_reaction_totals_like_count_check
    check (like_count >= 0),
  constraint community_reaction_totals_helpful_count_check
    check (helpful_count >= 0)
);

comment on table public.community_reaction_totals is
  'Public aggregate reaction counts only. Contains no reactor identity or private member data.';

alter table public.community_reaction_totals enable row level security;
revoke all on table public.community_reaction_totals from anon, authenticated;
grant select on table public.community_reaction_totals to anon, authenticated;

drop policy if exists community_reaction_totals_read_public on public.community_reaction_totals;
create policy community_reaction_totals_read_public
on public.community_reaction_totals
for select
to anon, authenticated
using (true);

create table if not exists public.public_member_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  review_count bigint not null default 0,
  reply_count bigint not null default 0,
  like_received bigint not null default 0,
  helpful_received bigint not null default 0,
  helpful_people bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint public_member_stats_review_count_check check (review_count >= 0),
  constraint public_member_stats_reply_count_check check (reply_count >= 0),
  constraint public_member_stats_like_received_check check (like_received >= 0),
  constraint public_member_stats_helpful_received_check check (helpful_received >= 0),
  constraint public_member_stats_helpful_people_check check (helpful_people >= 0)
);

comment on table public.public_member_stats is
  'Public-safe contribution aggregates. RLS exposes rows only while the member public profile is explicitly enabled.';

alter table public.public_member_stats enable row level security;
revoke all on table public.public_member_stats from anon, authenticated;
grant select on table public.public_member_stats to anon, authenticated;

drop policy if exists public_member_stats_read_visible_profiles on public.public_member_stats;
create policy public_member_stats_read_visible_profiles
on public.public_member_stats
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.member_public_profiles p
    where p.user_id = public_member_stats.user_id
      and p.is_public = true
  )
);

create or replace function private.refresh_community_reaction_total(
  p_target_type text,
  p_target_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_like_count bigint := 0;
  v_helpful_count bigint := 0;
begin
  if p_target_type not in ('review', 'reply') or p_target_id is null then
    return;
  end if;

  if p_target_type = 'review' then
    select
      count(*) filter (where reaction_type = 'like'),
      count(*) filter (where reaction_type = 'helpful')
    into v_like_count, v_helpful_count
    from public.community_reactions
    where review_id = p_target_id;
  else
    select
      count(*) filter (where reaction_type = 'like'),
      count(*) filter (where reaction_type = 'helpful')
    into v_like_count, v_helpful_count
    from public.community_reactions
    where reply_id = p_target_id;
  end if;

  insert into public.community_reaction_totals (
    target_type, target_id, like_count, helpful_count, updated_at
  )
  values (
    p_target_type,
    p_target_id,
    coalesce(v_like_count, 0),
    coalesce(v_helpful_count, 0),
    now()
  )
  on conflict (target_type, target_id) do update
  set
    like_count = excluded.like_count,
    helpful_count = excluded.helpful_count,
    updated_at = now();
end;
$$;

revoke all on function private.refresh_community_reaction_total(text, uuid)
from public, anon, authenticated;

create or replace function private.sync_community_reaction_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.community_reactions%rowtype;
begin
  if tg_op = 'DELETE' then
    v_row := old;
  else
    v_row := new;
  end if;

  if v_row.review_id is not null then
    perform private.refresh_community_reaction_total('review', v_row.review_id);
  elsif v_row.reply_id is not null then
    perform private.refresh_community_reaction_total('reply', v_row.reply_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_community_reaction_total()
from public, anon, authenticated;

drop trigger if exists sync_community_reaction_total on public.community_reactions;
create trigger sync_community_reaction_total
after insert or delete on public.community_reactions
for each row
execute function private.sync_community_reaction_total();

create or replace function private.refresh_public_member_stats(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review_count bigint := 0;
  v_reply_count bigint := 0;
  v_like_received bigint := 0;
  v_helpful_received bigint := 0;
  v_helpful_people bigint := 0;
begin
  if p_user_id is null then
    return;
  end if;

  select count(*)
  into v_review_count
  from public.content_reviews r
  where r.user_id = p_user_id
    and r.status = 'published';

  select count(*)
  into v_reply_count
  from public.content_review_replies rr
  join public.content_reviews parent on parent.id = rr.review_id
  where rr.user_id = p_user_id
    and rr.status = 'published'
    and parent.status = 'published';

  with received as (
    select cr.user_id as reactor_id, cr.reaction_type
    from public.community_reactions cr
    join public.content_reviews r on r.id = cr.review_id
    where r.user_id = p_user_id
      and r.status = 'published'

    union all

    select cr.user_id as reactor_id, cr.reaction_type
    from public.community_reactions cr
    join public.content_review_replies rr on rr.id = cr.reply_id
    join public.content_reviews parent on parent.id = rr.review_id
    where rr.user_id = p_user_id
      and rr.status = 'published'
      and parent.status = 'published'
  )
  select
    count(*) filter (where reaction_type = 'like'),
    count(*) filter (where reaction_type = 'helpful'),
    count(distinct reactor_id) filter (where reaction_type = 'helpful')
  into v_like_received, v_helpful_received, v_helpful_people
  from received;

  insert into public.public_member_stats (
    user_id,
    review_count,
    reply_count,
    like_received,
    helpful_received,
    helpful_people,
    updated_at
  )
  values (
    p_user_id,
    coalesce(v_review_count, 0),
    coalesce(v_reply_count, 0),
    coalesce(v_like_received, 0),
    coalesce(v_helpful_received, 0),
    coalesce(v_helpful_people, 0),
    now()
  )
  on conflict (user_id) do update
  set
    review_count = excluded.review_count,
    reply_count = excluded.reply_count,
    like_received = excluded.like_received,
    helpful_received = excluded.helpful_received,
    helpful_people = excluded.helpful_people,
    updated_at = now();
end;
$$;

revoke all on function private.refresh_public_member_stats(uuid)
from public, anon, authenticated;

create or replace function private.sync_member_stats_from_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_public_member_stats(old.user_id);
    return old;
  end if;

  perform private.refresh_public_member_stats(new.user_id);

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform private.refresh_public_member_stats(old.user_id);
  end if;

  return new;
end;
$$;

revoke all on function private.sync_member_stats_from_review()
from public, anon, authenticated;

drop trigger if exists sync_member_stats_from_review on public.content_reviews;
create trigger sync_member_stats_from_review
after insert or update of user_id, status or delete on public.content_reviews
for each row
execute function private.sync_member_stats_from_review();

create or replace function private.sync_member_stats_from_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_public_member_stats(old.user_id);
    return old;
  end if;

  perform private.refresh_public_member_stats(new.user_id);

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform private.refresh_public_member_stats(old.user_id);
  end if;

  return new;
end;
$$;

revoke all on function private.sync_member_stats_from_reply()
from public, anon, authenticated;

drop trigger if exists sync_member_stats_from_reply on public.content_review_replies;
create trigger sync_member_stats_from_reply
after insert or update of user_id, status or delete on public.content_review_replies
for each row
execute function private.sync_member_stats_from_reply();

create or replace function private.sync_member_stats_from_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.community_reactions%rowtype;
  v_author_id uuid;
begin
  if tg_op = 'DELETE' then
    v_row := old;
  else
    v_row := new;
  end if;

  if v_row.review_id is not null then
    select r.user_id
    into v_author_id
    from public.content_reviews r
    where r.id = v_row.review_id;
  elsif v_row.reply_id is not null then
    select rr.user_id
    into v_author_id
    from public.content_review_replies rr
    where rr.id = v_row.reply_id;
  end if;

  if v_author_id is not null then
    perform private.refresh_public_member_stats(v_author_id);
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function private.sync_member_stats_from_reaction()
from public, anon, authenticated;

drop trigger if exists sync_member_stats_from_reaction on public.community_reactions;
create trigger sync_member_stats_from_reaction
after insert or delete on public.community_reactions
for each row
execute function private.sync_member_stats_from_reaction();

-- Backfill aggregate tables from existing Community V2 data.
insert into public.community_reaction_totals (
  target_type, target_id, like_count, helpful_count, updated_at
)
select
  'review',
  cr.review_id,
  count(*) filter (where cr.reaction_type = 'like'),
  count(*) filter (where cr.reaction_type = 'helpful'),
  now()
from public.community_reactions cr
where cr.review_id is not null
group by cr.review_id
on conflict (target_type, target_id) do update
set
  like_count = excluded.like_count,
  helpful_count = excluded.helpful_count,
  updated_at = now();

insert into public.community_reaction_totals (
  target_type, target_id, like_count, helpful_count, updated_at
)
select
  'reply',
  cr.reply_id,
  count(*) filter (where cr.reaction_type = 'like'),
  count(*) filter (where cr.reaction_type = 'helpful'),
  now()
from public.community_reactions cr
where cr.reply_id is not null
group by cr.reply_id
on conflict (target_type, target_id) do update
set
  like_count = excluded.like_count,
  helpful_count = excluded.helpful_count,
  updated_at = now();

select private.refresh_public_member_stats(p.user_id)
from public.member_public_profiles p;

-- These exposed SECURITY DEFINER RPCs are no longer needed.
drop function if exists public.get_community_reaction_counts(text, uuid[]);
drop function if exists public.get_public_member_stats(uuid[]);
