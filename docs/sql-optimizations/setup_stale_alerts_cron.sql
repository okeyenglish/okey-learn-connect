-- =============================================
-- Stale Conversation Alerts — Cron Job Setup
-- Run this on the self-hosted instance (api.academyos.ru)
-- =============================================

-- Schedule stale conversation alerts every hour
SELECT cron.schedule(
  'stale-conversation-alerts-hourly',
  '0 * * * *', -- every hour at :00
  $$
  SELECT net.http_post(
    url := 'https://api.academyos.ru/functions/v1/stale-conversation-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

-- =============================================
-- Alert Configuration (per organization)
-- =============================================
-- 
-- Alert settings are stored in organizations.settings JSON:
--
-- UPDATE organizations
-- SET settings = jsonb_set(
--   COALESCE(settings, '{}'::jsonb),
--   '{staleConversationAlerts}',
--   '{
--     "enabled": true,
--     "stages": ["objection", "follow_up"],
--     "thresholdHours": 24,
--     "cooldownHours": 12
--   }'::jsonb
-- )
-- WHERE id = 'YOUR_ORG_ID';
--
-- Configuration options:
--   enabled: boolean — включить/выключить алерты
--   stages: string[] — стадии для мониторинга (по умолчанию: objection, follow_up)
--   thresholdHours: number — через сколько часов отправлять алерт (по умолчанию: 24)
--   cooldownHours: number — пауза между повторными алертами (по умолчанию: 12)
