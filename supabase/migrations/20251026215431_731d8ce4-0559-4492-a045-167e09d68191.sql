-- Add pause flag to prevent auto-resume
ALTER TABLE public.salebot_import_progress
  ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.salebot_import_progress.is_paused IS 'Флаг паузы автоимпорта Salebot. Если true — автоимпорт не запускается.';

-- Stop background cron job(s) that auto-invoke the import
DO $$
DECLARE r record;
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    FOR r IN SELECT jobid FROM cron.job WHERE jobname = 'salebot-import-background'
    LOOP
      PERFORM cron.unschedule(r.jobid);
    END LOOP;
  END IF;
END $$;

-- Optional helper index
CREATE INDEX IF NOT EXISTS idx_salebot_import_progress_is_paused ON public.salebot_import_progress (is_paused);
