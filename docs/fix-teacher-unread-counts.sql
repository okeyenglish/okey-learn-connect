-- Исправление: Создание функции get_teacher_unread_counts для self-hosted Supabase
-- Выполнить на self-hosted Supabase (api.academyos.ru)
-- Эта функция возвращает количество непрочитанных сообщений для преподавателей

-- 1. Удалить существующую версию если есть
DROP FUNCTION IF EXISTS public.get_teacher_unread_counts();

-- 2. Создать функцию
CREATE OR REPLACE FUNCTION public.get_teacher_unread_counts()
RETURNS TABLE (
  teacher_id uuid,
  client_id uuid,
  unread_count bigint,
  last_message_time timestamptz,
  last_message_text text,
  last_messenger_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Получаем organization_id текущего пользователя
  SELECT get_user_organization_id() INTO v_org_id;
  
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH teacher_clients AS (
    -- Находим связи преподаватель -> клиент по телефону
    SELECT DISTINCT ON (t.id)
      t.id as teacher_id,
      c.id as client_id
    FROM teachers t
    LEFT JOIN clients c ON (
      -- Совпадение по телефону (последние 10 цифр)
      c.phone IS NOT NULL 
      AND t.phone IS NOT NULL
      AND RIGHT(REGEXP_REPLACE(c.phone, '[^0-9]', '', 'g'), 10) = RIGHT(REGEXP_REPLACE(t.phone, '[^0-9]', '', 'g'), 10)
      AND c.organization_id = v_org_id
    )
    WHERE t.organization_id = v_org_id
      AND t.is_active = true
  ),
  last_messages AS (
    -- Последнее сообщение для каждого клиента
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      cm.content as last_text,
      cm.created_at as last_time,
      COALESCE(cm.messenger, 'chat') as messenger_type
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
      AND cm.client_id IN (SELECT tc.client_id FROM teacher_clients tc WHERE tc.client_id IS NOT NULL)
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  unread_counts AS (
    -- Считаем непрочитанные входящие
    SELECT 
      cm.client_id,
      COUNT(*) as cnt
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
      AND cm.client_id IN (SELECT tc.client_id FROM teacher_clients tc WHERE tc.client_id IS NOT NULL)
      AND cm.direction = 'incoming'
      AND (cm.is_read = false OR cm.is_read IS NULL)
    GROUP BY cm.client_id
  )
  SELECT 
    tc.teacher_id,
    tc.client_id,
    COALESCE(uc.cnt, 0)::bigint as unread_count,
    lm.last_time as last_message_time,
    lm.last_text as last_message_text,
    lm.messenger_type as last_messenger_type
  FROM teacher_clients tc
  LEFT JOIN last_messages lm ON lm.client_id = tc.client_id
  LEFT JOIN unread_counts uc ON uc.client_id = tc.client_id;
END;
$$;

-- 3. Выдать права
GRANT EXECUTE ON FUNCTION public.get_teacher_unread_counts() TO authenticated;

-- 4. Проверить что функция работает
SELECT * FROM get_teacher_unread_counts() LIMIT 5;
