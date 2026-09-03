create table if not exists public.news_sources (
  id text primary key,
  source_kind text not null default 'facebook',
  name text not null,
  external_id text not null,
  source_url text not null,
  trust_level text not null default 'review',
  publish_mode text not null default 'review',
  require_local_match boolean not null default true,
  allow_sensitive_auto_publish boolean not null default false,
  active boolean not null default false,
  poll_interval_seconds integer not null default 120,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_external_cursor text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_sources_id_check check (id ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  constraint news_sources_kind_check check (source_kind in ('facebook')),
  constraint news_sources_name_check check (char_length(btrim(name)) between 2 and 120),
  constraint news_sources_external_id_check check (char_length(btrim(external_id)) between 2 and 120),
  constraint news_sources_url_check check (
    source_url like 'https://www.facebook.com/%'
    or source_url like 'https://facebook.com/%'
  ),
  constraint news_sources_trust_check check (trust_level in ('official','trusted','review')),
  constraint news_sources_publish_mode_check check (publish_mode in ('automatic','review')),
  constraint news_sources_poll_interval_check check (poll_interval_seconds between 60 and 3600),
  constraint news_sources_last_error_check check (last_error is null or char_length(last_error) <= 500),
  unique (source_kind, external_id)
);

comment on table public.news_sources is 'Private server-controlled registry for trusted external news sources. Facebook sources remain inactive until a valid Meta access token and reviewed Page IDs are configured.';

alter table public.news_sources enable row level security;
revoke all on table public.news_sources from public, anon, authenticated;
grant select, insert, update, delete on table public.news_sources to service_role;

create index if not exists news_sources_active_check_idx
  on public.news_sources (source_kind, active, last_checked_at)
  where active = true;

alter table public.news_items
  add column if not exists source_kind text not null default 'web',
  add column if not exists source_external_id text,
  add column if not exists source_parent_external_id text,
  add column if not exists source_trust_level text;

alter table public.news_items
  drop constraint if exists news_items_source_kind_check,
  add constraint news_items_source_kind_check check (source_kind in ('web','facebook')),
  drop constraint if exists news_items_source_trust_level_check,
  add constraint news_items_source_trust_level_check check (source_trust_level is null or source_trust_level in ('official','trusted','review'));

create unique index if not exists news_items_external_source_unique_idx
  on public.news_items (source_kind, source_external_id)
  where source_external_id is not null;

create index if not exists news_items_source_parent_idx
  on public.news_items (source_kind, source_parent_external_id, published_at desc)
  where source_parent_external_id is not null;

comment on column public.news_items.source_external_id is 'Provider-specific post/article ID used for idempotent ingestion and deduplication.';
comment on column public.news_items.source_parent_external_id is 'Provider-specific parent source ID, such as the Facebook Page ID.';
comment on column public.news_items.source_trust_level is 'Trust tier inherited from the configured source at ingestion time.';
