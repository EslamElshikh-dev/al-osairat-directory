-- Add a dedicated worship category across the directory publishing flow.

alter table public.directory_entities
  drop constraint if exists directory_entities_category_check;

alter table public.directory_entities
  add constraint directory_entities_category_check
  check (
    category = any (
      array[
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
        'worship'::text,
        'transport'::text,
        'emergency'::text
      ]
    )
  );

alter table public.business_submissions
  drop constraint if exists business_submissions_category_check;

alter table public.business_submissions
  add constraint business_submissions_category_check
  check (
    category = any (
      array[
        'doctors'::text,
        'pharmacies'::text,
        'shops'::text,
        'education'::text,
        'crafts'::text,
        'restaurants'::text,
        'lawyers'::text,
        'clerics'::text,
        'community'::text,
        'worship'::text,
        'transport'::text
      ]
    )
  );

alter table public.published_businesses
  drop constraint if exists published_businesses_category_check;

alter table public.published_businesses
  add constraint published_businesses_category_check
  check (
    category = any (
      array[
        'doctors'::text,
        'pharmacies'::text,
        'shops'::text,
        'education'::text,
        'crafts'::text,
        'restaurants'::text,
        'lawyers'::text,
        'clerics'::text,
        'community'::text,
        'worship'::text,
        'transport'::text
      ]
    )
  );

update public.directory_entities
set
  category = 'worship',
  sub_category = case
    when title like '%كنيس%' then 'كنيسة'
    when title like '%مسجد%' or title like '%جامع%' then 'مسجد'
    else sub_category
  end,
  updated_at = now()
where is_active = true
  and category = 'community'
  and (
    sub_category = 'دور عبادة'
    or title like '%مسجد%'
    or title like '%جامع%'
    or title like '%كنيس%'
  );
