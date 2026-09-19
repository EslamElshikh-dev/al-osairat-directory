-- V2.9.1 Security Hardening
-- Keep privileged RPC exposure explicit and remove pg_temp from SECURITY DEFINER search paths.

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;

alter function public.get_admin_analytics_stats()
  set search_path = pg_catalog, public, auth;
alter function public.get_directory_intelligence_stats()
  set search_path = pg_catalog, public, auth;
alter function public.get_my_listing_performance()
  set search_path = pg_catalog, public, auth;
alter function public.is_directory_admin()
  set search_path = '';
alter function public.publish_business_submission(uuid, text, text)
  set search_path = pg_catalog, public, auth;
alter function public.review_business_submission(uuid, text, text)
  set search_path = pg_catalog, public, auth;
alter function public.review_listing_change(uuid, text, text)
  set search_path = pg_catalog, public, auth;
alter function public.review_listing_report(uuid, text, text, jsonb)
  set search_path = pg_catalog, public, auth;
alter function public.review_ownership_claim(uuid, text, text)
  set search_path = pg_catalog, public, auth;
alter function public.revise_listing_change(uuid, jsonb, jsonb)
  set search_path = pg_catalog, public, auth;
alter function public.submit_listing_change(text, jsonb, jsonb)
  set search_path = pg_catalog, public, auth;

-- Existing RPCs stay unavailable to PUBLIC/anon, and only the app-required
-- authenticated surface is granted explicitly.
revoke execute on function public.get_admin_analytics_stats() from public, anon;
revoke execute on function public.get_directory_intelligence_stats() from public, anon;
revoke execute on function public.get_my_listing_performance() from public, anon;
revoke execute on function public.is_directory_admin() from public, anon;
revoke execute on function public.publish_business_submission(uuid, text, text) from public, anon;
revoke execute on function public.review_business_submission(uuid, text, text) from public, anon;
revoke execute on function public.review_listing_change(uuid, text, text) from public, anon;
revoke execute on function public.review_listing_report(uuid, text, text, jsonb) from public, anon;
revoke execute on function public.review_ownership_claim(uuid, text, text) from public, anon;
revoke execute on function public.revise_listing_change(uuid, jsonb, jsonb) from public, anon;
revoke execute on function public.submit_listing_change(text, jsonb, jsonb) from public, anon;

grant execute on function public.get_admin_analytics_stats() to authenticated;
grant execute on function public.get_directory_intelligence_stats() to authenticated;
grant execute on function public.get_my_listing_performance() to authenticated;
grant execute on function public.is_directory_admin() to authenticated;
grant execute on function public.publish_business_submission(uuid, text, text) to authenticated;
grant execute on function public.review_business_submission(uuid, text, text) to authenticated;
grant execute on function public.review_listing_change(uuid, text, text) to authenticated;
grant execute on function public.review_listing_report(uuid, text, text, jsonb) to authenticated;
grant execute on function public.review_ownership_claim(uuid, text, text) to authenticated;
grant execute on function public.revise_listing_change(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.submit_listing_change(text, jsonb, jsonb) to authenticated;
