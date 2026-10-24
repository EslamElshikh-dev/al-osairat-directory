-- Restored from Supabase schema history: 20260828223037 / tighten_directory_analytics_and_report_notifications.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

drop policy if exists directory_analytics_insert_only on public.directory_analytics_events;

create policy directory_analytics_insert_only
on public.directory_analytics_events
for insert
to anon, authenticated
with check (
  event_type in ('directory_search','view_listing','phone_click','whatsapp_click','maps_click','favorite_add','favorite_remove')
  and session_id ~ '^[A-Za-z0-9_-]{8,80}$'
  and created_at >= now() - interval '5 minutes'
  and created_at <= now() + interval '1 minute'
  and (source_path is null or source_path like '/%')
  and (search_term is null or search_term !~* '([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|(^|[^0-9])01[0-9]{9}([^0-9]|$)|[0-9]{7,})')
  and (
    (event_type = 'directory_search' and listing_id is null and result_count is not null)
    or
    (event_type <> 'directory_search' and listing_id is not null and search_term is null and result_count is null)
  )
);

-- Align notification constraints with the listing-report trigger already used by the app.
alter table public.member_notifications drop constraint if exists member_notifications_type_check;

alter table public.member_notifications add constraint member_notifications_type_check check (
  type in (
    'submission_needs_changes','submission_approved','submission_rejected','submission_published',
    'claim_needs_changes','claim_approved','claim_rejected',
    'listing_change_needs_changes','listing_change_approved','listing_change_rejected',
    'listing_report_reviewing','listing_report_corrected','listing_report_resolved','listing_report_rejected'
  )
);

alter table public.member_notifications drop constraint if exists member_notifications_entity_type_check;

alter table public.member_notifications add constraint member_notifications_entity_type_check check (
  entity_type in ('business_submission','ownership_claim','listing_change','listing_report')
);
