-- Applied to production during the September 12, 2026 audit.
-- Keep migration history in the repository aligned with the live database.
drop index if exists public.directory_analytics_events_event_created_idx;
