-- ============================================
-- SQL Migration: teacher_invitations для self-hosted Supabase
-- Применить вручную на api.academyos.ru
-- ============================================

-- Создаём таблицу teacher_invitations
CREATE TABLE IF NOT EXISTS public.teacher_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  
  -- Данные преподавателя (предзаполненные)
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  branch TEXT,
  subjects TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  
  -- Токен приглашения
  invite_token TEXT NOT NULL UNIQUE DEFAULT (
    replace(gen_random_uuid()::text, '-', '') || 
    replace(gen_random_uuid()::text, '-', '')
  ),
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  -- Метаданные
  created_by UUID REFERENCES public.profiles(id),
  terms_accepted_at TIMESTAMPTZ,
  profile_id UUID REFERENCES public.profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_token ON public.teacher_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_teacher ON public.teacher_invitations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_org ON public.teacher_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_status ON public.teacher_invitations(status);

-- Триггер updated_at
DROP TRIGGER IF EXISTS update_teacher_invitations_updated_at ON public.teacher_invitations;
CREATE TRIGGER update_teacher_invitations_updated_at
  BEFORE UPDATE ON public.teacher_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.teacher_invitations ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "teacher_invitations_select_policy" ON public.teacher_invitations;
DROP POLICY IF EXISTS "teacher_invitations_insert_policy" ON public.teacher_invitations;
DROP POLICY IF EXISTS "teacher_invitations_update_policy" ON public.teacher_invitations;
DROP POLICY IF EXISTS "teacher_invitations_delete_policy" ON public.teacher_invitations;
DROP POLICY IF EXISTS "teacher_invitations_service_role" ON public.teacher_invitations;

-- Политики RLS
-- Чтение: сотрудники организации + по токену (для онбординга)
CREATE POLICY "teacher_invitations_select_policy" ON public.teacher_invitations 
  FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    OR invite_token IS NOT NULL
  );

-- Вставка: только сотрудники организации
CREATE POLICY "teacher_invitations_insert_policy" ON public.teacher_invitations 
  FOR INSERT WITH CHECK (
    organization_id = public.get_user_organization_id()
  );

-- Обновление: сотрудники организации + по токену (для онбординга)
CREATE POLICY "teacher_invitations_update_policy" ON public.teacher_invitations 
  FOR UPDATE USING (
    organization_id = public.get_user_organization_id()
    OR invite_token IS NOT NULL
  );

-- Удаление: только админы
CREATE POLICY "teacher_invitations_delete_policy" ON public.teacher_invitations 
  FOR DELETE USING (
    organization_id = public.get_user_organization_id()
    AND public.is_admin()
  );

-- Service role полный доступ
CREATE POLICY "teacher_invitations_service_role" ON public.teacher_invitations
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Комментарий
COMMENT ON TABLE public.teacher_invitations IS 'Приглашения преподавателей с magic link для онбординга';
