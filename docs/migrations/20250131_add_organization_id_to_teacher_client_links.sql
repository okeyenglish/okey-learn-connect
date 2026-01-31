-- Миграция: Добавление organization_id в teacher_client_links
-- Выполните на self-hosted Supabase (api.academyos.ru)

-- ============================================================
-- ШАГ 1: Добавляем колонку (nullable для безопасного обновления)
-- ============================================================

ALTER TABLE public.teacher_client_links 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- ============================================================
-- ШАГ 2: Заполняем organization_id из связанных таблиц
-- ============================================================

-- 2.1. Заполняем из преподавателей
UPDATE teacher_client_links tcl
SET organization_id = t.organization_id
FROM teachers t
WHERE tcl.teacher_id = t.id
  AND tcl.organization_id IS NULL
  AND t.organization_id IS NOT NULL;

-- 2.2. Для оставшихся — из клиентов
UPDATE teacher_client_links tcl
SET organization_id = c.organization_id
FROM clients c
WHERE tcl.client_id = c.id
  AND tcl.organization_id IS NULL
  AND c.organization_id IS NOT NULL;

-- 2.3. Проверяем, что все записи заполнены
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM teacher_client_links WHERE organization_id IS NULL;
  IF null_count > 0 THEN
    RAISE WARNING 'Остались % связей без organization_id. Заполните вручную.', null_count;
  END IF;
END $$;

-- ============================================================
-- ШАГ 3: Делаем колонку NOT NULL (после заполнения всех записей)
-- ============================================================

ALTER TABLE public.teacher_client_links
ALTER COLUMN organization_id SET NOT NULL;

-- ============================================================
-- ШАГ 4: Создаём индекс для оптимизации запросов
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_teacher_client_links_organization_id 
ON teacher_client_links(organization_id);

-- ============================================================
-- ШАГ 5: Добавляем Foreign Key
-- ============================================================

ALTER TABLE teacher_client_links 
ADD CONSTRAINT fk_teacher_client_links_organization
FOREIGN KEY (organization_id) REFERENCES organizations(id)
ON DELETE CASCADE;

-- ============================================================
-- ШАГ 6: Обновляем RLS-политики для изоляции по организации
-- ============================================================

-- Включаем RLS если ещё не включён
ALTER TABLE teacher_client_links ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view teacher_client_links in their org" ON teacher_client_links;
DROP POLICY IF EXISTS "Users can create teacher_client_links in their org" ON teacher_client_links;
DROP POLICY IF EXISTS "Users can delete teacher_client_links in their org" ON teacher_client_links;
DROP POLICY IF EXISTS "Service role full access" ON teacher_client_links;

-- Создаём новые политики
CREATE POLICY "Users can view teacher_client_links in their org"
  ON teacher_client_links FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create teacher_client_links in their org"
  ON teacher_client_links FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete teacher_client_links in their org"
  ON teacher_client_links FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_admin());

CREATE POLICY "Service role full access"
  ON teacher_client_links FOR ALL
  USING (true);

-- ============================================================
-- ГОТОВО
-- ============================================================
-- После выполнения этой миграции:
-- 1. Каждая связь преподаватель-клиент принадлежит конкретной организации
-- 2. RLS-политики корректно изолируют данные
-- 3. Фронтенд-код вставляет organization_id при создании связи
