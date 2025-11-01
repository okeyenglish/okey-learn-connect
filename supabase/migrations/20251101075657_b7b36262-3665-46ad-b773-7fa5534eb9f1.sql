-- Создаем таблицу связи преподавателей с филиалами
CREATE TABLE IF NOT EXISTS public.teacher_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.organization_branches(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, branch_id)
);

-- Включаем RLS
ALTER TABLE public.teacher_branches ENABLE ROW LEVEL SECURITY;

-- Политики доступа: преподаватели видят свои филиалы
CREATE POLICY "Преподаватели видят свои филиалы"
ON public.teacher_branches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.id = teacher_branches.teacher_id
    AND t.profile_id = auth.uid()
  )
);

-- Все авторизованные пользователи могут просматривать
CREATE POLICY "Авторизованные пользователи видят связи"
ON public.teacher_branches
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Создаем индексы для производительности
CREATE INDEX idx_teacher_branches_teacher_id ON public.teacher_branches(teacher_id);
CREATE INDEX idx_teacher_branches_branch_id ON public.teacher_branches(branch_id);

-- Создаем представление для удобного получения данных преподавателя с филиалами
CREATE OR REPLACE VIEW public.teachers_with_branches AS
SELECT 
  t.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', ob.id,
        'name', ob.name,
        'address', ob.address,
        'phone', ob.phone
      ) ORDER BY ob.name
    ) FILTER (WHERE ob.id IS NOT NULL),
    '[]'::json
  ) as branches
FROM public.teachers t
LEFT JOIN public.teacher_branches tb ON t.id = tb.teacher_id
LEFT JOIN public.organization_branches ob ON tb.branch_id = ob.id
GROUP BY t.id;

-- Миграция существующих данных: связываем преподавателей с их текущим филиалом
INSERT INTO public.teacher_branches (teacher_id, branch_id)
SELECT DISTINCT 
  t.id as teacher_id,
  ob.id as branch_id
FROM public.teachers t
JOIN public.organization_branches ob ON ob.name = t.branch
WHERE t.branch IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.teacher_branches tb2
  WHERE tb2.teacher_id = t.id AND tb2.branch_id = ob.id
);