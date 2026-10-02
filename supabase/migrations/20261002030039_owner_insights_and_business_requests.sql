-- Repair the RLS gap that rejected every page_view despite its valid table constraint.
alter policy directory_analytics_insert_only on public.directory_analytics_events
with check (
  event_type = any(array['page_view','directory_search','view_listing','phone_click','whatsapp_click','maps_click','favorite_add','favorite_remove'])
  and session_id ~ '^[A-Za-z0-9_-]{8,80}$'
  and visitor_id ~ '^[A-Za-z0-9_-]{8,80}$'
  and created_at between now() - interval '5 minutes' and now() + interval '1 minute'
  and source_path ~ '^/([^/]|$)' and source_path !~ '^/(admin|api)(/|$)'
  and (search_term is null or search_term !~* '([A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}|[0-9]{7,})')
  and (
    (event_type = 'directory_search' and listing_id is null and result_count is not null)
    or (event_type in ('page_view','phone_click','whatsapp_click','maps_click') and search_term is null and result_count is null)
    or (event_type in ('view_listing','favorite_add','favorite_remove') and listing_id is not null and search_term is null and result_count is null)
  )
);
alter table public.directory_analytics_events add column if not exists event_id uuid;
create unique index if not exists directory_analytics_event_id_key on public.directory_analytics_events(event_id);
create index if not exists directory_page_visits_idx on public.directory_analytics_events(created_at,visitor_id) where event_type='page_view';

-- Internal configuration has no Data API grants. Capture the existing sole owner,
-- without putting an identity or email in source code or exposing it to clients.
create schema if not exists directory_internal;
revoke all on schema directory_internal from public, anon, authenticated;
create table directory_internal.settings (
  singleton boolean primary key default true check(singleton),
  owner_id uuid not null references auth.users(id),
  measurement_started_at timestamptz not null default now()
);
alter table directory_internal.settings enable row level security;
do $$ begin
  if (select count(*) from public.admin_members) <> 1 then
    raise exception 'Exactly one existing owner must be configured before this migration';
  end if;
  insert into directory_internal.settings(owner_id) select user_id from public.admin_members;
end $$;

create or replace function public.is_directory_owner() returns boolean
language sql stable security definer set search_path=''
as $$ select auth.uid() is not null and exists(select 1 from directory_internal.settings where owner_id=auth.uid()) $$;
revoke all on function public.is_directory_owner() from public, anon;
grant execute on function public.is_directory_owner() to authenticated;

create or replace function public.get_osairat_discovery_insights() returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_from date := v_today - 29;
  v_start timestamptz := v_from::timestamp at time zone 'Africa/Cairo';
  v_tracking timestamptz;
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_directory_admin() then
    raise exception 'Unauthorized' using errcode='42501';
  end if;
  select measurement_started_at into v_tracking from directory_internal.settings;
  with page_events as (
    select (created_at at time zone 'Africa/Cairo')::date as day, visitor_id, session_id, source_path
    from public.directory_analytics_events
    where event_type='page_view' and created_at>=greatest(v_start,v_tracking)
      and visitor_id is not null and source_path ~ '^/([^/]|$)'
      and source_path !~ '^/(admin|api)(/|$)'
  ), visitor_days as (
    select day, visitor_id, count(distinct source_path) as pages from page_events group by day,visitor_id
  ), navigation as (
    select day,count(*) filter(where pages>=2) as navigators from visitor_days group by day
  ), daily as (
    select day,count(distinct visitor_id) as visitors,count(*) as views,count(distinct session_id) as sessions
    from page_events group by day
  ), first_visit as (
    select visitor_id,min((created_at at time zone 'Africa/Cairo')::date) as day
    from public.directory_analytics_events
    where event_type='page_view' and visitor_id is not null and created_at>=v_tracking
      and source_path ~ '^/([^/]|$)' and source_path !~ '^/(admin|api)(/|$)'
    group by visitor_id
  ), new_daily as (
    select day,count(*) as visitors from first_visit where day>=v_from group by day
  ), series as (
    select jsonb_agg(jsonb_build_object(
      'date',to_char(c.day,'YYYY-MM-DD'),
      'measured',c.day::date >= (v_tracking at time zone 'Africa/Cairo')::date,
      'partial',c.day::date=(v_tracking at time zone 'Africa/Cairo')::date or c.day::date=v_today,
      'newVisitors',coalesce(n.visitors,0),'visitors',coalesce(d.visitors,0),
      'views',coalesce(d.views,0),'sessions',coalesce(d.sessions,0),'navigators',coalesce(g.navigators,0)
    ) order by c.day) as result
    from generate_series(v_from::timestamp,v_today::timestamp,interval '1 day') c(day)
    left join daily d on d.day=c.day::date
    left join new_daily n on n.day=c.day::date
    left join navigation g on g.day=c.day::date
  ), pages as (
    select coalesce(jsonb_agg(jsonb_build_object('path',p.source_path,'views',p.views,'visitors',p.visitors) order by p.views desc),'[]'::jsonb) as result
    from (select source_path,count(*) as views,count(distinct visitor_id) as visitors from page_events group by source_path order by views desc limit 12) p
  ), searches as (
    select search_term,village,category,result_count,created_at from public.directory_analytics_events
    where event_type='directory_search' and created_at>=v_start and length(btrim(search_term))>=2
  ), misses as (
    select coalesce(jsonb_agg(jsonb_build_object('query',q.search_term,'village',q.village,'category',q.category,'count',q.occurrences,'lastSeenAt',q.last_seen) order by q.occurrences desc,q.last_seen desc),'[]'::jsonb) as result
    from (select search_term,coalesce(village,'all') as village,coalesce(category,'all') as category,count(*) as occurrences,max(created_at) as last_seen
      from searches where result_count=0 and search_term !~ '[0-9]{7,}' and search_term !~ '@'
      group by search_term,village,category order by occurrences desc,last_seen desc limit 12) q
  )
  select jsonb_build_object('generatedAt',now(),'timezone','Africa/Cairo','measurementStartedAt',v_tracking,
    'lastPageViewAt',(select max(created_at) from public.directory_analytics_events where event_type='page_view' and created_at>=v_tracking),
    'dailySeries',series.result,'topPages',pages.result,'missedSearches',misses.result,
    'searchSummary',(select jsonb_build_object('total',count(*),'missed',count(*) filter(where result_count=0)) from searches),
    'periodSummary',(select jsonb_build_object('visitors',count(distinct visitor_id),'views',count(*),'sessions',count(distinct session_id)) from page_events)
  ) into v_result from series cross join pages cross join misses;
  return v_result;
end $$;
revoke all on function public.get_osairat_discovery_insights() from public,anon;
grant execute on function public.get_osairat_discovery_insights() to authenticated;

alter table public.business_submissions add column website_url text, add column image_paths text[] not null default '{}';
alter table public.business_submissions add constraint submission_images_max check(cardinality(image_paths)<=3);
alter table public.business_submissions add constraint submission_website_https check(website_url is null or (length(website_url)<=500 and website_url ~ '^https://'));
alter table public.published_businesses add column website_url text, add column image_paths text[] not null default '{}';

-- Images stay private until this specific submission is approved and published.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-images','business-images',false,2097152,array['image/jpeg','image/png','image/webp']);
create policy "Members upload their business photos" on storage.objects for insert to authenticated
with check(bucket_id='business-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Members and owner review business photos" on storage.objects for select to authenticated
using(bucket_id='business-images' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_directory_owner())));
create policy "Published business photos are readable" on storage.objects for select to anon,authenticated
using(bucket_id='business-images' and exists(select 1 from public.published_businesses p where p.is_active and name=any(p.image_paths)));

create or replace function directory_internal.validate_submission_images() returns trigger
language plpgsql security invoker set search_path=''
as $$ begin
  if exists(select 1 from unnest(new.image_paths) p where p is null or p !~ ('^'||new.user_id::text||'/[0-9a-f-]{36}[.](jpg|png|webp)$')) then
    raise exception 'Invalid image reference';
  end if;
  return new;
end $$;
create trigger validate_submission_images before insert or update of image_paths,user_id on public.business_submissions
for each row execute function directory_internal.validate_submission_images();

-- Keep notifications addressed only to the original owner, even if moderators are added later.
alter table public.member_notifications drop constraint member_notifications_type_check;
alter table public.member_notifications add constraint member_notifications_type_check check(type=any(array[
 'submission_needs_changes','submission_approved','submission_rejected','submission_published',
 'claim_needs_changes','claim_approved','claim_rejected','listing_change_needs_changes','listing_change_approved','listing_change_rejected',
 'listing_report_reviewing','listing_report_corrected','listing_report_resolved','listing_report_rejected',
 'community_review_reply','community_helpful_received','community_thread_update','owner_submission','owner_listing_change','owner_listing_report']));
create or replace function directory_internal.notify_owner_request() returns trigger
language plpgsql security definer set search_path=''
as $$ declare v_owner uuid; v_kind text; v_type text; v_title text; v_name text; v_href text;
begin
  if tg_op='UPDATE' and not (old.status='needs_changes' and new.status='pending') then return new; end if;
  if auth.uid() is null or auth.uid()<>new.user_id then raise exception 'Authenticated request owner required'; end if;
  select owner_id into v_owner from directory_internal.settings;
  if tg_table_name='business_submissions' then
    v_kind:='business_submission'; v_type:='owner_submission'; v_title:='طلب إضافة نشاط'; v_name:=new.business_name; v_href:='/admin?request='||new.id::text||'&tab=submissions#admin-requests';
  elsif tg_table_name='listing_change_requests' then
    v_kind:='listing_change'; v_type:='owner_listing_change'; v_title:='طلب تعديل نشاط'; v_name:=coalesce(new.snapshot->>'title','نشاط في الدليل'); v_href:='/admin?request='||new.id::text||'&tab=changes#admin-requests';
  else
    v_kind:='listing_report'; v_type:='owner_listing_report'; v_title:='بلاغ عن بيانات نشاط'; v_name:='طلب تصحيح يحتاج مراجعتك'; v_href:='/admin#listing-reports';
  end if;
  insert into public.member_notifications(user_id,type,title,message,href,entity_type,entity_id)
  values(v_owner,v_type,v_title,left(v_name,700),v_href,v_kind,new.id);
  return new;
end $$;
revoke all on function directory_internal.notify_owner_request() from public,anon,authenticated;
create trigger notify_owner_submission after insert or update of status on public.business_submissions for each row execute function directory_internal.notify_owner_request();
create trigger notify_owner_listing_change after insert or update of status on public.listing_change_requests for each row execute function directory_internal.notify_owner_request();
create trigger notify_owner_listing_report after insert on public.listing_reports for each row execute function directory_internal.notify_owner_request();

-- Complete the owner journey after publication: manage the submitted business directly.
alter table public.listing_ownerships alter column claim_id drop not null;
alter table public.listing_ownerships add column submission_id uuid references public.business_submissions(id);
alter table public.listing_ownerships add constraint ownership_has_source check(claim_id is not null or submission_id is not null);
create or replace function directory_internal.prepare_published_business() returns trigger
language plpgsql security definer set search_path=''
as $$ declare s public.business_submissions%rowtype;
begin
  if auth.uid() is null or not public.is_directory_admin() then raise exception 'Unauthorized'; end if;
  select * into strict s from public.business_submissions where id=new.submission_id;
  new.website_url:=s.website_url; new.image_paths:=s.image_paths;
  new.location:=coalesce(nullif(s.location_details,''),s.village);
  return new;
end $$;
create trigger prepare_published_business before insert on public.published_businesses for each row execute function directory_internal.prepare_published_business();
create or replace function directory_internal.link_published_business_owner() returns trigger
language plpgsql security definer set search_path=''
as $$ begin
  if auth.uid() is null or not public.is_directory_admin() then raise exception 'Unauthorized'; end if;
  insert into public.listing_ownerships(listing_id,user_id,relationship,submission_id)
  values(new.listing_id,new.submitted_by,'owner',new.submission_id) on conflict do nothing;
  return new;
end $$;
create trigger link_published_business_owner after insert on public.published_businesses for each row execute function directory_internal.link_published_business_owner();
revoke all on function directory_internal.prepare_published_business(),directory_internal.link_published_business_owner() from public,anon,authenticated;

-- Members can revise a needs_changes submission, but cannot alter moderation fields.
create or replace function public.revise_business_submission(p_id uuid,p_data jsonb) returns uuid
language plpgsql security definer set search_path=''
as $$ begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  update public.business_submissions set
    business_name=p_data->>'business_name', category=p_data->>'category', village=p_data->>'village',
    location_details=coalesce(p_data->>'location_details',''), phone=nullif(p_data->>'phone',''), whatsapp=nullif(p_data->>'whatsapp',''),
    description=p_data->>'description', google_maps_url=nullif(p_data->>'google_maps_url',''), website_url=nullif(p_data->>'website_url',''),
    image_paths=array(select jsonb_array_elements_text(coalesce(p_data->'image_paths','[]'::jsonb))),
    contact_publish_consent=coalesce((p_data->>'contact_publish_consent')::boolean,false),
    status='pending', updated_at=now()
  where id=p_id and user_id=auth.uid() and status='needs_changes' and published_at is null;
  if not found then raise exception 'Request is not editable'; end if;
  return p_id;
end $$;
revoke all on function public.revise_business_submission(uuid,jsonb) from public,anon;
grant execute on function public.revise_business_submission(uuid,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.assert_valid_listing_changes(p_changes jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_key text;
  v_value text;
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then
    raise exception 'NO_CHANGES';
  end if;

  for v_key in select jsonb_object_keys(p_changes)
  loop
    if v_key not in ('title','subCategory','location','village','locality','phone','whatsapp','hours','description','googleMapsUrl') then
      raise exception 'INVALID_CHANGE_FIELD';
    end if;
    v_value := coalesce(p_changes->>v_key, '');

    if v_key = 'title' and (char_length(btrim(v_value)) < 2 or char_length(v_value) > 120) then
      raise exception 'INVALID_TITLE';
    elsif v_key = 'subCategory' and char_length(v_value) > 120 then
      raise exception 'INVALID_SUBCATEGORY';
    elsif v_key = 'location' and char_length(v_value) > 240 then
      raise exception 'INVALID_LOCATION';
    elsif v_key = 'village' and btrim(v_value) not in (
      'مركز العسيرات','أولاد حمزة','جزيرة أولاد حمزة','الرشايدة','الأحايوة غرب','النويرات',
      'عوامر العسيرات','الشهداء','أولاد جبارة','المساعيد','أولاد بهيج'
    ) then
      raise exception 'INVALID_VILLAGE';
    elsif v_key = 'locality' and char_length(v_value) > 100 then
      raise exception 'INVALID_LOCALITY';
    elsif v_key = 'phone' and btrim(v_value) <> '' and btrim(v_value) !~ '^(01[0125][0-9]{8}|0[2-9][0-9]{7,8})$' then
      raise exception 'INVALID_PHONE';
    elsif v_key = 'whatsapp' and btrim(v_value) <> '' and btrim(v_value) !~ '^01[0125][0-9]{8}$' then
      raise exception 'INVALID_WHATSAPP';
    elsif v_key = 'hours' and char_length(v_value) > 180 then
      raise exception 'INVALID_HOURS';
    elsif v_key = 'description' and char_length(v_value) > 800 then
      raise exception 'INVALID_DESCRIPTION';
    elsif v_key = 'googleMapsUrl' and btrim(v_value) <> '' and not (
      btrim(v_value) ~ '^https://maps[.]app[.]goo[.]gl/' or
      btrim(v_value) ~ '^https://goo[.]gl/maps' or
      btrim(v_value) ~ '^https://maps[.]google[.]' or
      btrim(v_value) ~ '^https://([a-z0-9-]+[.])?google[.]com/maps'
    ) then
      raise exception 'INVALID_MAPS_URL';
    end if;
  end loop;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_admin_analytics_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
declare
  v_result jsonb;
  v_today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if not public.is_directory_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select jsonb_build_object(
    'members', jsonb_build_object(
      'total', (select count(*) from auth.users),
      'verified', (select count(*) from auth.users where email_confirmed_at is not null or phone_confirmed_at is not null),
      'last7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
      'previous7d', (select count(*) from auth.users where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days'),
      'last30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
      'profiles', (select count(*) from public.profiles)
    ),
    'engagement', jsonb_build_object(
      'favorites', (select count(*) from public.favorites),
      'notifications', (select count(*) from public.member_notifications),
      'unreadNotifications', (select count(*) from public.member_notifications where read_at is null)
    ),
    'submissions', jsonb_build_object(
      'total', (select count(*) from public.business_submissions),
      'pending', (select count(*) from public.business_submissions where status = 'pending'),
      'needsChanges', (select count(*) from public.business_submissions where status = 'needs_changes'),
      'approved', (select count(*) from public.business_submissions where status = 'approved'),
      'rejected', (select count(*) from public.business_submissions where status = 'rejected')
    ),
    'claims', jsonb_build_object(
      'total', (select count(*) from public.business_ownership_claims),
      'pending', (select count(*) from public.business_ownership_claims where status = 'pending'),
      'needsChanges', (select count(*) from public.business_ownership_claims where status = 'needs_changes'),
      'approved', (select count(*) from public.business_ownership_claims where status = 'approved'),
      'rejected', (select count(*) from public.business_ownership_claims where status = 'rejected')
    ),
    'reports', jsonb_build_object(
      'total', (select count(*) from public.listing_reports),
      'pending', (select count(*) from public.listing_reports where status = 'pending'),
      'reviewing', (select count(*) from public.listing_reports where status = 'reviewing'),
      'resolved', (select count(*) from public.listing_reports where status = 'resolved'),
      'rejected', (select count(*) from public.listing_reports where status = 'rejected')
    ),
    'changes', jsonb_build_object(
      'total', (select count(*) from public.listing_change_requests),
      'pending', (select count(*) from public.listing_change_requests where status = 'pending'),
      'needsChanges', (select count(*) from public.listing_change_requests where status = 'needs_changes'),
      'approved', (select count(*) from public.listing_change_requests where status = 'approved'),
      'rejected', (select count(*) from public.listing_change_requests where status = 'rejected')
    ),
    'directory', jsonb_build_object(
      'publishedBusinesses', (select count(*) from public.published_businesses where is_active is true),
      'approvedOwnerships', (select count(*) from public.listing_ownerships)
    ),
    'registrationSeries', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d.day::date, 'count', coalesce(u.count, 0)) order by d.day), '[]'::jsonb)
      from generate_series(v_today - 13, v_today, interval '1 day') as d(day)
      left join (
        select (created_at at time zone 'Africa/Cairo')::date as day, count(*) as count
        from auth.users
        where created_at >= ((v_today - 13)::timestamp at time zone 'Africa/Cairo')
        group by (created_at at time zone 'Africa/Cairo')::date
      ) u on u.day = d.day::date
    ),
    'activitySeries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', d.day::date,
        'submissions', coalesce(s.count, 0),
        'claims', coalesce(c.count, 0),
        'reports', coalesce(r.count, 0)
      ) order by d.day), '[]'::jsonb)
      from generate_series(v_today - 13, v_today, interval '1 day') as d(day)
      left join (
        select (created_at at time zone 'Africa/Cairo')::date as day, count(*) as count from public.business_submissions
        where created_at >= ((v_today - 13)::timestamp at time zone 'Africa/Cairo') group by (created_at at time zone 'Africa/Cairo')::date
      ) s on s.day = d.day::date
      left join (
        select (created_at at time zone 'Africa/Cairo')::date as day, count(*) as count from public.business_ownership_claims
        where created_at >= ((v_today - 13)::timestamp at time zone 'Africa/Cairo') group by (created_at at time zone 'Africa/Cairo')::date
      ) c on c.day = d.day::date
      left join (
        select (created_at at time zone 'Africa/Cairo')::date as day, count(*) as count from public.listing_reports
        where created_at >= ((v_today - 13)::timestamp at time zone 'Africa/Cairo') group by (created_at at time zone 'Africa/Cairo')::date
      ) r on r.day = d.day::date
    ),
    'generatedAt', now()
  ) into v_result;

  return v_result;
end;
$function$
;
