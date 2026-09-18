-- Community V2.3: private member following, public-safe follower totals,
-- and first-helpful notifications without exposing reactor identity.

create table if not exists public.community_member_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint community_member_follows_not_self_check
    check (follower_id <> followed_user_id),
  constraint community_member_follows_unique_pair
    unique (follower_id, followed_user_id)
);

comment on table public.community_member_follows is
  'Private follow graph. A member can read only their own outgoing follows; public surfaces expose counts only.';

create index if not exists community_member_follows_followed_idx
  on public.community_member_follows (followed_user_id, created_at desc);

create index if not exists community_member_follows_follower_idx
  on public.community_member_follows (follower_id, created_at desc);

alter table public.community_member_follows enable row level security;

revoke all on table public.community_member_follows from anon, authenticated;
grant select, insert, delete on table public.community_member_follows to authenticated;

drop policy if exists community_member_follows_read_own on public.community_member_follows;
create policy community_member_follows_read_own
on public.community_member_follows
for select
to authenticated
using (follower_id = (select auth.uid()));

drop policy if exists community_member_follows_insert_own on public.community_member_follows;
create policy community_member_follows_insert_own
on public.community_member_follows
for insert
to authenticated
with check (
  follower_id = (select auth.uid())
  and followed_user_id <> (select auth.uid())
  and exists (
    select 1
    from public.member_public_profiles p
    where p.user_id = community_member_follows.followed_user_id
      and p.is_public = true
  )
);

drop policy if exists community_member_follows_delete_own on public.community_member_follows;
create policy community_member_follows_delete_own
on public.community_member_follows
for delete
to authenticated
using (follower_id = (select auth.uid()));

create table if not exists public.community_follow_totals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  follower_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint community_follow_totals_follower_count_check
    check (follower_count >= 0)
);

comment on table public.community_follow_totals is
  'Public-safe follower counts. Contains no follower identity and is readable only while the profile is public.';

alter table public.community_follow_totals enable row level security;

revoke all on table public.community_follow_totals from anon, authenticated;
grant select on table public.community_follow_totals to anon, authenticated;

drop policy if exists community_follow_totals_read_public on public.community_follow_totals;
create policy community_follow_totals_read_public
on public.community_follow_totals
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.member_public_profiles p
    where p.user_id = community_follow_totals.user_id
      and p.is_public = true
  )
);

create or replace function private.refresh_community_follow_total(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint := 0;
begin
  if p_user_id is null then
    return;
  end if;

  select count(*)
  into v_count
  from public.community_member_follows f
  where f.followed_user_id = p_user_id;

  insert into public.community_follow_totals (user_id, follower_count, updated_at)
  values (p_user_id, coalesce(v_count, 0), now())
  on conflict (user_id) do update
  set follower_count = excluded.follower_count,
      updated_at = now();
end;
$$;

revoke all on function private.refresh_community_follow_total(uuid)
from public, anon, authenticated;

create or replace function private.sync_community_follow_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_community_follow_total(old.followed_user_id);
    return old;
  end if;

  perform private.refresh_community_follow_total(new.followed_user_id);
  return new;
end;
$$;

revoke all on function private.sync_community_follow_total()
from public, anon, authenticated;

drop trigger if exists sync_community_follow_total on public.community_member_follows;
create trigger sync_community_follow_total
after insert or delete on public.community_member_follows
for each row
execute function private.sync_community_follow_total();

insert into public.community_follow_totals (user_id, follower_count, updated_at)
select
  p.user_id,
  coalesce(count(f.id), 0)::bigint,
  now()
from public.member_public_profiles p
left join public.community_member_follows f
  on f.followed_user_id = p.user_id
group by p.user_id
on conflict (user_id) do update
set follower_count = excluded.follower_count,
    updated_at = now();

-- Extend existing notification constraints.
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
        'community_helpful_received'::text
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
        'community_reply'::text
      ]
    )
  );

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

  if exists (
    select 1
    from public.member_notifications n
    where n.user_id = v_author_id
      and n.type = 'community_helpful_received'
      and n.entity_type = v_entity_type
      and n.entity_id = v_target_id
  ) then
    return new;
  end if;

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
    v_author_id,
    'community_helpful_received',
    'مساهمتك كانت مفيدة',
    'وجد أحد أعضاء المجتمع أن مساهمتك مفيدة.',
    v_href,
    v_entity_type,
    v_target_id
  );

  return new;
end;
$$;

revoke all on function private.notify_first_helpful_reaction()
from public, anon, authenticated;

drop trigger if exists notify_first_helpful_reaction on public.community_reactions;
create trigger notify_first_helpful_reaction
after insert on public.community_reactions
for each row
execute function private.notify_first_helpful_reaction();
