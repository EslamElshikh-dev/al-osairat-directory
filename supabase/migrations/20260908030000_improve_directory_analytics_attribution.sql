alter table public.directory_analytics_events
  add column if not exists visitor_id text,
  add column if not exists page_url text,
  add column if not exists referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text;

create index if not exists directory_analytics_events_visitor_created_idx
  on public.directory_analytics_events (visitor_id, created_at desc);

create index if not exists directory_analytics_events_event_created_idx
  on public.directory_analytics_events (event_type, created_at desc);
