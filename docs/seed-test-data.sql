-- ============================================
-- Seed Script: Тестовые данные для приёмки CRM
-- ============================================
-- Версия: 1.0
-- Дата: 21.10.2025
-- Назначение: Генерация тестовых данных для полного тестирования бизнес-цикла
--
-- ВНИМАНИЕ: Этот скрипт создаёт тестовые данные!
-- Не запускать в production без проверки!
-- ============================================

BEGIN;

-- ============================================
-- 1. Lead Sources (Источники лидов)
-- ============================================
INSERT INTO lead_sources (name, description, is_active) VALUES
('Instagram', 'Реклама в Instagram', true),
('Яндекс.Директ', 'Контекстная реклама', true),
('Сарафанное радио', 'Рекомендации учеников', true),
('Сайт школы', 'Органический трафик', true),
('WhatsApp', 'Входящие сообщения', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. Lead Statuses (Статусы лидов)
-- ============================================
INSERT INTO lead_statuses (name, slug, color, sort_order) VALUES
('Новый', 'new', '#3b82f6', 1),
('Обработан', 'contacted', '#10b981', 2),
('Пробный урок назначен', 'trial_scheduled', '#f59e0b', 3),
('Пробный урок проведён', 'trial_completed', '#8b5cf6', 4),
('Конвертирован', 'converted', '#22c55e', 5),
('Отказ', 'rejected', '#ef4444', 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 3. Test Leads (30 лидов для разных сценариев)
-- ============================================
DO $$
DECLARE
  v_source_instagram uuid;
  v_source_yandex uuid;
  v_source_referral uuid;
  v_status_new uuid;
  v_status_contacted uuid;
  v_status_trial_scheduled uuid;
  v_status_converted uuid;
  v_manager_id uuid;
BEGIN
  -- Получаем ID источников и статусов
  SELECT id INTO v_source_instagram FROM lead_sources WHERE name = 'Instagram' LIMIT 1;
  SELECT id INTO v_source_yandex FROM lead_sources WHERE name = 'Яндекс.Директ' LIMIT 1;
  SELECT id INTO v_source_referral FROM lead_sources WHERE name = 'Сарафанное радио' LIMIT 1;
  
  SELECT id INTO v_status_new FROM lead_statuses WHERE slug = 'new' LIMIT 1;
  SELECT id INTO v_status_contacted FROM lead_statuses WHERE slug = 'contacted' LIMIT 1;
  SELECT id INTO v_status_trial_scheduled FROM lead_statuses WHERE slug = 'trial_scheduled' LIMIT 1;
  SELECT id INTO v_status_converted FROM lead_statuses WHERE slug = 'converted' LIMIT 1;
  
  -- Получаем ID менеджера (если есть)
  SELECT id INTO v_manager_id FROM profiles WHERE email = 'pyshnov89@mail.ru' LIMIT 1;

  -- Новые лиды (последние 3 дня)
  INSERT INTO leads (first_name, last_name, phone, email, age, subject, level, branch, 
                     utm_source, lead_source_id, status_id, assigned_to, notes, created_at) VALUES
  ('Алексей', 'Смирнов', '+79001234501', 'alexey@test.ru', 28, 'Английский', 'Intermediate', 'Окская', 
   'instagram', v_source_instagram, v_status_new, v_manager_id, 'Интересуется групповыми занятиями', NOW() - INTERVAL '1 day'),
  
  ('Мария', 'Иванова', '+79001234502', 'maria@test.ru', 32, 'Английский', 'Beginner', 'Окская', 
   'yandex_direct', v_source_yandex, v_status_new, v_manager_id, 'Хочет начать с нуля', NOW() - INTERVAL '2 days'),
  
  ('Дмитрий', 'Петров', '+79001234503', 'dmitry@test.ru', 25, 'Английский', 'Advanced', 'Окская', 
   'referral', v_source_referral, v_status_new, v_manager_id, 'Рекомендация от ученицы Анны', NOW() - INTERVAL '3 days'),
  
  -- Обработанные лиды (ожидают пробного)
  ('Елена', 'Соколова', '+79001234504', 'elena@test.ru', 30, 'Английский', 'Intermediate', 'Окская', 
   'instagram', v_source_instagram, v_status_contacted, v_manager_id, 'Перезвонили, интересуется утренними группами', NOW() - INTERVAL '5 days'),
  
  ('Игорь', 'Волков', '+79001234505', 'igor@test.ru', 27, 'Английский', 'Upper-Intermediate', 'Окская', 
   'website', v_source_yandex, v_status_contacted, v_manager_id, 'Нужна подготовка к IELTS', NOW() - INTERVAL '6 days'),
  
  -- Лиды с назначенным пробным
  ('Анна', 'Кузнецова', '+79001234506', 'anna@test.ru', 29, 'Английский', 'Beginner', 'Окская', 
   'instagram', v_source_instagram, v_status_trial_scheduled, v_manager_id, 'Пробный урок назначен на завтра 18:00', NOW() - INTERVAL '7 days'),
  
  ('Сергей', 'Морозов', '+79001234507', 'sergey@test.ru', 35, 'Английский', 'Intermediate', 'Окская', 
   'referral', v_source_referral, v_status_trial_scheduled, v_manager_id, 'Пробный урок 25 октября 19:00', NOW() - INTERVAL '8 days'),
  
  -- Больше лидов для статистики (разные источники и статусы)
  ('Ольга', 'Романова', '+79001234508', 'olga@test.ru', 26, 'Английский', 'Pre-Intermediate', 'Окская', 
   'instagram', v_source_instagram, v_status_new, v_manager_id, NULL, NOW() - INTERVAL '1 day'),
  
  ('Павел', 'Новиков', '+79001234509', 'pavel@test.ru', 31, 'Английский', 'Beginner', 'Окская', 
   'yandex_direct', v_source_yandex, v_status_contacted, v_manager_id, NULL, NOW() - INTERVAL '4 days'),
  
  ('Татьяна', 'Федорова', '+79001234510', 'tatyana@test.ru', 24, 'Английский', 'Advanced', 'Окская', 
   'referral', v_source_referral, v_status_new, v_manager_id, 'Срочно нужна подготовка к собеседованию', NOW() - INTERVAL '2 hours');

  RAISE NOTICE 'Created 10 test leads';
END $$;

-- ============================================
-- 4. Trial Lessons (Пробные уроки)
-- ============================================
CREATE TABLE IF NOT EXISTS trial_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  teacher_name text,
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  classroom text,
  branch text,
  status text DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  result text, -- converted, not_interested, think_about_it
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Добавим несколько пробных уроков
INSERT INTO trial_lessons (lead_id, teacher_name, scheduled_date, scheduled_time, classroom, branch, status)
SELECT id, 'Пышнов Даниил', CURRENT_DATE + INTERVAL '1 day', '18:00', 'Кабинет 101', branch, 'scheduled'
FROM leads WHERE phone = '+79001234506' LIMIT 1;

INSERT INTO trial_lessons (lead_id, teacher_name, scheduled_date, scheduled_time, classroom, branch, status)
SELECT id, 'Пышнов Даниил', CURRENT_DATE + INTERVAL '4 days', '19:00', 'Кабинет 102', branch, 'scheduled'
FROM leads WHERE phone = '+79001234507' LIMIT 1;

-- ============================================
-- 5. Test Payments (50+ оплат для статистики)
-- ============================================
DO $$
DECLARE
  v_client record;
  v_date date;
  v_amount numeric;
BEGIN
  -- Создадим оплаты для первых 20 клиентов
  FOR v_client IN 
    SELECT id, branch FROM clients WHERE is_active = true LIMIT 20
  LOOP
    -- Для каждого клиента создаём 1-3 оплаты за последние 3 месяца
    FOR i IN 1..FLOOR(RANDOM() * 3 + 1)::int LOOP
      v_date := CURRENT_DATE - (FLOOR(RANDOM() * 90)::int || ' days')::interval;
      v_amount := (CASE FLOOR(RANDOM() * 3)
                    WHEN 0 THEN 4000  -- Разовое занятие
                    WHEN 1 THEN 6000  -- Абонемент 4 занятия
                    ELSE 10000        -- Абонемент 8 занятий
                  END);
      
      INSERT INTO payments (
        client_id, 
        amount, 
        payment_method, 
        payment_type,
        status, 
        branch,
        notes,
        created_at
      ) VALUES (
        v_client.id,
        v_amount,
        (ARRAY['card', 'cash', 'bank_transfer'])[FLOOR(RANDOM() * 3 + 1)],
        'subscription',
        'paid',
        v_client.branch,
        'Абонемент на занятия',
        v_date
      );
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created test payments';
END $$;

-- ============================================
-- 6. Test Lesson Sessions (Занятия на ближайшую неделю)
-- ============================================
DO $$
DECLARE
  v_group record;
  v_day int;
  v_date date;
BEGIN
  -- Для каждой активной группы создадим занятия на неделю
  FOR v_group IN 
    SELECT id, name, responsible_teacher, schedule_time, schedule_room, branch 
    FROM learning_groups 
    WHERE is_active = true 
    LIMIT 10
  LOOP
    -- Понедельник, Среда (занятия 2 раза в неделю)
    FOR v_day IN 0, 2, 7, 9, 14, 16 LOOP -- 0=пн, 2=ср, 7=след пн, и т.д.
      v_date := CURRENT_DATE + (v_day || ' days')::interval;
      
      INSERT INTO lesson_sessions (
        group_id,
        teacher_name,
        lesson_date,
        start_time,
        end_time,
        classroom,
        branch,
        status
      ) VALUES (
        v_group.id,
        v_group.responsible_teacher,
        v_date,
        SPLIT_PART(v_group.schedule_time, '-', 1),
        SPLIT_PART(v_group.schedule_time, '-', 2),
        v_group.schedule_room,
        v_group.branch,
        CASE 
          WHEN v_day < 0 THEN 'completed'
          WHEN v_day = 0 THEN 'ongoing'
          ELSE 'scheduled'
        END
      );
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created test lesson sessions';
END $$;

-- ============================================
-- 7. Attendance Records (Посещаемость)
-- ============================================
-- Отметим посещаемость для завершённых занятий
UPDATE lesson_sessions 
SET notes = 'Присутствовали: 8/10 учеников' 
WHERE status = 'completed' 
AND lesson_date >= CURRENT_DATE - INTERVAL '7 days';

-- ============================================
-- 8. Enable RLS (КРИТИЧНО!)
-- ============================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_lessons ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. Fix Function Security (search_path)
-- ============================================
-- Примеры fix для функций (нужно применить ко всем функциям)

-- ALTER FUNCTION get_user_role(uuid) SET search_path = public;
-- ALTER FUNCTION get_user_roles(uuid) SET search_path = public;
-- ALTER FUNCTION user_has_permission(uuid, text, text) SET search_path = public;

-- ============================================
-- Завершение
-- ============================================
COMMIT;

-- ============================================
-- Проверка результатов
-- ============================================
SELECT 'Leads created:' as info, COUNT(*) as count FROM leads;
SELECT 'Trial lessons created:' as info, COUNT(*) as count FROM trial_lessons;
SELECT 'Payments created:' as info, COUNT(*) as count FROM payments;
SELECT 'Lesson sessions created:' as info, COUNT(*) as count FROM lesson_sessions WHERE lesson_date >= CURRENT_DATE;
SELECT 'RLS enabled on critical tables' as info;

-- ============================================
-- Проверка данных для дашборда
-- ============================================
SELECT 
  'Monthly revenue:' as metric,
  TO_CHAR(SUM(amount), '999,999,999') || ' ₽' as value
FROM payments 
WHERE status = 'paid' 
AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

SELECT 
  'Active clients:' as metric,
  COUNT(*) as value
FROM clients 
WHERE is_active = true;

SELECT 
  'New leads (last 7 days):' as metric,
  COUNT(*) as value
FROM leads 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

SELECT 
  'Trial lessons scheduled:' as metric,
  COUNT(*) as value
FROM trial_lessons 
WHERE status = 'scheduled'
AND scheduled_date >= CURRENT_DATE;

-- Конец скрипта
