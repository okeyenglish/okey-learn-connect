-- Enable RLS if not already enabled  
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to work with system chats
CREATE POLICY "Allow system chat operations"
ON public.clients
FOR ALL
TO authenticated
USING (
  (name ILIKE 'Чат педагогов - %' OR name ILIKE 'Корпоративный чат - %' OR name ILIKE 'Преподаватель:%')
  AND phone = '-'
)
WITH CHECK (
  (name ILIKE 'Чат педагогов - %' OR name ILIKE 'Корпоративный чат - %' OR name ILIKE 'Преподаватель:%')
  AND phone = '-'
);

-- Policies on chat_messages for system chats  
CREATE POLICY "System chat messages operations"
ON public.chat_messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = chat_messages.client_id
      AND (c.name ILIKE 'Чат педагогов - %' OR c.name ILIKE 'Корпоративный чат - %' OR c.name ILIKE 'Преподаватель:%')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id
      AND (c.name ILIKE 'Чат педагогов - %' OR c.name ILIKE 'Корпоративный чат - %' OR c.name ILIKE 'Преподаватель:%')
  )
);