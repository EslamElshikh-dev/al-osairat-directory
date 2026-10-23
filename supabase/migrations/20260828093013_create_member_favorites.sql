-- Restored from Supabase schema history: 20260828093013 / create_member_favorites.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null check (char_length(listing_id) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index favorites_user_created_idx on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;

grant select, insert, delete on public.favorites to authenticated;

create policy "users_can_view_own_favorites"
on public.favorites
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_can_add_own_favorites"
on public.favorites
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users_can_delete_own_favorites"
on public.favorites
for delete
to authenticated
using ((select auth.uid()) = user_id);
