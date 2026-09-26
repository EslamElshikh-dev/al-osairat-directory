-- Keep public-source scans deduplicated and serialized without exposing scheduler state.
alter table public.osairat_jobs
  add constraint osairat_jobs_source_url_key unique (source_url);

grant select, insert, update on public.osairat_jobs to service_role;

create table public.osairat_job_feed_state (
  id integer primary key default 1 check (id = 1),
  last_checked_at timestamptz,
  last_attempt_at timestamptz not null default '-infinity'::timestamptz,
  successful_feeds integer not null default 0,
  latest_added integer not null default 0
);
alter table public.osairat_job_feed_state enable row level security;
revoke all on public.osairat_job_feed_state from public, anon, authenticated;
grant select, update on public.osairat_job_feed_state to service_role;
insert into public.osairat_job_feed_state (id) values (1);
