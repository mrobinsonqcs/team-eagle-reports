-- Phase 3: pg_cron jobs for the newsletter pipeline (blueprint section 9).
--
-- Three crons drive the weekly newsletter:
--   1. generate-newsletter-draft-weekly: creates the draft early Monday so
--      it's ready for the division leader to edit.
--   2. refresh-newsletter-data-weekly: re-pulls report data with force=true
--      mid-morning Monday, in case offices submitted late reports overnight.
--   3. distribute-newsletter-weekly: sends the finished newsletter to all
--      recipients later Monday morning.
--
-- All three call their edge function via pg_net.http_post with the
-- x-cron-secret header (see 20260610000005_cron_invoke_secret.sql).
-- weekly-office-reminders and process-email-queue are deferred to Phase 4.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'generate-newsletter-draft-weekly',
  '0 4 * * 1',
  $$
  select net.http_post(
    url := 'https://qllmzkhryjsyvcuhltty.supabase.co/functions/v1/generate-newsletter-draft',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_invoke_secret()
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'refresh-newsletter-data-weekly',
  '30 14 * * 1',
  $$
  select net.http_post(
    url := 'https://qllmzkhryjsyvcuhltty.supabase.co/functions/v1/generate-newsletter-draft',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_invoke_secret()
    ),
    body := '{"force": true}'::jsonb
  );
  $$
);

select cron.schedule(
  'distribute-newsletter-weekly',
  '0 15 * * 1',
  $$
  select net.http_post(
    url := 'https://qllmzkhryjsyvcuhltty.supabase.co/functions/v1/distribute-newsletter',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_invoke_secret()
    ),
    body := '{}'::jsonb
  );
  $$
);
