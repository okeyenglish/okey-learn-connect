-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: allow inserting system chat clients (corporate and teachers group)
CREATE POLICY IF NOT EXISTS "Allow insert for system chats"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated'
  AND (
    name ILIKE 'Чат педагогов - %' OR
    name ILIKE 'Корпоративный чат - %'
  )
  AND branch IS NOT NULL
  AND phone = '-'
);

-- Select policy to view system chat clients (avoid overexposing)
CREATE POLICY IF NOT EXISTS "Allow select system chats"
ON public.clients
FOR SELECT
TO authenticated
USING (
  (name ILIKE 'Чат педагогов - %' OR name ILIKE 'Корпоративный чат - %') OR phone = '-'
);

-- Policies on chat_messages for system chats
CREATE POLICY IF NOT EXISTS "Read system chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = chat_messages.client_id
      AND (c.name ILIKE 'Чат педагогов - %' OR c.name ILIKE 'Корпоративный чат - %')
  )
);

CREATE POLICY IF NOT EXISTS "Send to system chats"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id
      AND (c.name ILIKE 'Чат педагогов - %' OR c.name ILIKE 'Корпоративный чат - %')
  )
);

CREATE POLICY IF NOT EXISTS "Update read flags system chats"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = chat_messages.client_id
      AND (c.name ILIKE 'Чат педагогов - %' OR c.name ILIKE 'Корпоративный чат - %')
  )
);

-- Function to get pin counts across users for given chats
CREATE OR REPLACE FUNCTION public.get_chat_pin_counts(chat_ids uuid[])
RETURNS TABLE (chat_id uuid, pin_count integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cs.chat_id, COUNT(*)::int AS pin_count
  FROM public.chat_states cs
  WHERE cs.chat_id = ANY (chat_ids) AND cs.is_pinned = true
  GROUP BY cs.chat_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_pin_counts(uuid[]) TO authenticated;