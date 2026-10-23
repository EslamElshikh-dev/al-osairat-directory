-- Restored from Supabase schema history: 20260828113911 / add_member_notifications.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create table if not exists public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'submission_needs_changes','submission_approved','submission_rejected','submission_published',
    'claim_needs_changes','claim_approved','claim_rejected',
    'listing_change_needs_changes','listing_change_approved','listing_change_rejected'
  )),
  title text not null check (char_length(title) between 2 and 160),
  message text not null check (char_length(message) between 2 and 800),
  href text not null default '/account' check (char_length(href) between 1 and 500),
  entity_type text not null check (entity_type in ('business_submission','ownership_claim','listing_change')),
  entity_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists member_notifications_user_created_idx
  on public.member_notifications(user_id, created_at desc);

create index if not exists member_notifications_user_unread_idx
  on public.member_notifications(user_id, created_at desc)
  where read_at is null;

alter table public.member_notifications enable row level security;

revoke all on table public.member_notifications from public, anon, authenticated;

grant select, update on table public.member_notifications to authenticated;

create policy "members read own notifications"
  on public.member_notifications for select to authenticated
  using (auth.uid() = user_id);

create policy "members mark own notifications read"
  on public.member_notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.notify_business_submission_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_title text;
  v_message text;
  v_href text := '/account#business-submissions';
  v_type text;
begin
  if new.published_at is distinct from old.published_at and new.published_at is not null then
    select slug into v_slug from public.published_businesses where listing_id = new.published_listing_id limit 1;
    v_type := 'submission_published';
    v_title := 'تم نشر نشاطك في الدليل';
    v_message := 'تم اعتماد ونشر «' || new.business_name || '» في دليل العسيرات.';
    if v_slug is not null then v_href := '/listing/' || v_slug; end if;
  elsif new.status is distinct from old.status then
    if new.status = 'needs_changes' then
      v_type := 'submission_needs_changes';
      v_title := 'طلب إضافة النشاط يحتاج استكمال';
      v_message := 'راجع ملاحظة الإدارة واستكمل بيانات «' || new.business_name || '».';
    elsif new.status = 'approved' then
      v_type := 'submission_approved';
      v_title := 'تم قبول طلب إضافة النشاط';
      v_message := 'تم اعتماد طلب «' || new.business_name || '».';
    elsif new.status = 'rejected' then
      v_type := 'submission_rejected';
      v_title := 'تمت مراجعة طلب إضافة النشاط';
      v_message := 'لم يتم اعتماد طلب «' || new.business_name || '». راجع ملاحظة الإدارة.';
    end if;
  end if;

  if v_type is not null then
    insert into public.member_notifications(user_id,type,title,message,href,entity_type,entity_id)
    values(new.user_id,v_type,v_title,v_message,v_href,'business_submission',new.id);
  end if;
  return new;
end;
$$;

create or replace function public.notify_ownership_claim_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_title text;
  v_message text;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'needs_changes' then
    v_type := 'claim_needs_changes';
    v_title := 'مطالبة الملكية تحتاج استكمال';
    v_message := 'راجع ملاحظة الإدارة واستكمل بيانات مطالبة ملكية النشاط.';
  elsif new.status = 'approved' then
    v_type := 'claim_approved';
    v_title := 'تم اعتماد ملكية النشاط';
    v_message := 'تم ربط النشاط بحسابك ويمكنك الآن إدارته من قسم «أنشطتي».';
  elsif new.status = 'rejected' then
    v_type := 'claim_rejected';
    v_title := 'تمت مراجعة مطالبة الملكية';
    v_message := 'لم يتم اعتماد مطالبة الملكية الحالية. راجع ملاحظة الإدارة.';
  end if;
  if v_type is not null then
    insert into public.member_notifications(user_id,type,title,message,href,entity_type,entity_id)
    values(new.user_id,v_type,v_title,v_message,'/account#ownership-claims','ownership_claim',new.id);
  end if;
  return new;
end;
$$;

create or replace function public.notify_listing_change_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_title text;
  v_message text;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'needs_changes' then
    v_type := 'listing_change_needs_changes';
    v_title := 'تعديل النشاط يحتاج استكمال';
    v_message := 'راجع ملاحظة الإدارة ثم حدّث طلب تعديل بيانات نشاطك.';
  elsif new.status = 'approved' then
    v_type := 'listing_change_approved';
    v_title := 'تم اعتماد تعديل بيانات النشاط';
    v_message := 'تم تطبيق التعديلات المعتمدة على النشاط في الدليل.';
  elsif new.status = 'rejected' then
    v_type := 'listing_change_rejected';
    v_title := 'تمت مراجعة تعديل بيانات النشاط';
    v_message := 'لم يتم تطبيق التعديل المطلوب. راجع ملاحظة الإدارة.';
  end if;
  if v_type is not null then
    insert into public.member_notifications(user_id,type,title,message,href,entity_type,entity_id)
    values(new.user_id,v_type,v_title,v_message,'/account#my-businesses','listing_change',new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists notify_business_submission_change on public.business_submissions;

create trigger notify_business_submission_change
after update on public.business_submissions
for each row execute function public.notify_business_submission_change();

drop trigger if exists notify_ownership_claim_change on public.business_ownership_claims;

create trigger notify_ownership_claim_change
after update on public.business_ownership_claims
for each row execute function public.notify_ownership_claim_change();

drop trigger if exists notify_listing_change_status on public.listing_change_requests;

create trigger notify_listing_change_status
after update on public.listing_change_requests
for each row execute function public.notify_listing_change_status();

revoke all on function public.notify_business_submission_change() from public, anon, authenticated;

revoke all on function public.notify_ownership_claim_change() from public, anon, authenticated;

revoke all on function public.notify_listing_change_status() from public, anon, authenticated;
