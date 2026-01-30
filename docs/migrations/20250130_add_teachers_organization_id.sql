-- Миграция: Добавление organization_id в таблицу teachers для мультитенантности
-- Выполните на self-hosted Supabase (api.academyos.ru)

-- ============================================================
-- ШАГ 1: Добавляем колонку (nullable для безопасного обновления)
-- ============================================================

ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- ============================================================
-- ШАГ 2: Заполняем organization_id из связанных таблиц
-- ============================================================

-- 2.1. Заполняем из profiles (через profile_id)
UPDATE teachers t
SET organization_id = p.organization_id
FROM profiles p
WHERE t.profile_id = p.id
  AND t.organization_id IS NULL
  AND p.organization_id IS NOT NULL;

-- 2.2. Заполняем из teacher_invitations (для незарегистрированных преподавателей)
UPDATE teachers t
SET organization_id = ti.organization_id
FROM teacher_invitations ti
WHERE t.id = ti.teacher_id
  AND t.organization_id IS NULL
  AND ti.organization_id IS NOT NULL;

-- 2.3. Для оставшихся записей — назначаем первую найденную организацию
-- (это безопасно для single-tenant или когда есть одна основная организация)
UPDATE teachers
SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
WHERE organization_id IS NULL;

-- 2.4. Проверяем, что все записи заполнены
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM teachers WHERE organization_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Остались % преподавателей без organization_id. Заполните вручную.', null_count;
  END IF;
END $$;

-- ============================================================
-- ШАГ 3: Делаем колонку NOT NULL (после заполнения всех записей)
-- ============================================================

ALTER TABLE public.teachers
ALTER COLUMN organization_id SET NOT NULL;

-- ============================================================
-- ШАГ 4: Создаём индекс для оптимизации запросов
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_teachers_organization_id 
ON teachers(organization_id);

-- ============================================================
-- ШАГ 5: Добавляем Foreign Key (опционально)
-- ============================================================

ALTER TABLE teachers 
ADD CONSTRAINT fk_teachers_organization
FOREIGN KEY (organization_id) REFERENCES organizations(id)
ON DELETE RESTRICT;

-- ============================================================
-- ШАГ 6: Обновляем RLS-политики для изоляции по организации
-- ============================================================

-- Включаем RLS если ещё не включён
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view teachers in their organization" ON teachers;
DROP POLICY IF EXISTS "Teachers can view own record" ON teachers;
DROP POLICY IF EXISTS "Users can create teachers in their organization" ON teachers;
DROP POLICY IF EXISTS "Admins can update teachers" ON teachers;
DROP POLICY IF EXISTS "Teachers can update own record" ON teachers;
DROP POLICY IF EXISTS "Admins can delete teachers" ON teachers;
DROP POLICY IF EXISTS "Service role full access to teachers" ON teachers;

-- Создаём новые политики
CREATE POLICY "Users can view teachers in their organization"
  ON teachers FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Teachers can view own record"
  ON teachers FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can create teachers in their organization"
  ON teachers FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Admins can update teachers"
  ON teachers FOR UPDATE
  USING (
    organization_id = get_user_organization_id() 
    AND (is_admin() OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Teachers can update own record"
  ON teachers FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can delete teachers"
  ON teachers FOR DELETE
  USING (
    organization_id = get_user_organization_id() 
    AND is_admin()
  );

CREATE POLICY "Service role full access to teachers"
  ON teachers FOR ALL
  USING (true);

-- ============================================================
-- ГОТОВО
-- ============================================================
-- После выполнения этой миграции:
-- 1. Каждый преподаватель принадлежит конкретной организации
-- 2. RLS-политики корректно изолируют данные
-- 3. Фронтенд-код сможет вставлять organization_id при создании
