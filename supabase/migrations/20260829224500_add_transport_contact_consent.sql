alter table public.business_submissions
  add column if not exists contact_publish_consent boolean not null default false;

comment on column public.business_submissions.contact_publish_consent is
  'Explicit member consent to publish submitted phone/WhatsApp contact details. Required for transport submissions that include either contact channel.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_submissions_transport_contact_consent_check'
      and conrelid = 'public.business_submissions'::regclass
  ) then
    alter table public.business_submissions
      add constraint business_submissions_transport_contact_consent_check
      check (
        category <> 'transport'
        or (phone is null and whatsapp is null)
        or contact_publish_consent
      );
  end if;
end
$$;
