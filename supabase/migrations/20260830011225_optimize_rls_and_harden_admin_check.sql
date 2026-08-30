alter function public.is_directory_admin() set search_path = '';
revoke execute on function public.is_directory_admin() from public, anon;
grant execute on function public.is_directory_admin() to authenticated;

alter policy "Members can create own business submissions"
on public.business_submissions
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
  and review_note is null
  and reviewed_at is null
);

alter policy "Members can view own business submissions"
on public.business_submissions
using (
  (select auth.uid()) = user_id
  or (select public.is_directory_admin())
);

drop policy if exists "Directory admins can view business submissions" on public.business_submissions;

alter policy "Directory admins can update business submissions"
on public.business_submissions
using ((select public.is_directory_admin()))
with check ((select public.is_directory_admin()));

alter policy "Members can create own ownership claims"
on public.business_ownership_claims
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
  and review_note is null
  and reviewed_at is null
);

alter policy "Members can view own ownership claims"
on public.business_ownership_claims
using (
  (select auth.uid()) = user_id
  or (select public.is_directory_admin())
);

drop policy if exists "Directory admins can view ownership claims" on public.business_ownership_claims;

alter policy "Directory admins can update ownership claims"
on public.business_ownership_claims
using ((select public.is_directory_admin()))
with check ((select public.is_directory_admin()));

alter policy "Members can view own listing ownerships"
on public.listing_ownerships
using (
  (select auth.uid()) = user_id
  or (select public.is_directory_admin())
);

drop policy if exists "Directory admins can view listing ownerships" on public.listing_ownerships;

alter policy "members read own listing changes"
on public.listing_change_requests
using (
  user_id = (select auth.uid())
  or (select public.is_directory_admin())
);

alter policy "members read own notifications"
on public.member_notifications
using ((select auth.uid()) = user_id);

alter policy "members mark own notifications read"
on public.member_notifications
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy "content_reviews_delete_own"
on public.content_reviews
using (user_id = (select auth.uid()));

alter policy "content_reviews_insert_own"
on public.content_reviews
with check (
  user_id = (select auth.uid())
  and status = 'published'
);

alter policy "content_reviews_read_published_or_own"
on public.content_reviews
using (
  status = 'published'
  or user_id = (select auth.uid())
);

alter policy "content_reviews_update_own"
on public.content_reviews
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter policy "users_can_view_own_profile"
on public.profiles
using (
  (select auth.uid()) = id
  or (select public.is_directory_admin())
);

drop policy if exists "Directory admins can view member profiles" on public.profiles;
