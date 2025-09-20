-- Включить реальное время для таблицы chat_states
ALTER TABLE public.chat_states REPLICA IDENTITY FULL;

-- Добавить таблицу в публикацию supabase_realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_states;