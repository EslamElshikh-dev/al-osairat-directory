-- Restored from Supabase schema history: 20260828112736 / allow_revising_listing_changes.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create or replace function public.revise_listing_change(
  p_id uuid,
  p_snapshot jsonb,
  p_changes jsonb
)
returns public.listing_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.listing_change_requests%rowtype;
  v_key text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_row
  from public.listing_change_requests
  where id = p_id and user_id = auth.uid()
  for update;

  if not found then raise exception 'NOT_FOUND'; end if;
  if v_row.status <> 'needs_changes' then raise exception 'REVISION_NOT_ALLOWED'; end if;
  if not exists (
    select 1 from public.listing_ownerships o
    where o.user_id = auth.uid() and o.listing_id = v_row.listing_id
  ) then raise exception 'OWNERSHIP_REQUIRED'; end if;

  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then raise exception 'INVALID_SNAPSHOT'; end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then raise exception 'NO_CHANGES'; end if;

  for v_key in select jsonb_object_keys(p_changes)
  loop
    if v_key not in ('title','subCategory','location','village','locality','phone','whatsapp','hours','description','googleMapsUrl') then
      raise exception 'INVALID_CHANGE_FIELD';
    end if;
  end loop;

  update public.listing_change_requests
  set snapshot = p_snapshot,
      changes = p_changes,
      status = 'pending',
      review_note = null,
      reviewed_at = null,
      reviewed_by = null,
      applied_at = null,
      updated_at = now()
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.revise_listing_change(uuid,jsonb,jsonb) from public, anon;

grant execute on function public.revise_listing_change(uuid,jsonb,jsonb) to authenticated;
