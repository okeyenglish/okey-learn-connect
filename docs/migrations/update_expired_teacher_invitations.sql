-- Migration: Автоматическое обновление просроченных приглашений преподавателей
-- Применить на self-hosted Supabase (api.academyos.ru)
-- Date: 2026-01-27

-- ============================================
-- 1. Функция обновления просроченных приглашений
-- ============================================

CREATE OR REPLACE FUNCTION public.update_expired_teacher_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.teacher_invitations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND token_expires_at < NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'Updated % expired teacher invitations', updated_count;
  END IF;
  
  RETURN updated_count;
END;
$$;

-- Права на выполнение
GRANT EXECUTE ON FUNCTION public.update_expired_teacher_invitations() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_expired_teacher_invitations() TO authenticated;

COMMENT ON FUNCTION public.update_expired_teacher_invitations() IS 
  'Обновляет статус просроченных приглашений преподавателей на expired';

-- ============================================
-- 2. Cron Job (выполнять раз в час)
-- ============================================

-- Сначала удаляем старый job если есть
SELECT cron.unschedule('update-expired-teacher-invitations')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-expired-teacher-invitations');

-- Создаём новый cron job (каждый час в :00 минут)
SELECT cron.schedule(
  'update-expired-teacher-invitations',
  '0 * * * *',  -- Каждый час
  $$SELECT public.update_expired_teacher_invitations()$$
);

-- ============================================
-- 3. Проверка
-- ============================================

-- Проверить что функция создана
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'update_expired_teacher_invitations';

-- Проверить cron job
SELECT * FROM cron.job WHERE jobname = 'update-expired-teacher-invitations';

-- Тестовый запуск
SELECT public.update_expired_teacher_invitations();
