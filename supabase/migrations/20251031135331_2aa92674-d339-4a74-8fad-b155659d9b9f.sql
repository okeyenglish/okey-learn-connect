-- Добавляем поле для уникальной ссылки регистрации преподавателей
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS teacher_registration_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS teacher_registration_enabled BOOLEAN DEFAULT true;

-- Генерируем уникальные токены для существующих организаций
UPDATE public.organizations 
SET teacher_registration_token = gen_random_uuid()::text
WHERE teacher_registration_token IS NULL;

-- Создаем индекс для быстрого поиска по токену
CREATE INDEX IF NOT EXISTS idx_organizations_teacher_token 
ON public.organizations(teacher_registration_token) 
WHERE teacher_registration_enabled = true;