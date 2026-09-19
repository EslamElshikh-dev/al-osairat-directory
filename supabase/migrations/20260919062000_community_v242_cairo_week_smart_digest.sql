-- Community V2.4.2: align weekly community ranking with Egypt local dates
-- and make grouped notifications smart without hiding genuinely new events.

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
      and (created_at at time zone 'Africa/Cairo')::date = p_activity_date;
  else
    select
      count(*) filter (where reaction_type = 'like'),
      count(*) filter (where reaction_type = 'helpful')
    into v_like_count, v_helpful_count
    from public.community_reactions
    where reply_id = p_target_id
      and (created_at at time zone 'Africa/Cairo')::date = p_activity_date;
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
    v_activity_date := (old.created_at at time zone 'Africa/Cairo')::date;
    perform private.refresh_community_reaction_daily_total(v_target_type, v_target_id, v_activity_date);
    return old;
  end if;

  v_target_type := case when new.review_id is not null then 'review' else 'reply' end;
  v_target_id := coalesce(new.review_id, new.reply_id);
  v_activity_date := (new.created_at at time zone 'Africa/Cairo')::date;
  perform private.refresh_community_reaction_daily_total(v_target_type, v_target_id, v_activity_date);
  return new;
end;
$$;

revoke all on function private.sync_community_reaction_daily_total()
from public, anon, authenticated;

-- Rebuild the privacy-safe daily aggregate table with Egypt-local dates.
delete from public.community_reaction_daily_totals;

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
  (created_at at time zone 'Africa/Cairo')::date as activity_date,
  count(*) filter (where reaction_type = 'like')::bigint as like_count,
  count(*) filter (where reaction_type = 'helpful')::bigint as helpful_count,
  now()
from public.community_reactions
group by
  case when review_id is not null then 'review' else 'reply' end,
  coalesce(review_id, reply_id),
  (created_at at time zone 'Africa/Cairo')::date;

-- A new reply is important enough to re-open the same grouped notification.
-- We still avoid notification-row spam because all replies in the 6h window remain one row.
create or replace function private.notify_review_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_review public.content_reviews%rowtype;
  notification_href text;
  existing_notification public.member_notifications%rowtype;
  next_count integer;
begin
  select *
    into parent_review
  from public.content_reviews
  where id = new.review_id
    and status = 'published';

  if not found or parent_review.user_id = new.user_id then
    return new;
  end if;

  notification_href := case
    when parent_review.target_type = 'site'
      then '/#review-' || parent_review.id::text
    when parent_review.target_type = 'article'
      then '/blog/' || parent_review.target_key || '#review-' || parent_review.id::text
    else '/account#notifications'
  end;

  select *
  into existing_notification
  from public.member_notifications n
  where n.user_id = parent_review.user_id
    and n.type = 'community_review_reply'
    and n.entity_type = 'review_reply'
    and n.entity_id = parent_review.id
    and n.last_event_at >= now() - interval '6 hours'
  order by n.last_event_at desc
  limit 1;

  if found then
    next_count := least(existing_notification.event_count + 1, 1000000);

    update public.member_notifications
    set
      title = 'ردود جديدة على تقييمك',
      message = 'وصلت ' || next_count::text || ' ردود جديدة على تقييمك.',
      href = notification_href,
      event_count = next_count,
      last_event_at = now(),
      created_at = now(),
      read_at = null
    where id = existing_notification.id;

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
    parent_review.user_id,
    'community_review_reply',
    'رد جديد على تقييمك',
    left(new.author_name, 100) || ' رد على تقييمك.',
    notification_href,
    'review_reply',
    parent_review.id,
    1,
    now()
  );

  return new;
end;
$$;

revoke all on function private.notify_review_reply()
from public, anon, authenticated;

-- Helpful reactions stay grouped forever per contribution. If the member already read the
-- notification, surface it again only at meaningful milestones to reduce noise.
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
  v_resurface boolean;
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
    v_resurface :=
      v_existing.read_at is null
      or v_next_count in (3, 5, 10, 25, 50, 100, 250, 500, 1000);

    update public.member_notifications
    set
      event_count = v_next_count,
      title = 'مساهمتك تفيد المجتمع',
      message = 'حصلت مساهمتك على ' || v_next_count::text || ' إشارات «مفيد» من أعضاء المجتمع.',
      href = v_href,
      last_event_at = now(),
      created_at = now(),
      read_at = case when v_resurface then null else v_existing.read_at end
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
