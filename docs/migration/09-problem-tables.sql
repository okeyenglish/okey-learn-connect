-- =============================================
-- AcademyOS CRM - Problem Tables Migration Script
-- 4 таблицы с ошибками при миграции:
-- 1. assistant_threads
-- 2. message_read_status
-- 3. global_chat_read_status
-- 4. pinned_modals
-- =============================================

-- ВАЖНО: Выполнять ПОСЛЕ импорта auth.users!

-- =============================================
-- ПОДГОТОВКА: Создать базовую функцию
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 1. ASSISTANT_THREADS
-- =============================================

-- Шаг 1: Удалить существующую таблицу (если есть с ошибками)
DROP TABLE IF EXISTS public.assistant_threads CASCADE;

-- Шаг 2: Создать таблицу БЕЗ FK
CREATE TABLE public.assistant_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,  -- FK добавим позже!
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Шаг 3: Индекс
CREATE INDEX IF NOT EXISTS idx_assistant_threads_owner ON public.assistant_threads(owner_id);

-- Шаг 4: RLS
ALTER TABLE public.assistant_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own assistant threads"
  ON public.assistant_threads FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Шаг 5: Триггер
DROP TRIGGER IF EXISTS update_assistant_threads_updated_at ON public.assistant_threads;
CREATE TRIGGER update_assistant_threads_updated_at
  BEFORE UPDATE ON public.assistant_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ИМПОРТИРОВАТЬ ДАННЫЕ СЮДА --
-- \COPY public.assistant_threads FROM '/path/to/assistant_threads.csv' WITH CSV HEADER;

-- Шаг 6: Очистить orphaned записи (если есть)
DELETE FROM public.assistant_threads 
WHERE owner_id NOT IN (SELECT id FROM auth.users);

-- Шаг 7: Добавить FK
ALTER TABLE public.assistant_threads 
ADD CONSTRAINT assistant_threads_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================
-- 2. MESSAGE_READ_STATUS
-- =============================================

-- Шаг 1: Удалить существующую таблицу
DROP TABLE IF EXISTS public.message_read_status CASCADE;

-- Шаг 2: Создать таблицу БЕЗ FK
CREATE TABLE public.message_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,  -- FK добавим позже!
  user_id UUID NOT NULL,     -- FK добавим позже!
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Шаг 3: Индексы
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON public.message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON public.message_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_read_at ON public.message_read_status(read_at);

-- Шаг 4: RLS
ALTER TABLE public.message_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view message read status" 
ON public.message_read_status FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own read status" 
ON public.message_read_status FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read status" 
ON public.message_read_status FOR UPDATE 
USING (auth.uid() = user_id);

-- ИМПОРТИРОВАТЬ ДАННЫЕ СЮДА --
-- \COPY public.message_read_status FROM '/path/to/message_read_status.csv' WITH CSV HEADER;

-- Шаг 5: Очистить orphaned записи
DELETE FROM public.message_read_status 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.message_read_status 
WHERE message_id NOT IN (SELECT id FROM public.chat_messages);

-- Шаг 6: Добавить FK
ALTER TABLE public.message_read_status 
ADD CONSTRAINT fk_message_read_status_message_id 
FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;

ALTER TABLE public.message_read_status 
ADD CONSTRAINT fk_message_read_status_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================
-- 3. GLOBAL_CHAT_READ_STATUS
-- =============================================

-- Шаг 1: Удалить существующую таблицу
DROP TABLE IF EXISTS public.global_chat_read_status CASCADE;

-- Шаг 2: Создать таблицу БЕЗ FK
CREATE TABLE public.global_chat_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL UNIQUE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_by UUID,  -- FK добавим позже! (nullable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Шаг 3: Индекс
CREATE INDEX IF NOT EXISTS idx_global_chat_read_status_chat_id ON public.global_chat_read_status(chat_id);

-- Шаг 4: RLS
ALTER TABLE public.global_chat_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view global read status" 
ON public.global_chat_read_status FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage global read status" 
ON public.global_chat_read_status FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Шаг 5: Триггер
DROP TRIGGER IF EXISTS update_global_chat_read_status_updated_at ON public.global_chat_read_status;
CREATE TRIGGER update_global_chat_read_status_updated_at
  BEFORE UPDATE ON public.global_chat_read_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Шаг 6: Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_read_status;

-- ИМПОРТИРОВАТЬ ДАННЫЕ СЮДА --
-- \COPY public.global_chat_read_status FROM '/path/to/global_chat_read_status.csv' WITH CSV HEADER;

-- Шаг 7: Обнулить orphaned last_read_by (nullable поле)
UPDATE public.global_chat_read_status 
SET last_read_by = NULL 
WHERE last_read_by IS NOT NULL 
  AND last_read_by NOT IN (SELECT id FROM auth.users);

-- Шаг 8: Добавить FK
ALTER TABLE public.global_chat_read_status 
ADD CONSTRAINT global_chat_read_status_last_read_by_fkey 
FOREIGN KEY (last_read_by) REFERENCES auth.users(id);

-- =============================================
-- 4. PINNED_MODALS
-- =============================================

-- Шаг 1: Удалить существующую таблицу
DROP TABLE IF EXISTS public.pinned_modals CASCADE;

-- Шаг 2: Создать таблицу БЕЗ FK
CREATE TABLE public.pinned_modals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- FK добавим позже!
  modal_id TEXT NOT NULL,
  modal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  props JSONB DEFAULT '{}'::jsonb,
  is_open BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, modal_id, modal_type)
);

-- Шаг 3: RLS
ALTER TABLE public.pinned_modals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pinned modals"
  ON public.pinned_modals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pinned modals"
  ON public.pinned_modals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pinned modals"
  ON public.pinned_modals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pinned modals"
  ON public.pinned_modals FOR DELETE USING (auth.uid() = user_id);

-- Шаг 4: Триггер
DROP TRIGGER IF EXISTS update_pinned_modals_updated_at ON public.pinned_modals;
CREATE TRIGGER update_pinned_modals_updated_at
  BEFORE UPDATE ON public.pinned_modals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Шаг 5: Realtime
ALTER TABLE public.pinned_modals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_modals;

-- ИМПОРТИРОВАТЬ ДАННЫЕ СЮДА --
-- \COPY public.pinned_modals FROM '/path/to/pinned_modals.csv' WITH CSV HEADER;

-- Шаг 6: Очистить orphaned записи
DELETE FROM public.pinned_modals 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Шаг 7: Добавить FK
ALTER TABLE public.pinned_modals 
ADD CONSTRAINT pinned_modals_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================
-- RPC ФУНКЦИИ для message_read_status
-- =============================================

-- mark_message_as_read
CREATE OR REPLACE FUNCTION public.mark_message_as_read(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.message_read_status (message_id, user_id)
  VALUES (p_message_id, auth.uid())
  ON CONFLICT (message_id, user_id) 
  DO UPDATE SET read_at = now();
END;
$$;

-- mark_chat_messages_as_read
CREATE OR REPLACE FUNCTION public.mark_chat_messages_as_read(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.message_read_status (message_id, user_id)
  SELECT cm.id, auth.uid()
  FROM public.chat_messages cm
  WHERE cm.client_id = p_client_id
    AND cm.id NOT IN (
      SELECT mrs.message_id FROM public.message_read_status mrs 
      WHERE mrs.user_id = auth.uid()
    )
  ON CONFLICT (message_id, user_id) 
  DO UPDATE SET read_at = now();
END;
$$;

-- get_message_read_status
CREATE OR REPLACE FUNCTION public.get_message_read_status(p_message_id uuid)
RETURNS TABLE(user_id uuid, user_name text, read_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    mrs.user_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown User') as user_name,
    mrs.read_at
  FROM public.message_read_status mrs
  LEFT JOIN public.profiles p ON p.id = mrs.user_id
  WHERE mrs.message_id = p_message_id
  ORDER BY mrs.read_at ASC;
$$;

-- =============================================
-- ПРОВЕРКА
-- =============================================

-- Проверить что таблицы созданы
SELECT table_name, 
       (SELECT count(*) FROM information_schema.table_constraints 
        WHERE table_name = t.table_name AND constraint_type = 'FOREIGN KEY') as fk_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('assistant_threads', 'message_read_status', 'global_chat_read_status', 'pinned_modals');

-- Проверить RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('assistant_threads', 'message_read_status', 'global_chat_read_status', 'pinned_modals');

-- Проверить триггеры
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_schema = 'public'
  AND event_object_table IN ('assistant_threads', 'global_chat_read_status', 'pinned_modals');

SELECT 'Migration of 4 problem tables completed successfully!' as status;
