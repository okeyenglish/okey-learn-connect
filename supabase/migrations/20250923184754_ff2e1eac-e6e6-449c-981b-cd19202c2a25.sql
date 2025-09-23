-- Создаем таблицу для хранения эмодзи реакций на сообщения
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID NULL, -- Для менеджеров в корпоративном чате
  client_id UUID NULL, -- Для клиентов WhatsApp
  emoji TEXT NOT NULL,
  whatsapp_reaction_id TEXT NULL, -- ID реакции от WhatsApp API
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ограничение: либо user_id, либо client_id должен быть указан
  CONSTRAINT message_reactions_user_check CHECK (
    (user_id IS NOT NULL AND client_id IS NULL) OR 
    (user_id IS NULL AND client_id IS NOT NULL)
  ),
  
  -- Уникальность: один пользователь/клиент может поставить только одну реакцию на сообщение
  CONSTRAINT message_reactions_unique_user UNIQUE (message_id, user_id),
  CONSTRAINT message_reactions_unique_client UNIQUE (message_id, client_id)
);

-- Включаем RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Политики RLS для message_reactions
CREATE POLICY "Users can view reactions for their branch messages" 
ON public.message_reactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_messages cm, clients c, profiles p
    WHERE cm.id = message_reactions.message_id 
    AND c.id = cm.client_id 
    AND p.id = auth.uid()
    AND (c.branch = p.branch OR EXISTS (
      SELECT 1 FROM manager_branches mb 
      WHERE mb.manager_id = auth.uid() AND mb.branch = c.branch
    ))
  )
);

CREATE POLICY "Users can add reactions to their branch messages" 
ON public.message_reactions 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM chat_messages cm, clients c, profiles p
    WHERE cm.id = message_reactions.message_id 
    AND c.id = cm.client_id 
    AND p.id = auth.uid()
    AND (c.branch = p.branch OR EXISTS (
      SELECT 1 FROM manager_branches mb 
      WHERE mb.manager_id = auth.uid() AND mb.branch = c.branch
    ))
  )
);

CREATE POLICY "Users can update their own reactions" 
ON public.message_reactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" 
ON public.message_reactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Политика для service role (для обработки WhatsApp реакций)
CREATE POLICY "Service role can manage all reactions" 
ON public.message_reactions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Создаем триггер для автоматического обновления updated_at
CREATE TRIGGER update_message_reactions_updated_at
  BEFORE UPDATE ON public.message_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Добавляем индексы для производительности
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_message_reactions_client_id ON public.message_reactions(client_id) WHERE client_id IS NOT NULL;