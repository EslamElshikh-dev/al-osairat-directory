-- Community V2.4: weekly helpful aggregates, private member progress access,
-- and grouped helpful notifications.

create table if not exists public.community_reaction_daily_totals (
  target_type text not null,
  target_id uuid not null,
  activity_date date not null,
  like_count bigint not null default 0,
  helpful_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (target_type, target_id, activity_date),
  constraint community_reaction_daily_totals_target_type_check
    check (target_type in ('review', 'reply')),
  constraint community_reaction_daily_totals_like_count_check
    check (like_count >= 0),
  constraint community_reaction_daily_totals_helpful_count_check
    check (helpful_count >= 0)
);

comment on table public.community_reaction_daily_totals is
  'Privacy-safe daily reaction counts only. Contains no reactor identity.';

create index if not exists community_reaction_daily_totals_date_helpful_idx
  on public.community_reaction_daily_totals (activity_date desc, helpful_count desc);

alter table public.community_reaction_daily_totals enable row level security;
revoke all on table public.community_reaction_daily_totals from anon, authenticated;
grant select on table public.community_reaction_daily_totals to anon, authenticated;

drop policy if exists community_reaction_daily_totals_read_visible on public.community_reaction_daily_totals;
create policy community_reaction_daily_totals_read_visible
on public.community_reaction_daily_totals
for select
to anon, authenticated
using (
  (
    target_type = 'review'
    and exists (
      select 1
      from public.content_reviews r
      where r.id = community_reaction_daily_totals.target_id
        and r.status = 'published'
    )
  )
  or
  (
    target_type = 'reply'
    and exists (
      select 1
      from public.content_review_replies rr
      join public.content_reviews parent on parent.id = rr.review_id
      where rr.id = community_reaction_daily_totals.target_id
        and rr.status = 'published'
        and parent.status = 'published'
    )
  )
);

create or replace function private.refresh_community_reaction_daily_total(
  p_target_type text,
  p_target_id uuid,
  p_activity_date date
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
  if p_target_type not in ('review', 'reply')
     or p_target_id is null
     or p_activity_date is null then
    return;
  end if;

  if p_target_type = 'review' then
    select
      count(*) filter (where reaction_type = 'like'),
      count(*) filter (where reaction_type = 'helpful')
    into v_like_count, v_helpful_count
    from public.community_reactions
    where review_id = p_target_id
      and (created_at at time zone 'UTC')::date = p_activity_date;
  else
    select
      count(*) filter (where reaction_type = 'like'),
      count(*) filter (where reaction_type = 'helpful')
    into v_like_count, v_helpful_count
    from public.community_reactions
    where reply_id = p_target_id
      and (created_at at time zone 'UTC')::date = p_activity_date;
  end if;

  if coalesce(v_like_count, 0) = 0 and coalesce(v_helpful_count, 0) = 0 then
    delete from public.community_reaction_daily_totals
    where target_type = p_target_type
      and target_id = p_target_id
      and activity_date = p_activity_date;
    return;
  end if;

  insert into public.community_reaction_daily_totals (
    target_type,
    target_id,
    activity_date,
    like_count,
    helpful_count,
    updated_at
  )
  values (
    p_target_type,
    p_target_id,
    p_activity_date,
    coalesce(v_like_count, 0),
    coalesce(v_helpful_count, 0),
    now()
  )
  on conflict (target_type, target_id, activity_date) do update
  set
    like_count = excluded.like_count,
    helpful_count = excluded.helpful_count,
    updated_at = now();
end;
$$;

revoke all on function private.refresh_community_reaction_daily_total(text, uuid, date)
from public, anon, authenticated;

create or replace function private.sync_community_reaction_daily_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_type text;
  v_target_id uuid;
  v_activity_date date;
begin
  if tg_op = 'DELETE' then
    v_target_type := case when old.review_id is not null then 'review' else 'reply' end;
    v_target_id := coalesce(old.review_id, old.reply_id);
    v_activity_date := (old.created_at at time zone 'UTC')::date;
    perform private.refresh_community_reaction_daily_total(v_target_type, v_target_id, v_activity_date);
    return old;
  end if;

  v_target_type := case when new.review_id is not null then 'review' else 'reply' end;
  v_target_id := coalesce(new.review_id, new.reply_id);
  v_activity_date := (new.created_at at time zone 'UTC')::date;
  perform private.refresh_community_reaction_daily_total(v_target_type, v_target_id, v_activity_date);
  return new;
end;
$$;

revoke all on function private.sync_community_reaction_daily_total()
from public, anon, authenticated;

drop trigger if exists sync_community_reaction_daily_total on public.community_reactions;
create trigger sync_community_reaction_daily_total
after insert or delete on public.community_reactions
for each row
execute function private.sync_community_reaction_daily_total();

insert into public.community_reaction_daily_totals (
  target_type,
  target_id,
  activity_date,
  like_count,
  helpful_count,
  updated_at
)
select
  case when review_id is not null then 'review' else 'reply' end as target_type,
  coalesce(review_id, reply_id) as target_id,
  (created_at at time zone 'UTC')::date as activity_date,
  count(*) filter (where reaction_type = 'like')::bigint as like_count,
  count(*) filter (where reaction_type = 'helpful')::bigint as helpful_count,
  now()
from public.community_reactions
group by
  case when review_id is not null then 'review' else 'reply' end,
  coalesce(review_id, reply_id),
  (created_at at time zone 'UTC')::date
on conflict (target_type, target_id, activity_date) do update
set
  like_count = excluded.like_count,
  helpful_count = excluded.helpful_count,
  updated_at = now();

-- Let a member read their own progress even while their public page is disabled,
-- without creating a second permissive SELECT policy.
drop policy if exists public_member_stats_read_visible_profiles on public.public_member_stats;
drop policy if exists public_member_stats_read_visible_or_own on public.public_member_stats;

create policy public_member_stats_read_visible_or_own
on public.public_member_stats
for select
to anon, authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.member_public_profiles p
    where p.user_id = public_member_stats.user_id
      and p.is_public = true
  )
);

-- Add grouping metadata to existing notifications.
alter table public.member_notifications
  add column if not exists event_count integer not null default 1,
  add column if not exists last_event_at timestamptz not null default now();

alter table public.member_notifications
  drop constraint if exists member_notifications_event_count_check;

alter table public.member_notifications
  add constraint member_notifications_event_count_check
  check (event_count between 1 and 1000000);

create index if not exists member_notifications_user_type_entity_idx
  on public.member_notifications (user_id, type, entity_type, entity_id);

-- Replace first-only helpful notification with a grouped notification.
create or replace function private.notify_first_helpful_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
  v_target_id uuid;
  v_entity_type text;
  v_href text;
  v_review public.content_reviews%rowtype;
  v_reply public.content_review_replies%rowtype;
  v_existing public.member_notifications%rowtype;
  v_next_count integer;
begin
  if new.reaction_type <> 'helpful' then
    return new;
  end if;

  if new.review_id is not null then
    select *
    into v_review
    from public.content_reviews r
    where r.id = new.review_id
      and r.status = 'published';

    if not found then
      return new;
    end if;

    v_author_id := v_review.user_id;
    v_target_id := v_review.id;
    v_entity_type := 'community_review';
    v_href := case
      when v_review.target_type = 'site'
        then '/#review-' || v_review.id::text
      when v_review.target_type = 'article'
        then '/blog/' || v_review.target_key || '#review-' || v_review.id::text
      else '/account#notifications'
    end;
  elsif new.reply_id is not null then
    select rr.*
    into v_reply
    from public.content_review_replies rr
    join public.content_reviews parent on parent.id = rr.review_id
    where rr.id = new.reply_id
      and rr.status = 'published'
      and parent.status = 'published';

    if not found then
      return new;
    end if;

    select *
    into v_review
    from public.content_reviews r
    where r.id = v_reply.review_id
      and r.status = 'published';

    if not found then
      return new;
    end if;

    v_author_id := v_reply.user_id;
    v_target_id := v_reply.id;
    v_entity_type := 'community_reply';
    v_href := case
      when v_review.target_type = 'site'
        then '/#review-' || v_review.id::text
      when v_review.target_type = 'article'
        then '/blog/' || v_review.target_key || '#review-' || v_review.id::text
      else '/account#notifications'
    end;
  else
    return new;
  end if;

  if v_author_id is null or v_author_id = new.user_id then
    return new;
  end if;

  select *
  into v_existing
  from public.member_notifications n
  where n.user_id = v_author_id
    and n.type = 'community_helpful_received'
    and n.entity_type = v_entity_type
    and n.entity_id = v_target_id
  order by n.created_at desc
  limit 1;

  if found then
    v_next_count := least(v_existing.event_count + 1, 1000000);

    update public.member_notifications
    set
      event_count = v_next_count,
      title = case
        when v_next_count = 1 then 'مساهمتك كانت مفيدة'
        else 'مساهمتك تفيد المجتمع'
      end,
      message = case
        when v_next_count = 1
          then 'وجد أحد أعضاء المجتمع أن مساهمتك مفيدة.'
        else 'حصلت مساهمتك على ' || v_next_count::text || ' إشارات «مفيد» من أعضاء المجتمع.'
      end,
      href = v_href,
      last_event_at = now(),
      created_at = now(),
      read_at = case
        when v_existing.read_at is null then null
        when v_existing.last_event_at < now() - interval '6 hours' then null
        else v_existing.read_at
      end
    where id = v_existing.id;

    return new;
  end if;

  insert into public.member_notifications (
    user_id,
    type,
    title,
    message,
    href,
    entity_type,
    entity_id,
    event_count,
    last_event_at
  )
  values (
    v_author_id,
    'community_helpful_received',
    'مساهمتك كانت مفيدة',
    'وجد أحد أعضاء المجتمع أن مساهمتك مفيدة.',
    v_href,
    v_entity_type,
    v_target_id,
    1,
    now()
  );

  return new;
end;
$$;

revoke all on function private.notify_first_helpful_reaction()
from public, anon, authenticated;
