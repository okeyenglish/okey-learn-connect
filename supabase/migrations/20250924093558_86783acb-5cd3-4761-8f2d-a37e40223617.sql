-- Создаем таблицу для сообщений преподавателей на модерации
CREATE TABLE public.teacher_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  teacher_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'group', -- 'group' или 'individual'
  target_group_id UUID NULL, -- для групповых сообщений
  target_student_id UUID NULL, -- для индивидуальных сообщений
  target_student_name TEXT NULL, -- имя студента для отображения
  branch TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'sent'
  moderated_by UUID NULL,
  moderated_at TIMESTAMP WITH TIME ZONE NULL,
  moderation_notes TEXT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.teacher_messages ENABLE ROW LEVEL SECURITY;

-- Политики для преподавателей - могут создавать и просматривать свои сообщения
CREATE POLICY "Teachers can create their own messages" 
ON public.teacher_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = teacher_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.department = 'teacher'
  )
);

CREATE POLICY "Teachers can view their own messages" 
ON public.teacher_messages 
FOR SELECT 
USING (
  auth.uid() = teacher_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.department = 'teacher'
  )
);

-- Политики для менеджеров - могут просматривать, обновлять и удалять сообщения в своих филиалах
CREATE POLICY "Managers can view messages from their branches" 
ON public.teacher_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (
      teacher_messages.branch = p.branch OR 
      EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid() AND mb.branch = teacher_messages.branch
      )
    )
  )
);

CREATE POLICY "Managers can update messages from their branches" 
ON public.teacher_messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (
      teacher_messages.branch = p.branch OR 
      EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid() AND mb.branch = teacher_messages.branch
      )
    )
  )
);

CREATE POLICY "Managers can delete messages from their branches" 
ON public.teacher_messages 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (
      teacher_messages.branch = p.branch OR 
      EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid() AND mb.branch = teacher_messages.branch
      )
    )
  )
);

-- Триггер для обновления updated_at
CREATE TRIGGER update_teacher_messages_updated_at
BEFORE UPDATE ON public.teacher_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Включаем реалтайм для уведомлений менеджеров
ALTER TABLE public.teacher_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_messages;