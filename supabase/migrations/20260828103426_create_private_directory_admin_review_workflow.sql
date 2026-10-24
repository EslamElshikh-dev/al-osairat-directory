-- Restored from Supabase schema history: 20260828103426 / create_private_directory_admin_review_workflow.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create table if not exists public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_members enable row level security;

revoke all on table public.admin_members from anon, authenticated;

create or replace function public.is_directory_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_members a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_directory_admin() from public, anon;

grant execute on function public.is_directory_admin() to authenticated;

-- Admins can review all member profiles and request records through RLS.
drop policy if exists "Directory admins can view member profiles" on public.profiles;

create policy "Directory admins can view member profiles"
on public.profiles for select to authenticated
using (public.is_directory_admin());

drop policy if exists "Directory admins can view business submissions" on public.business_submissions;

create policy "Directory admins can view business submissions"
on public.business_submissions for select to authenticated
using (public.is_directory_admin());

drop policy if exists "Directory admins can update business submissions" on public.business_submissions;

create policy "Directory admins can update business submissions"
on public.business_submissions for update to authenticated
using (public.is_directory_admin())
with check (public.is_directory_admin());

grant update (status, review_note, reviewed_at, updated_at) on public.business_submissions to authenticated;

drop policy if exists "Directory admins can view ownership claims" on public.business_ownership_claims;

create policy "Directory admins can view ownership claims"
on public.business_ownership_claims for select to authenticated
using (public.is_directory_admin());

drop policy if exists "Directory admins can update ownership claims" on public.business_ownership_claims;

create policy "Directory admins can update ownership claims"
on public.business_ownership_claims for update to authenticated
using (public.is_directory_admin())
with check (public.is_directory_admin());

grant update (status, review_note, reviewed_at, updated_at) on public.business_ownership_claims to authenticated;

create table if not exists public.listing_ownerships (
  listing_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship text not null check (relationship in ('owner','manager','authorized_representative')),
  claim_id uuid not null unique references public.business_ownership_claims(id) on delete cascade,
  approved_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);

create index if not exists listing_ownerships_user_idx on public.listing_ownerships(user_id);

alter table public.listing_ownerships enable row level security;

revoke all on table public.listing_ownerships from anon, authenticated;

grant select on table public.listing_ownerships to authenticated;

drop policy if exists "Members can view own listing ownerships" on public.listing_ownerships;

create policy "Members can view own listing ownerships"
on public.listing_ownerships for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Directory admins can view listing ownerships" on public.listing_ownerships;

create policy "Directory admins can view listing ownerships"
on public.listing_ownerships for select to authenticated
using (public.is_directory_admin());

create or replace function public.review_business_submission(
  p_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.business_submissions%rowtype;
begin
  if not public.is_directory_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_status not in ('pending','needs_changes','approved','rejected') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.business_submissions
     set status = p_status,
         review_note = nullif(btrim(coalesce(p_note,'')), ''),
         reviewed_at = case when p_status = 'pending' then null else now() end,
         updated_at = now()
   where id = p_id
   returning * into v_row;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'review_note', v_row.review_note,
    'reviewed_at', v_row.reviewed_at,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.review_business_submission(uuid,text,text) from public, anon;

grant execute on function public.review_business_submission(uuid,text,text) to authenticated;

create or replace function public.review_ownership_claim(
  p_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.business_ownership_claims%rowtype;
begin
  if not public.is_directory_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_status not in ('pending','needs_changes','approved','rejected') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.business_ownership_claims
     set status = p_status,
         review_note = nullif(btrim(coalesce(p_note,'')), ''),
         reviewed_at = case when p_status = 'pending' then null else now() end,
         updated_at = now()
   where id = p_id
   returning * into v_claim;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if p_status = 'approved' then
    insert into public.listing_ownerships (listing_id, user_id, relationship, claim_id, approved_at)
    values (v_claim.listing_id, v_claim.user_id, v_claim.relationship, v_claim.id, now())
    on conflict (listing_id, user_id)
    do update set relationship = excluded.relationship, claim_id = excluded.claim_id, approved_at = now();
  else
    delete from public.listing_ownerships where claim_id = v_claim.id;
  end if;

  return jsonb_build_object(
    'id', v_claim.id,
    'status', v_claim.status,
    'review_note', v_claim.review_note,
    'reviewed_at', v_claim.reviewed_at,
    'updated_at', v_claim.updated_at
  );
end;
$$;

revoke all on function public.review_ownership_claim(uuid,text,text) from public, anon;

grant execute on function public.review_ownership_claim(uuid,text,text) to authenticated;
