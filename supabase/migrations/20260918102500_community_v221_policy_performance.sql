-- Community V2.2.1: performance cleanup for moderation RLS and foreign keys.

create index if not exists community_content_reports_review_id_idx
  on public.community_content_reports (review_id)
  where review_id is not null;

create index if not exists community_content_reports_reply_id_idx
  on public.community_content_reports (reply_id)
  where reply_id is not null;

create index if not exists community_content_reports_reviewed_by_idx
  on public.community_content_reports (reviewed_by)
  where reviewed_by is not null;

-- Combine reporter/admin SELECT into one policy to avoid duplicate permissive checks.
drop policy if exists community_content_reports_read_own on public.community_content_reports;
drop policy if exists community_content_reports_admin_read on public.community_content_reports;

create policy community_content_reports_read_own_or_admin
on public.community_content_reports
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_directory_admin())
);

-- Combine owner/admin moderation UPDATE rules on reviews.
drop policy if exists content_reviews_update_own on public.content_reviews;
drop policy if exists content_reviews_admin_moderate on public.content_reviews;

create policy content_reviews_update_own_or_admin
on public.content_reviews
for update
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_directory_admin())
)
with check (
  user_id = (select auth.uid())
  or (select public.is_directory_admin())
);

-- Combine owner/admin moderation UPDATE rules on replies.
drop policy if exists content_review_replies_update_own on public.content_review_replies;
drop policy if exists content_review_replies_admin_moderate on public.content_review_replies;

create policy content_review_replies_update_own_or_admin
on public.content_review_replies
for update
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_directory_admin())
)
with check (
  user_id = (select auth.uid())
  or (select public.is_directory_admin())
);
