-- Living Directory V1: allow member reviews to attach to directory listings.
-- Existing RLS policies and ownership rules remain unchanged.

alter table public.content_reviews
  drop constraint if exists content_reviews_target_type_check;

alter table public.content_reviews
  add constraint content_reviews_target_type_check
  check (target_type = any (array['site'::text, 'article'::text, 'listing'::text]));

alter table public.content_reviews
  drop constraint if exists content_reviews_target_key_check;

alter table public.content_reviews
  add constraint content_reviews_target_key_check
  check (
    ((target_type = 'site'::text) and (target_key = 'site'::text))
    or
    ((target_type = 'article'::text) and (target_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text))
    or
    (
      (target_type = 'listing'::text)
      and (char_length(btrim(target_key)) between 1 and 180)
      and (target_key !~ '[[:cntrl:]/?#]'::text)
    )
  );
