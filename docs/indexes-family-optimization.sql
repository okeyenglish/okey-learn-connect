-- Индексы для ускорения RPC get_family_data_by_client_id
-- Выполните этот SQL на self-hosted Supabase (api.academyos.ru)

-- ============================================
-- Индексы для family_members
-- ============================================

-- Основной индекс: поиск family_group_id по client_id (используется в каждом запросе карточки)
CREATE INDEX IF NOT EXISTS idx_family_members_client_id 
ON family_members(client_id);

-- Индекс для выборки членов семьи по group_id
CREATE INDEX IF NOT EXISTS idx_family_members_family_group_id 
ON family_members(family_group_id);

-- Составной индекс для быстрого поиска group_id по client_id
CREATE INDEX IF NOT EXISTS idx_family_members_client_family 
ON family_members(client_id, family_group_id);

-- ============================================
-- Индексы для clients
-- ============================================

-- Индекс для поиска клиентов по телефону (используется при объединении семей)
CREATE INDEX IF NOT EXISTS idx_clients_phone 
ON clients(phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Примечание: clients использует is_active (boolean) на self-hosted
-- Если колонка существует, создаём индекс:
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'is_active') THEN
    CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active) WHERE is_active = true;
  END IF;
END $$;

-- Составной индекс для быстрой выборки данных клиента
CREATE INDEX IF NOT EXISTS idx_clients_id_org 
ON clients(id, organization_id);

-- ============================================
-- Индексы для students (связь через family_group_id)
-- ============================================

-- Индекс для поиска студентов по family_group_id
CREATE INDEX IF NOT EXISTS idx_students_family_group_id 
ON students(family_group_id);

-- Индекс для активных студентов
CREATE INDEX IF NOT EXISTS idx_students_status_active 
ON students(status) 
WHERE status = 'active';

-- ============================================
-- Индексы для client_phone_numbers
-- ============================================

-- Индекс для выборки телефонов клиента
CREATE INDEX IF NOT EXISTS idx_client_phone_numbers_client_id 
ON client_phone_numbers(client_id);

-- Составной индекс с сортировкой по is_primary
CREATE INDEX IF NOT EXISTS idx_client_phone_numbers_client_primary 
ON client_phone_numbers(client_id, is_primary DESC, created_at);

-- ============================================
-- Индексы для group_students (связь студент-группа)
-- ============================================

-- Индекс для поиска групп студента
CREATE INDEX IF NOT EXISTS idx_group_students_student_id 
ON group_students(student_id) 
WHERE is_active = true;

-- ============================================
-- Индексы для lesson_sessions (следующие уроки)
-- ============================================

-- Индекс для поиска будущих уроков группы
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_group_future 
ON lesson_sessions(group_id, lesson_date, start_time) 
WHERE status != 'cancelled' AND lesson_date >= CURRENT_DATE;

-- ============================================
-- Индексы для individual_lessons
-- ============================================

-- Индекс для поиска индивидуальных занятий студента
CREATE INDEX IF NOT EXISTS idx_individual_lessons_student_id 
ON individual_lessons(student_id) 
WHERE is_active = true;

-- ============================================
-- ANALYZE для обновления статистики
-- ============================================

ANALYZE family_members;
ANALYZE clients;
ANALYZE students;
ANALYZE client_phone_numbers;
ANALYZE group_students;
ANALYZE lesson_sessions;
ANALYZE individual_lessons;

-- ============================================
-- Проверка созданных индексов
-- ============================================
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes 
WHERE tablename IN ('family_members', 'clients', 'students', 'client_phone_numbers', 'group_students', 'lesson_sessions', 'individual_lessons')
  AND schemaname = 'public'
ORDER BY tablename, indexname;
