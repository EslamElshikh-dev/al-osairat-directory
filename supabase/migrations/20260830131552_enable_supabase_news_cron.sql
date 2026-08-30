-- Run local-news discovery inside Supabase so Vercel remains read-only.
-- The request token is provisioned separately in Vault and never stored in Git.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'automatic-local-news-ingestion',
  '*/30 * * * *',
  $job$
    select net.http_post(
      url := 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/news-ingestion',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-news-cron-token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'news_ingestion_cron_token_v1'
          limit 1
        )
      ),
      body := jsonb_build_object('trigger', 'cron'),
      timeout_milliseconds := 55000
    ) as request_id;
  $job$
);
