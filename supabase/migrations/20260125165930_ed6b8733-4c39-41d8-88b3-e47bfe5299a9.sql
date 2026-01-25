-- Таблица для истории сообщений AI ассистента
CREATE TABLE public.assistant_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_assistant_messages_user_id ON public.assistant_messages(user_id);
CREATE INDEX idx_assistant_messages_org_id ON public.assistant_messages(organization_id);
CREATE INDEX idx_assistant_messages_created_at ON public.assistant_messages(created_at DESC);
CREATE INDEX idx_assistant_messages_unread ON public.assistant_messages(user_id, is_read) WHERE is_read = false;

-- Включаем RLS
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- Политики: пользователи видят только свои сообщения
CREATE POLICY "Users can view their own assistant messages"
ON public.assistant_messages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assistant messages"
ON public.assistant_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistant messages"
ON public.assistant_messages
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistant messages"
ON public.assistant_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Включаем realtime для мгновенных обновлений
ALTER PUBLICATION supabase_realtime ADD TABLE public.assistant_messages;