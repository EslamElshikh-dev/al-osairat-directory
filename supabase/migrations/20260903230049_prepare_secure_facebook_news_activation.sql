create or replace function public.get_facebook_graph_token_internal()
returns text
language sql
security definer
set search_path = pg_catalog, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'facebook_graph_access_token_v1'
  limit 1
$$;

revoke all on function public.get_facebook_graph_token_internal() from public, anon, authenticated;
grant execute on function public.get_facebook_graph_token_internal() to service_role;

comment on function public.get_facebook_graph_token_internal() is 'Server-only accessor for the Meta Graph API token stored in Supabase Vault.';

do $$
declare
  existing_job_id bigint;
  created_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'facebook-local-news-ingestion'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  select cron.schedule(
    'facebook-local-news-ingestion',
    '*/2 * * * *',
    $cron$
      select net.http_post(
        url := 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/facebook-news-ingestion',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'x-news-cron-token',(
            select decrypted_secret
            from vault.decrypted_secrets
            where name='news_ingestion_cron_token_v1'
            limit 1
          )
        ),
        body := jsonb_build_object('trigger','cron'),
        timeout_milliseconds := 30000
      ) as request_id;
    $cron$
  ) into created_job_id;

  perform cron.alter_job(created_job_id, active => false);
end
$$;
