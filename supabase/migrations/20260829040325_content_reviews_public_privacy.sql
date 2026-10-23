-- Restored from Supabase schema history: 20260829040325 / content_reviews_public_privacy.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

revoke select on public.content_reviews from anon, authenticated;

grant select (
  id,
  target_type,
  target_key,
  rating,
  body,
  author_name,
  avatar_url,
  status,
  created_at,
  updated_at
) on public.content_reviews to anon;

grant select (
  id,
  user_id,
  target_type,
  target_key,
  rating,
  body,
  author_name,
  avatar_url,
  status,
  created_at,
  updated_at
) on public.content_reviews to authenticated;
