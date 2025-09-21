-- Создаем таблицу для глобального состояния прочитанности чатов
CREATE TABLE public.global_chat_read_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL UNIQUE,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Добавляем индекс для быстрого поиска по chat_id
CREATE INDEX idx_global_chat_read_status_chat_id ON public.global_chat_read_status(chat_id);

-- Включаем RLS
ALTER TABLE public.global_chat_read_status ENABLE ROW LEVEL SECURITY;

-- Политика: все аутентифицированные пользователи могут читать глобальные состояния
CREATE POLICY "Authenticated users can view global read status" 
ON public.global_chat_read_status 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Политика: все аутентифицированные пользователи могут обновлять глобальные состояния
CREATE POLICY "Authenticated users can update global read status" 
ON public.global_chat_read_status 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Добавляем триггер для обновления updated_at
CREATE TRIGGER update_global_chat_read_status_updated_at
  BEFORE UPDATE ON public.global_chat_read_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Включаем realtime для синхронизации
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_read_status;