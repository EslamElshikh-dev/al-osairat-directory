-- Restored from Supabase schema history: 20260829044743 / phase7_scale_foreign_key_indexes.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create index if not exists listing_change_requests_reviewed_by_idx on public.listing_change_requests(reviewed_by);

create index if not exists listing_overrides_approved_request_id_idx on public.listing_overrides(approved_request_id);

create index if not exists listing_overrides_updated_by_idx on public.listing_overrides(updated_by);

create index if not exists published_businesses_published_by_idx on public.published_businesses(published_by);

create index if not exists published_businesses_submitted_by_idx on public.published_businesses(submitted_by);
