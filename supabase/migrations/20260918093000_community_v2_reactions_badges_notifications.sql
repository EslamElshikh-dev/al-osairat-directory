-- Community V2: opt-in directory, reactions, contribution badges and reply notifications.

create table if not exists public.community_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid references public.content_reviews(id) on delete cascade,
  reply_id uuid references public.content_review_replies(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),

  constraint community_reactions_single_target_check
    check ((review_id is not null)::int + (reply_id is not null)::int = 1),
  constraint community_reactions_type_check
    check (reaction_type in ('like', 'helpful'))
);

comment on table public.community_reactions is
  'Private member reaction rows. Public surfaces receive aggregate counts through narrow RPC functions only.';

create unique index if not exists community_reactions_review_member_type_uidx
  on public.community_reactions (user_id, review_id, reaction_type)
  where review_id is not null;

create unique index if not exists community_reactions_reply_member_type_uidx
  on public.community_reactions (user_id, reply_id, reaction_type)
  where reply_id is not null;

create index if not exists community_reactions_review_counts_idx
  on public.community_reactions (review_id, reaction_type)
  where review_id is not null;

create index if not exists community_reactions_reply_counts_idx
  on public.community_reactions (reply_id, reaction_type)
  where reply_id is not null;

alter table public.community_reactions enable row level security;

revoke all on table public.community_reactions from anon, authenticated;
grant select, insert, delete on table public.community_reactions to authenticated;

drop policy if exists community_reactions_read_own on public.community_reactions;
create policy community_reactions_read_own
on public.community_reactions
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists community_reactions_insert_own on public.community_reactions;
create policy community_reactions_insert_own
on public.community_reactions
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
        where r.id = community_reactions.review_id
          and r.status = 'published'
          and r.user_id <> (select auth.uid())
      )
    )
    or
    (
      reply_id is not null
      and exists (
        select 1
        from public.content_review_replies rr
        join public.content_reviews r on r.id = rr.review_id
        where rr.id = community_reactions.reply_id
          and rr.status = 'published'
          and r.status = 'published'
          and rr.user_id <> (select auth.uid())
      )
    )
  )
);

drop policy if exists community_reactions_delete_own on public.community_reactions;
create policy community_reactions_delete_own
on public.community_reactions
for delete
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.get_community_reaction_counts(
  p_target_type text,
  p_target_ids uuid[]
)
returns table (
  target_id uuid,
  like_count bigint,
  helpful_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with requested as (
    select distinct value as target_id
    from unnest(coalesce(p_target_ids, array[]::uuid[])) as values_list(value)
    where cardinality(coalesce(p_target_ids, array[]::uuid[])) between 1 and 100
  ),
  visible as (
    select requested.target_id
    from requested
    where
      (
        p_target_type = 'review'
        and exists (
          select 1
          from public.content_reviews r
          where r.id = requested.target_id
            and r.status = 'published'
        )
      )
      or
      (
        p_target_type = 'reply'
        and exists (
          select 1
          from public.content_review_replies rr
          join public.content_reviews r on r.id = rr.review_id
          where rr.id = requested.target_id
            and rr.status = 'published'
            and r.status = 'published'
        )
      )
  )
  select
    visible.target_id,
    count(cr.id) filter (where cr.reaction_type = 'like')::bigint as like_count,
    count(cr.id) filter (where cr.reaction_type = 'helpful')::bigint as helpful_count
  from visible
  left join public.community_reactions cr
    on (p_target_type = 'review' and cr.review_id = visible.target_id)
    or (p_target_type = 'reply' and cr.reply_id = visible.target_id)
  group by visible.target_id;
$$;

revoke all on function public.get_community_reaction_counts(text, uuid[]) from public, anon, authenticated;
grant execute on function public.get_community_reaction_counts(text, uuid[]) to anon, authenticated;

create or replace function public.get_public_member_stats(p_user_ids uuid[])
returns table (
  user_id uuid,
  review_count bigint,
  reply_count bigint,
  like_received bigint,
  helpful_received bigint,
  helpful_people bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with requested as (
    select p.user_id
    from public.member_public_profiles p
    where p.is_public = true
      and p.user_id = any(coalesce(p_user_ids, array[]::uuid[]))
      and cardinality(coalesce(p_user_ids, array[]::uuid[])) between 1 and 100
  ),
  review_stats as (
    select r.user_id, count(*)::bigint as review_count
    from public.content_reviews r
    join requested q on q.user_id = r.user_id
    where r.status = 'published'
    group by r.user_id
  ),
  reply_stats as (
    select rr.user_id, count(*)::bigint as reply_count
    from public.content_review_replies rr
    join public.content_reviews parent on parent.id = rr.review_id
    join requested q on q.user_id = rr.user_id
    where rr.status = 'published'
      and parent.status = 'published'
    group by rr.user_id
  ),
  received as (
    select r.user_id, cr.user_id as reactor_id, cr.reaction_type
    from public.community_reactions cr
    join public.content_reviews r on r.id = cr.review_id
    join requested q on q.user_id = r.user_id
    where r.status = 'published'

    union all

    select rr.user_id, cr.user_id as reactor_id, cr.reaction_type
    from public.community_reactions cr
    join public.content_review_replies rr on rr.id = cr.reply_id
    join public.content_reviews parent on parent.id = rr.review_id
    join requested q on q.user_id = rr.user_id
    where rr.status = 'published'
      and parent.status = 'published'
  ),
  reaction_stats as (
    select
      user_id,
      count(*) filter (where reaction_type = 'like')::bigint as like_received,
      count(*) filter (where reaction_type = 'helpful')::bigint as helpful_received,
      count(distinct reactor_id) filter (where reaction_type = 'helpful')::bigint as helpful_people
    from received
    group by user_id
  )
  select
    q.user_id,
    coalesce(rs.review_count, 0)::bigint,
    coalesce(rps.reply_count, 0)::bigint,
    coalesce(rx.like_received, 0)::bigint,
    coalesce(rx.helpful_received, 0)::bigint,
    coalesce(rx.helpful_people, 0)::bigint
  from requested q
  left join review_stats rs on rs.user_id = q.user_id
  left join reply_stats rps on rps.user_id = q.user_id
  left join reaction_stats rx on rx.user_id = q.user_id;
$$;

revoke all on function public.get_public_member_stats(uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_member_stats(uuid[]) to anon, authenticated;

-- Extend the existing notification enum-like checks without weakening any previous values.
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
        'community_review_reply'::text
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
        'review_reply'::text
      ]
    )
  );

create or replace function private.notify_review_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_review public.content_reviews%rowtype;
  notification_href text;
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

  insert into public.member_notifications (
    user_id,
    type,
    title,
    message,
    href,
    entity_type,
    entity_id
  )
  values (
    parent_review.user_id,
    'community_review_reply',
    'رد جديد على تقييمك',
    left(new.author_name, 100) || ' رد على تقييمك.',
    notification_href,
    'review_reply',
    new.id
  );

  return new;
end;
$$;

revoke all on function private.notify_review_reply() from public, anon, authenticated;

drop trigger if exists notify_review_author_on_reply on public.content_review_replies;
create trigger notify_review_author_on_reply
after insert on public.content_review_replies
for each row
execute function private.notify_review_reply();
