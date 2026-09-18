-- Community V2.2 moderation reports for reviews and replies.

create table if not exists public.community_content_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid references public.content_reviews(id) on delete cascade,
  reply_id uuid references public.content_review_replies(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending',
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint community_content_reports_single_target_check
    check ((review_id is not null)::int + (reply_id is not null)::int = 1),
  constraint community_content_reports_reason_check
    check (reason in ('spam', 'abuse', 'privacy', 'misleading', 'off_topic', 'other')),
  constraint community_content_reports_details_check
    check (details is null or char_length(btrim(details)) between 3 and 800),
  constraint community_content_reports_status_check
    check (status in ('pending', 'reviewing', 'resolved', 'rejected')),
  constraint community_content_reports_review_note_check
    check (review_note is null or char_length(btrim(review_note)) between 3 and 1200)
);

comment on table public.community_content_reports is
  'Member reports for published community reviews or replies. Reporter identity is visible only to the reporter and directory admins.';

create unique index if not exists community_content_reports_open_review_uidx
  on public.community_content_reports (user_id, review_id)
  where review_id is not null and status in ('pending', 'reviewing');

create unique index if not exists community_content_reports_open_reply_uidx
  on public.community_content_reports (user_id, reply_id)
  where reply_id is not null and status in ('pending', 'reviewing');

create index if not exists community_content_reports_status_created_idx
  on public.community_content_reports (status, created_at desc);

create index if not exists community_content_reports_user_created_idx
  on public.community_content_reports (user_id, created_at desc);

alter table public.community_content_reports enable row level security;

revoke all on table public.community_content_reports from anon, authenticated;
grant select, insert, update on table public.community_content_reports to authenticated;

drop policy if exists community_content_reports_read_own on public.community_content_reports;
create policy community_content_reports_read_own
on public.community_content_reports
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists community_content_reports_insert_own on public.community_content_reports;
create policy community_content_reports_insert_own
on public.community_content_reports
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and (
    (
      review_id is not null
      and exists (
        select 1
        from public.content_reviews r
        where r.id = community_content_reports.review_id
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
        join public.content_reviews parent on parent.id = rr.review_id
        where rr.id = community_content_reports.reply_id
          and rr.status = 'published'
          and parent.status = 'published'
          and rr.user_id <> (select auth.uid())
      )
    )
  )
);

drop policy if exists community_content_reports_admin_read on public.community_content_reports;
create policy community_content_reports_admin_read
on public.community_content_reports
for select
to authenticated
using ((select public.is_directory_admin()));

drop policy if exists community_content_reports_admin_update on public.community_content_reports;
create policy community_content_reports_admin_update
on public.community_content_reports
for update
to authenticated
using ((select public.is_directory_admin()))
with check ((select public.is_directory_admin()));

-- Allow directory admins to moderate published community content.
drop policy if exists content_reviews_admin_moderate on public.content_reviews;
create policy content_reviews_admin_moderate
on public.content_reviews
for update
to authenticated
using ((select public.is_directory_admin()))
with check ((select public.is_directory_admin()));

drop policy if exists content_review_replies_admin_moderate on public.content_review_replies;
create policy content_review_replies_admin_moderate
on public.content_review_replies
for update
to authenticated
using ((select public.is_directory_admin()))
with check ((select public.is_directory_admin()));

create or replace function private.touch_community_content_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_community_content_report()
from public, anon, authenticated;

drop trigger if exists set_community_content_reports_updated_at on public.community_content_reports;
create trigger set_community_content_reports_updated_at
before update on public.community_content_reports
for each row
execute function private.touch_community_content_report();
