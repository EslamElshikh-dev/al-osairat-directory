-- Scan public, indexed local job sources every 30 minutes with the existing
-- Vault-backed ingestion token. The Edge Function verifies its digest.
select cron.schedule(
  'automatic-osairat-job-discovery',
  '*/30 * * * *',
  $job$
    select net.http_post(
      url := 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/osairat-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-news-cron-token', (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'news_ingestion_cron_token_v1' limit 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    ) as request_id;
  $job$
);
