-- =====================================================
-- РЕКОМЕНДАЦИИ: Оптимизация RPC функций get_chat_threads_paginated / get_chat_threads_fast
-- Выполнить на self-hosted Supabase (api.academyos.ru)
-- =====================================================
--
-- ПРОБЛЕМА:
--   get_chat_threads_paginated: 410 вызовов за 10 мин, ~1.5 сек/вызов = 680 сек CPU
--   get_chat_threads_fast:      294 вызова,           ~1.5 сек/вызов = 440 сек CPU
--   Итого: 1100 секунд CPU за 10 минут (91% всей нагрузки)
--
-- ЦЕЛЬ: Снизить время выполнения с 1.5 сек до 50-100 мс
--
-- =====================================================
-- Стратегия 1: Использовать last_message_at из таблицы clients
-- =====================================================
-- Таблица `clients` уже имеет колонку `last_message_at` (обновляется триггером).
-- Используйте её для сортировки ВМЕСТО подзапроса к chat_messages:
--
-- БЫЛО (медленно):
--   ORDER BY (SELECT MAX(created_at) FROM chat_messages WHERE client_id = c.id)
--
-- СТАЛО (быстро):
--   ORDER BY c.last_message_at DESC NULLS LAST
--
-- Индекс уже есть: idx_clients_last_message_at
--

-- =====================================================
-- Стратегия 2: LATERAL JOIN для последнего сообщения
-- =====================================================
-- Вместо коррелированного подзапроса в SELECT:
--
-- БЫЛО:
--   (SELECT message_text FROM chat_messages WHERE client_id = c.id ORDER BY created_at DESC LIMIT 1)
--
-- СТАЛО (использует индекс idx_chat_messages_client_meta):
--   LEFT JOIN LATERAL (
--     SELECT message_text, created_at, messenger_type
--     FROM chat_messages
--     WHERE client_id = c.id
--     ORDER BY created_at DESC
--     LIMIT 1
--   ) lm ON true

-- =====================================================
-- Стратегия 3: LIMIT pushdown для пагинации
-- =====================================================
-- Сначала выбрать client_id с LIMIT/OFFSET из clients,
-- затем JOIN-ить остальные данные:
--
-- WITH page AS (
--   SELECT id FROM clients
--   WHERE is_active = true
--   ORDER BY last_message_at DESC NULLS LAST
--   LIMIT p_limit OFFSET p_offset
-- )
-- SELECT ... FROM page JOIN clients c ON c.id = page.id
-- LEFT JOIN LATERAL (...) lm ON true
-- LEFT JOIN LATERAL (...) unread ON true

-- =====================================================
-- Стратегия 4: Оптимизация подсчёта непрочитанных
-- =====================================================
-- Использовать частичный индекс idx_chat_messages_client_unread_partial:
--   WHERE is_read = false AND message_type = 'client'
--
-- LATERAL подзапрос ДОЛЖЕН использовать те же условия:
--   LEFT JOIN LATERAL (
--     SELECT COUNT(*) as total,
--       COUNT(*) FILTER (WHERE messenger_type = 'whatsapp') as whatsapp,
--       COUNT(*) FILTER (WHERE messenger_type = 'telegram') as telegram
--     FROM chat_messages
--     WHERE client_id = c.id AND is_read = false AND message_type = 'client'
--   ) unread ON true

-- =====================================================
-- Пример оптимизированной функции
-- =====================================================

DROP FUNCTION IF EXISTS public.get_chat_threads_paginated(int, int);

CREATE OR REPLACE FUNCTION public.get_chat_threads_paginated(p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE (
  clt_id uuid,
  client_name text,
  first_name text,
  last_name text,
  middle_name text,
  client_phone text,
  client_branch text,
  avatar_url text,
  telegram_chat_id text,
  whatsapp_chat_id text,
  max_chat_id text,
  last_message_text text,
  last_message_time timestamptz,
  last_messenger_type text,
  unread_count bigint,
  unread_whatsapp bigint,
  unread_telegram bigint,
  unread_max bigint,
  last_unread_messenger text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH page AS (
    -- Step 1: Get page of client IDs using covering index on last_message_at
    SELECT id
    FROM public.clients
    WHERE is_active = true
    ORDER BY last_message_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT
    c.id as clt_id,
    c.name as client_name,
    c.first_name,
    c.last_name,
    c.middle_name,
    c.phone as client_phone,
    c.branch as client_branch,
    c.avatar_url,
    c.telegram_user_id as telegram_chat_id,
    c.whatsapp_id as whatsapp_chat_id,
    NULL::text as max_chat_id,
    lm.message_text as last_message_text,
    lm.created_at as last_message_time,
    lm.messenger_type as last_messenger_type,
    COALESCE(unread.total, 0) as unread_count,
    COALESCE(unread.whatsapp, 0) as unread_whatsapp,
    COALESCE(unread.telegram, 0) as unread_telegram,
    COALESCE(unread.max_count, 0) as unread_max,
    unread.last_messenger as last_unread_messenger
  FROM page
  JOIN public.clients c ON c.id = page.id
  -- Last message via LATERAL (uses idx_chat_messages_client_meta)
  LEFT JOIN LATERAL (
    SELECT
      cm.message_text,
      cm.created_at,
      cm.messenger_type
    FROM public.chat_messages cm
    WHERE cm.client_id = c.id
    ORDER BY cm.created_at DESC
    LIMIT 1
  ) lm ON true
  -- Unread counts via LATERAL (uses idx_chat_messages_client_unread_partial)
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE messenger_type = 'whatsapp') as whatsapp,
      COUNT(*) FILTER (WHERE messenger_type = 'telegram') as telegram,
      COUNT(*) FILTER (WHERE messenger_type = 'max') as max_count,
      (SELECT messenger_type FROM public.chat_messages
       WHERE client_id = c.id AND is_read = false AND message_type = 'client'
       ORDER BY created_at DESC LIMIT 1) as last_messenger
    FROM public.chat_messages
    WHERE client_id = c.id AND is_read = false AND message_type = 'client'
  ) unread ON true
  ORDER BY c.last_message_at DESC NULLS LAST;
$$;

-- GRANT
GRANT EXECUTE ON FUNCTION public.get_chat_threads_paginated(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_threads_paginated(int, int) TO service_role;

-- =====================================================
-- Аналогично для get_chat_threads_fast (без пагинации, limit 200)
-- =====================================================
-- Примените те же стратегии: CTE с LIMIT из clients,
-- LATERAL для last_message и unread counts.
-- Структура идентична, только без p_offset.

-- =====================================================
-- Необходимые индексы (проверьте что существуют)
-- =====================================================
-- Покрывающий индекс для last message:
-- CREATE INDEX IF NOT EXISTS idx_chat_messages_client_meta
--   ON public.chat_messages (client_id, created_at DESC)
--   INCLUDE (message_text, messenger_type);
--
-- Частичный индекс для unread:
-- CREATE INDEX IF NOT EXISTS idx_chat_messages_client_unread_partial
--   ON public.chat_messages (client_id, created_at DESC)
--   WHERE is_read = false AND message_type = 'client';
--
-- Индекс для сортировки клиентов:
-- CREATE INDEX IF NOT EXISTS idx_clients_last_message_at
--   ON public.clients (last_message_at DESC NULLS LAST)
--   WHERE is_active = true;

-- =====================================================
-- ПОСЛЕ ВЫПОЛНЕНИЯ: Сбросьте статистику и замерьте через день
-- =====================================================
-- SELECT pg_stat_statements_reset();
-- Через 10 мин: повторите замер из CSV
