-- Community V2.8: conversation inbox controls and per-thread notification mute.

alter table public.community_thread_watches
  add column if not exists notifications_muted boolean not null default false;

grant update (notifications_muted)
on table public.community_thread_watches
to authenticated;

comment on column public.community_thread_watches.notifications_muted is
  'Private member preference: keep tracking this discussion but suppress watcher notifications.';

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
  watcher record;
begin
  select *
    into parent_review
  from public.content_reviews
  where id = new.review_id
    and status = 'published';

  if not found then
    return new;
  end if;

  notification_href := case
    when parent_review.target_type = 'site'
      then '/#review-' || parent_review.id::text
    when parent_review.target_type = 'article'
      then '/blog/' || parent_review.target_key || '#review-' || parent_review.id::text
    else '/account#notifications'
  end;

  if parent_review.user_id <> new.user_id then
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
    else
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
    end if;
  end if;

  -- Muted watches keep their unread counters/read position, but receive no push-style
  -- member notification until the member unmutes the discussion.
  for watcher in
    select w.user_id
    from public.community_thread_watches w
    where w.review_id = parent_review.id
      and coalesce(w.notifications_muted, false) = false
      and w.user_id <> parent_review.user_id
      and w.user_id <> new.user_id
  loop
    select *
    into existing_notification
    from public.member_notifications n
    where n.user_id = watcher.user_id
      and n.type = 'community_thread_update'
      and n.entity_type = 'community_watch'
      and n.entity_id = parent_review.id
      and n.last_event_at >= now() - interval '6 hours'
    order by n.last_event_at desc
    limit 1;

    if found then
      next_count := least(existing_notification.event_count + 1, 1000000);

      update public.member_notifications
      set
        title = 'تحديثات جديدة في نقاش تتابعه',
        message = 'وصلت ' || next_count::text || ' ردود جديدة في نقاش تتابعه.',
        href = notification_href,
        event_count = next_count,
        last_event_at = now(),
        created_at = now(),
        read_at = null
      where id = existing_notification.id;
    else
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
        watcher.user_id,
        'community_thread_update',
        'تحديث جديد في نقاش تتابعه',
        'وصل رد جديد في نقاش اخترت متابعته.',
        notification_href,
        'community_watch',
        parent_review.id,
        1,
        now()
      );
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.notify_review_reply()
from public, anon, authenticated;
