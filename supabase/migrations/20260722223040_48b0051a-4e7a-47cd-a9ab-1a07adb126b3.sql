
-- Store the shared webhook secret in Vault so pg_cron can read it at run time
-- without hardcoding the value inline.
DO $$
DECLARE
  existing uuid;
BEGIN
  SELECT id INTO existing FROM vault.secrets WHERE name = 'spreadsheet_sync_secret';
  IF existing IS NULL THEN
    PERFORM vault.create_secret('pLSjtroAYaSV2Nm2LjtG7eszAn3QUgraDn64eoZIGOxIw8l2', 'spreadsheet_sync_secret', 'Shared secret for /api/public/hooks/spreadsheet-sync');
  ELSE
    PERFORM vault.update_secret(existing, 'pLSjtroAYaSV2Nm2LjtG7eszAn3QUgraDn64eoZIGOxIw8l2');
  END IF;
END $$;

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Refresh the hourly cron so it always sends the current secret.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'spreadsheet-sync-hourly') THEN
    PERFORM cron.unschedule('spreadsheet-sync-hourly');
  END IF;
END $$;

SELECT cron.schedule(
  'spreadsheet-sync-hourly',
  '0 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--64f92619-05c2-4bdb-a676-0f408495f4b8.lovable.app/api/public/hooks/spreadsheet-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'spreadsheet_sync_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);
