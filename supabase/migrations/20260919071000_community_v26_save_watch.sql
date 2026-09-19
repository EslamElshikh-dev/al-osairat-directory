-- Community V2.6: private saved contributions and watched discussions.

create table if not exists public.community_saved_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid references public.content_reviews(id) on delete cascade,
  reply_id uuid references public.content_review_replies(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint community_saved_contributions_one_target_check
    check (((review_id is not null)::int + (reply_id is not null)::int) = 1)
);

comment on table public.community_saved_contributions is
  'Private member bookmarks for published community reviews and replies.';

create unique index if not exists community_saved_contributions_user_review_uidx
  on public.community_saved_contributions (user_id, review_id)
  where review_id is not null;

create unique index if not exists community_saved_contributions_user_reply_uidx
  on public.community_saved_contributions (user_id, reply_id)
  where reply_id is not null;

create index if not exists community_saved_contributions_user_created_idx
  on public.community_saved_contributions (user_id, created_at desc);

alter table public.community_saved_contributions enable row level security;

revoke all on table public.community_saved_contributions from anon, authenticated;
grant select, insert, delete on table public.community_saved_contributions to authenticated;

drop policy if exists community_saved_contributions_read_own on public.community_saved_contributions;
create policy community_saved_contributions_read_own
on public.community_saved_contributions
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists community_saved_contributions_insert_own on public.community_saved_contributions;
create policy community_saved_contributions_insert_own
on public.community_saved_contributions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    (
      review_id is not null
      and exists (
        select 1
        from public.content_reviews r
        where r.id = community_saved_contributions.review_id
          and r.status = 'published'
      )
    )
    or
    (
      reply_id is not null
      and exists (
        select 1
        from public.content_review_replies rr
        join public.content_reviews parent on parent.id = rr.review_id
        where rr.id = community_saved_contributions.reply_id
          and rr.status = 'published'
          and parent.status = 'published'
      )
    )
  )
);

drop policy if exists community_saved_contributions_delete_own on public.community_saved_contributions;
create policy community_saved_contributions_delete_own
on public.community_saved_contributions
for delete
to authenticated
using (user_id = (select auth.uid()));

create table if not exists public.community_thread_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid not null references public.content_reviews(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint community_thread_watches_unique_pair
    unique (user_id, review_id)
);

comment on table public.community_thread_watches is
  'Private member subscriptions to published community review discussions.';

create index if not exists community_thread_watches_review_idx
  on public.community_thread_watches (review_id, created_at desc);

create index if not exists community_thread_watches_user_created_idx
  on public.community_thread_watches (user_id, created_at desc);

alter table public.community_thread_watches enable row level security;

revoke all on table public.community_thread_watches from anon, authenticated;
grant select, insert, delete on table public.community_thread_watches to authenticated;

drop policy if exists community_thread_watches_read_own on public.community_thread_watches;
create policy community_thread_watches_read_own
on public.community_thread_watches
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists community_thread_watches_insert_own on public.community_thread_watches;
create policy community_thread_watches_insert_own
on public.community_thread_watches
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.content_reviews r
    where r.id = community_thread_watches.review_id
      and r.status = 'published'
      and r.user_id <> (select auth.uid())
  )
);

drop policy if exists community_thread_watches_delete_own on public.community_thread_watches;
create policy community_thread_watches_delete_own
on public.community_thread_watches
for delete
to authenticated
using (user_id = (select auth.uid()));

-- Extend notification constraints for watched discussion digests.
alter table public.member_notifications
  drop constraint if exists member_notifications_type_check;

alter table public.member_notifications
  add constraint member_notifications_type_check
  check (
    type = any (
      array[
        'submission_needs_changes'::text,
        'submission_approved'::text,
        'submission_rejected'::text,
        'submission_published'::text,
        'claim_needs_changes'::text,
        'claim_approved'::text,
        'claim_rejected'::text,
        'listing_change_needs_changes'::text,
        'listing_change_approved'::text,
        'listing_change_rejected'::text,
        'listing_report_reviewing'::text,
        'listing_report_corrected'::text,
        'listing_report_resolved'::text,
        'listing_report_rejected'::text,
        'community_review_reply'::text,
        'community_helpful_received'::text,
        'community_thread_update'::text
      ]
    )
  );

alter table public.member_notifications
  drop constraint if exists member_notifications_entity_type_check;

alter table public.member_notifications
  add constraint member_notifications_entity_type_check
  check (
    entity_type = any (
      array[
        'business_submission'::text,
        'ownership_claim'::text,
        'listing_change'::text,
        'listing_report'::text,
        'review_reply'::text,
        'community_review'::text,
        'community_reply'::text,
        'community_watch'::text
      ]
    )
  );

-- Preserve the review author's grouped reply notification and additionally notify
-- private discussion watchers. Watchers never become public data.
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

  -- Author digest, excluding self-replies.
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

  -- Watched discussion digests. Do not duplicate the author's notification,
  -- and do not notify the member who just posted the reply.
  for watcher in
    select w.user_id
    from public.community_thread_watches w
    where w.review_id = parent_review.id
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
