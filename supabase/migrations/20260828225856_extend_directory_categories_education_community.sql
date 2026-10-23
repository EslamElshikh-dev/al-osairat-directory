-- Restored from Supabase schema history: 20260828225856 / extend_directory_categories_education_community.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

alter table public.published_businesses drop constraint if exists published_businesses_category_check;

alter table public.published_businesses
  add constraint published_businesses_category_check
  check (category = any (array['doctors'::text,'pharmacies'::text,'shops'::text,'education'::text,'crafts'::text,'restaurants'::text,'lawyers'::text,'clerics'::text,'community'::text]));

alter table public.business_submissions drop constraint if exists business_submissions_category_check;

alter table public.business_submissions
  add constraint business_submissions_category_check
  check (category = any (array['doctors'::text,'pharmacies'::text,'shops'::text,'education'::text,'crafts'::text,'restaurants'::text,'lawyers'::text,'clerics'::text,'community'::text]));
