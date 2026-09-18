-- Community V2.4.1: group multiple replies on the same review into one notification.

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
      title = case
        when next_count = 1 then 'رد جديد على تقييمك'
        else 'ردود جديدة على تقييمك'
      end,
      message = case
        when next_count = 1
          then left(new.author_name, 100) || ' رد على تقييمك.'
        else 'وصلت ' || next_count::text || ' ردود جديدة على تقييمك.'
      end,
      href = notification_href,
      event_count = next_count,
      last_event_at = now(),
      created_at = now(),
      read_at = case
        when existing_notification.read_at is null then null
        else existing_notification.read_at
      end
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
