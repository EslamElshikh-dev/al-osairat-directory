-- Community V2.5: private following-feed read state.

create table if not exists public.community_feed_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.community_feed_state is
  'Private per-member state for the following feed. Never exposed publicly.';

alter table public.community_feed_state enable row level security;

revoke all on table public.community_feed_state from anon, authenticated;
grant select, insert, update on table public.community_feed_state to authenticated;

drop policy if exists community_feed_state_read_own on public.community_feed_state;
create policy community_feed_state_read_own
on public.community_feed_state
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists community_feed_state_insert_own on public.community_feed_state;
create policy community_feed_state_insert_own
on public.community_feed_state
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists community_feed_state_update_own on public.community_feed_state;
create policy community_feed_state_update_own
on public.community_feed_state
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function private.touch_community_feed_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_community_feed_state()
from public, anon, authenticated;

drop trigger if exists set_community_feed_state_updated_at on public.community_feed_state;
create trigger set_community_feed_state_updated_at
before update on public.community_feed_state
for each row
execute function private.touch_community_feed_state();
