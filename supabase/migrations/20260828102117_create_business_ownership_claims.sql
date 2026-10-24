-- Restored from Supabase schema history: 20260828102117 / create_business_ownership_claims.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create table if not exists public.business_ownership_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null,
  relationship text not null check (relationship in ('owner','manager','authorized_representative')),
  phone text not null,
  proof_method text not null check (proof_method in ('listing_phone','google_business_profile','official_document','other')),
  proof_details text not null,
  status text not null default 'pending' check (status in ('pending','needs_changes','approved','rejected')),
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.business_ownership_claims enable row level security;

drop policy if exists "Members can view own ownership claims" on public.business_ownership_claims;

create policy "Members can view own ownership claims"
on public.business_ownership_claims
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Members can create own ownership claims" on public.business_ownership_claims;

create policy "Members can create own ownership claims"
on public.business_ownership_claims
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
  and review_note is null
  and reviewed_at is null
);

create unique index if not exists business_ownership_claims_open_unique
on public.business_ownership_claims (user_id, listing_id)
where status in ('pending','needs_changes');

create index if not exists business_ownership_claims_user_created_idx
on public.business_ownership_claims (user_id, created_at desc);

create or replace function public.set_business_ownership_claims_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_business_ownership_claims_updated_at on public.business_ownership_claims;

create trigger set_business_ownership_claims_updated_at
before update on public.business_ownership_claims
for each row execute function public.set_business_ownership_claims_updated_at();

revoke all on table public.business_ownership_claims from anon;

revoke all on table public.business_ownership_claims from authenticated;

grant select, insert on table public.business_ownership_claims to authenticated;
