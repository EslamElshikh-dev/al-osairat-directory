-- Allow the canonical directory catalog to persist the transport category.
-- Applied to production on 2026-08-29 before syncing the first transport batch.

alter table public.directory_entities
  drop constraint if exists directory_entities_category_check;

alter table public.directory_entities
  add constraint directory_entities_category_check
  check (category = any (array[
    'doctors'::text,
    'pharmacies'::text,
    'shops'::text,
    'education'::text,
    'crafts'::text,
    'restaurants'::text,
    'lawyers'::text,
    'clerics'::text,
    'government'::text,
    'community'::text,
    'transport'::text,
    'emergency'::text
  ]));
