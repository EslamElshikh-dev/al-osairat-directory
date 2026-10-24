-- Restored from Supabase schema history: 20260828160752 / notify_members_on_listing_report_status.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create or replace function public.notify_listing_report_status()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_type text;
  v_title text;
  v_message text;
  v_note text := nullif(btrim(coalesce(new.review_note, '')), '');
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'reviewing' then
    v_type := 'listing_report_reviewing';
    v_title := 'بلاغك قيد المراجعة';
    v_message := 'بدأ فريق دليل العسيرات مراجعة البلاغ الذي أرسلته عن بيانات أحد الأنشطة.';
  elsif new.status = 'resolved' then
    if coalesce(new.correction, '{}'::jsonb) <> '{}'::jsonb and new.applied_at is not null then
      v_type := 'listing_report_corrected';
      v_title := 'تم تصحيح بيانات النشاط';
      v_message := 'تمت مراجعة بلاغك واعتماد التصحيح وتحديث بيانات النشاط في دليل العسيرات.';
    else
      v_type := 'listing_report_resolved';
      v_title := 'تمت مراجعة بلاغك';
      v_message := 'اكتملت مراجعة البلاغ، ولم تستلزم المراجعة تعديل بيانات النشاط.';
    end if;

    if v_note is not null then
      v_message := v_message || ' ملاحظة المراجعة: ' || left(v_note, 700);
    end if;
  elsif new.status = 'rejected' then
    v_type := 'listing_report_rejected';
    v_title := 'تمت مراجعة بلاغك';
    if v_note is not null then
      v_message := 'لم يتم اعتماد البلاغ. سبب القرار: ' || left(v_note, 800);
    else
      v_message := 'لم يتم اعتماد البلاغ بعد المراجعة.';
    end if;
  end if;

  if v_type is not null then
    insert into public.member_notifications(
      user_id, type, title, message, href, entity_type, entity_id
    ) values (
      new.user_id,
      v_type,
      v_title,
      v_message,
      '/account#notifications',
      'listing_report',
      new.id
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists notify_listing_report_status on public.listing_reports;

create trigger notify_listing_report_status
after update of status on public.listing_reports
for each row
execute function public.notify_listing_report_status();
