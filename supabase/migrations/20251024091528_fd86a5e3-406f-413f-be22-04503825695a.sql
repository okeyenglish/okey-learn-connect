-- Обновляем cron задачу для автоматического импорта - теперь каждую минуту
SELECT cron.unschedule('salebot-import-background');

SELECT cron.schedule(
  'salebot-import-background',
  '* * * * *', -- каждую минуту
  $$
  SELECT
    net.http_post(
        url:='https://kbojujfwtvmsgudumown.supabase.co/functions/v1/import-salebot-chats-auto',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtib2p1amZ3dHZtc2d1ZHVtb3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5MzksImV4cCI6MjA3Mzc3MDkzOX0.4SZggdlllMM8SYUo9yZKR-fR-nK4fIL4ZMciQW2EaNY"}'::jsonb
    ) as request_id;
  $$
);