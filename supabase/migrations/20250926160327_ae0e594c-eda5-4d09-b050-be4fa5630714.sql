-- Обновляем RLS политики для администраторов, чтобы они видели всех клиентов без ограничений

-- Создаем новую политику для администраторов, которая дает доступ ко всем клиентам
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;

CREATE POLICY "Admins can manage all clients" 
ON public.clients 
FOR ALL 
TO authenticated
USING (
  -- Администраторы видят всех клиентов
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
  OR
  -- Обычные пользователи видят только клиентов своего филиала
  EXISTS ( 
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid() 
    AND (
      clients.branch = p.branch 
      OR EXISTS ( 
        SELECT 1
        FROM manager_branches mb
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = clients.branch
      )
    )
  )
)
WITH CHECK (
  -- Администраторы могут создавать/изменять любых клиентов
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
  OR
  -- Обычные пользователи могут создавать/изменять клиентов только своего филиала
  EXISTS ( 
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid() 
    AND (
      clients.branch = p.branch 
      OR EXISTS ( 
        SELECT 1
        FROM manager_branches mb
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = clients.branch
      )
    )
  )
);

-- Обновляем политику для чат сообщений - администраторы должны видеть все сообщения
DROP POLICY IF EXISTS "Allow all operations on chat_messages" ON public.chat_messages;

CREATE POLICY "Allow all operations on chat_messages" 
ON public.chat_messages 
FOR ALL 
TO authenticated
USING (
  -- Администраторы видят все сообщения
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
  OR
  -- Обычные пользователи видят сообщения в соответствии с доступом к клиентам
  EXISTS ( 
    SELECT 1
    FROM clients c, profiles p
    WHERE c.id = chat_messages.client_id 
    AND p.id = auth.uid() 
    AND (
      c.branch = p.branch 
      OR EXISTS ( 
        SELECT 1
        FROM manager_branches mb
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = c.branch
      )
    )
  )
  OR
  -- Системные чаты доступны всем
  EXISTS ( 
    SELECT 1
    FROM clients c
    WHERE c.id = chat_messages.client_id 
    AND (
      c.name ILIKE 'Чат педагогов - %' 
      OR c.name ILIKE 'Корпоративный чат - %' 
      OR c.name ILIKE 'Преподаватель:%'
    )
  )
)
WITH CHECK (
  -- Администраторы могут создавать/изменять любые сообщения
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
  OR
  -- Обычные пользователи могут создавать/изменять сообщения согласно доступу к клиентам
  EXISTS ( 
    SELECT 1
    FROM clients c, profiles p
    WHERE c.id = chat_messages.client_id 
    AND p.id = auth.uid() 
    AND (
      c.branch = p.branch 
      OR EXISTS ( 
        SELECT 1
        FROM manager_branches mb
        WHERE mb.manager_id = auth.uid() 
        AND mb.branch = c.branch
      )
    )
  )
  OR
  -- Системные чаты доступны всем для записи
  EXISTS ( 
    SELECT 1
    FROM clients c
    WHERE c.id = chat_messages.client_id 
    AND (
      c.name ILIKE 'Чат педагогов - %' 
      OR c.name ILIKE 'Корпоративный чат - %' 
      OR c.name ILIKE 'Преподаватель:%'
    )
  )
);