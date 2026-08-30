-- Remove relation-level powers that RLS does not govern, while preserving
-- the public read path and the admin sync path protected by existing RLS.
revoke all privileges
  on table public.directory_entities, public.directory_entity_sources
  from anon, authenticated;

grant select
  on table public.directory_entities, public.directory_entity_sources
  to anon;

grant select, insert, update, delete
  on table public.directory_entities, public.directory_entity_sources
  to authenticated;

-- Pin SECURITY DEFINER name resolution to trusted schemas.
alter function public.get_admin_analytics_stats()
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.get_directory_intelligence_stats()
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.get_my_listing_performance()
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.notify_business_submission_change()
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.notify_listing_change_status()
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.notify_listing_report_status()
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.notify_ownership_claim_change()
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.publish_business_submission(uuid, text, text)
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.review_business_submission(uuid, text, text)
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.review_listing_change(uuid, text, text)
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.review_listing_report(uuid, text, text, jsonb)
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.review_ownership_claim(uuid, text, text)
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.revise_listing_change(uuid, jsonb, jsonb)
  set search_path = pg_catalog, public, auth, pg_temp;
alter function public.submit_listing_change(text, jsonb, jsonb)
  set search_path = pg_catalog, public, auth, pg_temp;

-- App-callable privileged functions are explicit authenticated-only RPCs.
revoke execute on function
  public.get_admin_analytics_stats(),
  public.get_directory_intelligence_stats(),
  public.get_my_listing_performance(),
  public.is_directory_admin(),
  public.publish_business_submission(uuid, text, text),
  public.review_business_submission(uuid, text, text),
  public.review_listing_change(uuid, text, text),
  public.review_listing_report(uuid, text, text, jsonb),
  public.review_ownership_claim(uuid, text, text),
  public.revise_listing_change(uuid, jsonb, jsonb),
  public.submit_listing_change(text, jsonb, jsonb)
from public, anon;

grant execute on function
  public.get_admin_analytics_stats(),
  public.get_directory_intelligence_stats(),
  public.get_my_listing_performance(),
  public.is_directory_admin(),
  public.publish_business_submission(uuid, text, text),
  public.review_business_submission(uuid, text, text),
  public.review_listing_change(uuid, text, text),
  public.review_listing_report(uuid, text, text, jsonb),
  public.review_ownership_claim(uuid, text, text),
  public.revise_listing_change(uuid, jsonb, jsonb),
  public.submit_listing_change(text, jsonb, jsonb)
to authenticated;

-- Trigger functions must not be callable as Data API RPCs.
revoke execute on function
  public.notify_business_submission_change(),
  public.notify_listing_change_status(),
  public.notify_listing_report_status(),
  public.notify_ownership_claim_change()
from public, anon, authenticated;

-- Fail the migration atomically if any intended boundary is not true.
do $audit$
declare
  fn oid;
begin
  if not has_table_privilege('anon', 'public.directory_entities', 'select')
     or not has_table_privilege('anon', 'public.directory_entity_sources', 'select') then
    raise exception 'anon SELECT was not preserved';
  end if;

  if has_table_privilege('anon', 'public.directory_entities', 'insert')
     or has_table_privilege('anon', 'public.directory_entities', 'update')
     or has_table_privilege('anon', 'public.directory_entities', 'delete')
     or has_table_privilege('anon', 'public.directory_entities', 'truncate')
     or has_table_privilege('anon', 'public.directory_entities', 'references')
     or has_table_privilege('anon', 'public.directory_entities', 'trigger')
     or has_table_privilege('anon', 'public.directory_entity_sources', 'insert')
     or has_table_privilege('anon', 'public.directory_entity_sources', 'update')
     or has_table_privilege('anon', 'public.directory_entity_sources', 'delete')
     or has_table_privilege('anon', 'public.directory_entity_sources', 'truncate')
     or has_table_privilege('anon', 'public.directory_entity_sources', 'references')
     or has_table_privilege('anon', 'public.directory_entity_sources', 'trigger') then
    raise exception 'anon retains a non-SELECT directory privilege';
  end if;

  if not has_table_privilege('authenticated', 'public.directory_entities', 'select')
     or not has_table_privilege('authenticated', 'public.directory_entities', 'insert')
     or not has_table_privilege('authenticated', 'public.directory_entities', 'update')
     or not has_table_privilege('authenticated', 'public.directory_entities', 'delete')
     or not has_table_privilege('authenticated', 'public.directory_entity_sources', 'select')
     or not has_table_privilege('authenticated', 'public.directory_entity_sources', 'insert')
     or not has_table_privilege('authenticated', 'public.directory_entity_sources', 'update')
     or not has_table_privilege('authenticated', 'public.directory_entity_sources', 'delete') then
    raise exception 'authenticated admin-sync DML was not preserved';
  end if;

  if has_table_privilege('authenticated', 'public.directory_entities', 'truncate')
     or has_table_privilege('authenticated', 'public.directory_entities', 'references')
     or has_table_privilege('authenticated', 'public.directory_entities', 'trigger')
     or has_table_privilege('authenticated', 'public.directory_entity_sources', 'truncate')
     or has_table_privilege('authenticated', 'public.directory_entity_sources', 'references')
     or has_table_privilege('authenticated', 'public.directory_entity_sources', 'trigger') then
    raise exception 'authenticated retains an unnecessary directory privilege';
  end if;

  foreach fn in array array[
    'public.get_admin_analytics_stats()'::regprocedure::oid,
    'public.get_directory_intelligence_stats()'::regprocedure::oid,
    'public.get_my_listing_performance()'::regprocedure::oid,
    'public.is_directory_admin()'::regprocedure::oid,
    'public.publish_business_submission(uuid,text,text)'::regprocedure::oid,
    'public.review_business_submission(uuid,text,text)'::regprocedure::oid,
    'public.review_listing_change(uuid,text,text)'::regprocedure::oid,
    'public.review_listing_report(uuid,text,text,jsonb)'::regprocedure::oid,
    'public.review_ownership_claim(uuid,text,text)'::regprocedure::oid,
    'public.revise_listing_change(uuid,jsonb,jsonb)'::regprocedure::oid,
    'public.submit_listing_change(text,jsonb,jsonb)'::regprocedure::oid
  ]
  loop
    if has_function_privilege('anon', fn, 'execute')
       or not has_function_privilege('authenticated', fn, 'execute') then
      raise exception 'unexpected app function ACL for oid %', fn;
    end if;
  end loop;

  foreach fn in array array[
    'public.notify_business_submission_change()'::regprocedure::oid,
    'public.notify_listing_change_status()'::regprocedure::oid,
    'public.notify_listing_report_status()'::regprocedure::oid,
    'public.notify_ownership_claim_change()'::regprocedure::oid
  ]
  loop
    if has_function_privilege('anon', fn, 'execute')
       or has_function_privilege('authenticated', fn, 'execute') then
      raise exception 'trigger function remains directly executable for oid %', fn;
    end if;
  end loop;

  if exists (
    select 1
    from pg_proc p
    where p.oid = any(array[
      'public.get_admin_analytics_stats()'::regprocedure::oid,
      'public.get_directory_intelligence_stats()'::regprocedure::oid,
      'public.get_my_listing_performance()'::regprocedure::oid,
      'public.notify_business_submission_change()'::regprocedure::oid,
      'public.notify_listing_change_status()'::regprocedure::oid,
      'public.notify_listing_report_status()'::regprocedure::oid,
      'public.notify_ownership_claim_change()'::regprocedure::oid,
      'public.publish_business_submission(uuid,text,text)'::regprocedure::oid,
      'public.review_business_submission(uuid,text,text)'::regprocedure::oid,
      'public.review_listing_change(uuid,text,text)'::regprocedure::oid,
      'public.review_listing_report(uuid,text,text,jsonb)'::regprocedure::oid,
      'public.review_ownership_claim(uuid,text,text)'::regprocedure::oid,
      'public.revise_listing_change(uuid,jsonb,jsonb)'::regprocedure::oid,
      'public.submit_listing_change(text,jsonb,jsonb)'::regprocedure::oid
    ])
      and not ('search_path=pg_catalog, public, auth, pg_temp' = any(coalesce(p.proconfig, array[]::text[])))
  ) then
    raise exception 'one or more SECURITY DEFINER functions has an unexpected search_path';
  end if;
end
$audit$;
