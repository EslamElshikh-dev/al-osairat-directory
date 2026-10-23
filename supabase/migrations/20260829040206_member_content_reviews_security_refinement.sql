-- Restored from Supabase schema history: 20260829040206 / member_content_reviews_security_refinement.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

alter table public.content_reviews
  drop constraint if exists content_reviews_avatar_url_length_check;

alter table public.content_reviews
  add constraint content_reviews_avatar_url_check
  check (
    avatar_url is null
    or (char_length(avatar_url) <= 500 and avatar_url ~* '^https://')
  );

revoke execute on function public.get_content_review_summary(text, text) from public;

grant execute on function public.get_content_review_summary(text, text) to anon, authenticated;
