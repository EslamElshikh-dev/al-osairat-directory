-- Restored from Supabase schema history: 20260828093857 / extend_member_profiles.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists village text,
  add column if not exists locality text;

alter table public.profiles
  drop constraint if exists profiles_phone_length,
  add constraint profiles_phone_length check (phone is null or char_length(phone) <= 24),
  drop constraint if exists profiles_village_length,
  add constraint profiles_village_length check (village is null or char_length(village) <= 80),
  drop constraint if exists profiles_locality_length,
  add constraint profiles_locality_length check (locality is null or char_length(locality) <= 100);

create or replace function public.set_profiles_updated_at()
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

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_profiles_updated_at();

revoke all on function public.set_profiles_updated_at() from public;

revoke all on function public.set_profiles_updated_at() from anon;

revoke all on function public.set_profiles_updated_at() from authenticated;
