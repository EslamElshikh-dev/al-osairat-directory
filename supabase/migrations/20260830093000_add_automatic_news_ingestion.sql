-- Persist discovered local news and pre-generated editorial coverage.
-- Public clients can only read published, presentation-safe columns.
-- All ingestion writes and raw source text remain service-role only.

create table if not exists public.news_items (
  id text primary key,
  title text not null,
  summary text,
  url text not null unique,
  source text not null,
  source_url text not null,
  published_at timestamptz not null,
  village text not null,
  topic text not null,
  origin text not null default 'live',
  status text not null default 'published',
  editorial_status text not null default 'pending',
  source_excerpt text,
  source_text text,
  source_hash text,
  generated_editorial jsonb,
  source_fetched_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_error text,
  constraint news_items_origin_check check (origin in ('live', 'archive')),
  constraint news_items_status_check check (status in ('published', 'hidden')),
  constraint news_items_editorial_status_check
    check (editorial_status in ('pending', 'ready', 'insufficient', 'failed')),
  constraint news_items_generated_editorial_check
    check (generated_editorial is null or jsonb_typeof(generated_editorial) = 'object')
);

create index if not exists news_items_published_at_idx
  on public.news_items (published_at desc)
  where status = 'published';

create index if not exists news_items_editorial_queue_idx
  on public.news_items (editorial_status, published_at desc)
  where status = 'published';

create table if not exists public.news_ingestion_runs (
  id uuid primary key,
  trigger text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  item_count integer not null default 0,
  live_item_count integer not null default 0,
  connected_source_count integer not null default 0,
  total_source_count integer not null default 0,
  generated_count integer not null default 0,
  failed_count integer not null default 0,
  error_summary jsonb,
  constraint news_ingestion_runs_trigger_check
    check (trigger in ('cron', 'visit', 'manual')),
  constraint news_ingestion_runs_status_check
    check (status in ('running', 'succeeded', 'partial', 'failed'))
);

create index if not exists news_ingestion_runs_started_at_idx
  on public.news_ingestion_runs (started_at desc);

create table if not exists public.news_ingestion_state (
  singleton boolean primary key default true,
  locked_run_id uuid,
  locked_until timestamptz,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_status text,
  last_item_count integer not null default 0,
  last_live_item_count integer not null default 0,
  last_connected_source_count integer not null default 0,
  total_source_count integer not null default 0,
  last_generated_count integer not null default 0,
  last_failed_count integer not null default 0,
  constraint news_ingestion_state_singleton_check check (singleton),
  constraint news_ingestion_state_status_check
    check (last_status is null or last_status in ('running', 'succeeded', 'partial', 'failed'))
);

insert into public.news_ingestion_state (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.news_items enable row level security;
alter table public.news_ingestion_runs enable row level security;
alter table public.news_ingestion_state enable row level security;

drop policy if exists "Published news is publicly readable" on public.news_items;
create policy "Published news is publicly readable"
on public.news_items
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "News status is publicly readable" on public.news_ingestion_state;
create policy "News status is publicly readable"
on public.news_ingestion_state
for select
to anon, authenticated
using (singleton);

revoke all on table public.news_items from anon, authenticated;
grant select (
  id, title, summary, url, source, source_url, published_at, village, topic,
  origin, status, editorial_status, source_excerpt, generated_editorial,
  first_seen_at, last_seen_at, updated_at
) on table public.news_items to anon, authenticated;

revoke all on table public.news_ingestion_runs from anon, authenticated;

revoke all on table public.news_ingestion_state from anon, authenticated;
grant select (
  singleton, last_completed_at, last_status, last_item_count, last_live_item_count,
  last_connected_source_count, total_source_count, last_generated_count,
  last_failed_count
) on table public.news_ingestion_state to anon, authenticated;

grant all on table public.news_items to service_role;
grant all on table public.news_ingestion_runs to service_role;
grant all on table public.news_ingestion_state to service_role;

create or replace function public.claim_news_ingestion(
  p_trigger text,
  p_min_interval_minutes integer default 25
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_run_id uuid := extensions.gen_random_uuid();
  v_claimed boolean;
  v_interval interval := greatest(1, least(coalesce(p_min_interval_minutes, 25), 1440)) * interval '1 minute';
begin
  if p_trigger not in ('cron', 'visit', 'manual') then
    raise exception 'invalid ingestion trigger';
  end if;

  update public.news_ingestion_state
  set
    locked_run_id = v_run_id,
    locked_until = now() + interval '10 minutes',
    last_started_at = now(),
    last_status = 'running'
  where singleton = true
    and (locked_until is null or locked_until < now())
    and (
      p_trigger = 'manual'
      or last_completed_at is null
      or last_completed_at <= now() - v_interval
    )
  returning true into v_claimed;

  if not coalesce(v_claimed, false) then
    return null;
  end if;

  insert into public.news_ingestion_runs (id, trigger, status)
  values (v_run_id, p_trigger, 'running');

  return v_run_id;
end;
$function$;

create or replace function public.complete_news_ingestion(
  p_run_id uuid,
  p_status text,
  p_item_count integer,
  p_live_item_count integer,
  p_connected_source_count integer,
  p_total_source_count integer,
  p_generated_count integer,
  p_failed_count integer,
  p_error_summary jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_status not in ('succeeded', 'partial', 'failed') then
    raise exception 'invalid ingestion status';
  end if;

  update public.news_ingestion_runs
  set
    status = p_status,
    completed_at = now(),
    item_count = greatest(0, coalesce(p_item_count, 0)),
    live_item_count = greatest(0, coalesce(p_live_item_count, 0)),
    connected_source_count = greatest(0, coalesce(p_connected_source_count, 0)),
    total_source_count = greatest(0, coalesce(p_total_source_count, 0)),
    generated_count = greatest(0, coalesce(p_generated_count, 0)),
    failed_count = greatest(0, coalesce(p_failed_count, 0)),
    error_summary = p_error_summary
  where id = p_run_id;

  update public.news_ingestion_state
  set
    locked_run_id = null,
    locked_until = null,
    last_completed_at = now(),
    last_status = p_status,
    last_item_count = greatest(0, coalesce(p_item_count, 0)),
    last_live_item_count = greatest(0, coalesce(p_live_item_count, 0)),
    last_connected_source_count = greatest(0, coalesce(p_connected_source_count, 0)),
    total_source_count = greatest(0, coalesce(p_total_source_count, 0)),
    last_generated_count = greatest(0, coalesce(p_generated_count, 0)),
    last_failed_count = greatest(0, coalesce(p_failed_count, 0))
  where singleton = true and locked_run_id = p_run_id;
end;
$function$;

revoke execute on function public.claim_news_ingestion(text, integer) from public, anon, authenticated;
revoke execute on function public.complete_news_ingestion(uuid, text, integer, integer, integer, integer, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.claim_news_ingestion(text, integer) to service_role;
grant execute on function public.complete_news_ingestion(uuid, text, integer, integer, integer, integer, integer, integer, jsonb) to service_role;

comment on table public.news_items is
  'Automatically discovered local news with source attribution and pre-generated original editorial coverage.';
comment on column public.news_items.source_text is
  'Raw source material used only for server-side verification and never granted to public roles.';
