-- Создаем групповые занятия для Марии Ивановой
INSERT INTO public.learning_groups (id, name, branch, subject, level, responsible_teacher, capacity, current_students, status, schedule_time, schedule_room, created_at, updated_at) VALUES 
(gen_random_uuid(), 'Beginner A1 группа Марии', 'Окская', 'Английский', 'A1', 'Мария Иванова', 8, 3, 'active', 'Пн, Ср, Пт 15:00-16:30', 'Аудитория 201', now(), now()),
(gen_random_uuid(), 'Elementary A2 группа Марии', 'Окская', 'Английский', 'A2', 'Мария Иванова', 6, 2, 'active', 'Вт, Чт 16:00-17:30', 'Аудитория 203', now(), now()),
(gen_random_uuid(), 'Intermediate B1 группа Марии', 'Окская', 'Английский', 'B1', 'Мария Иванова', 5, 2, 'active', 'Сб 10:00-11:30', 'Аудитория 205', now(), now());

-- Создаем индивидуальные занятия для Марии Ивановой
INSERT INTO public.individual_lessons (id, student_name, branch, subject, level, teacher_name, status, schedule_time, price_per_lesson, academic_hours, created_at, updated_at, student_id) VALUES 
(gen_random_uuid(), 'Анна Тестова', 'Окская', 'Английский', 'A2', 'Мария Иванова', 'active', 'Чт 17:00-18:30', 2500, 20, now(), now(), '20000000-0000-4000-8000-000000000001'),
(gen_random_uuid(), 'Павел Петров', 'Окская', 'Английский', 'A1', 'Мария Иванова', 'active', 'Сб 14:00-15:30', 2200, 15, now(), now(), '850e8400-e29b-41d4-a716-446655440001'),
(gen_random_uuid(), 'Мария Петрова', 'Окская', 'Английский', 'Pre-A1', 'Мария Иванова', 'active', 'Сб 15:45-17:15', 2000, 12, now(), now(), '850e8400-e29b-41d4-a716-446655440002'),
(gen_random_uuid(), 'Алексей Смирнов', 'Окская', 'Английский', 'A1', 'Мария Иванова', 'active', 'Вс 11:00-12:30', 2300, 18, now(), now(), '850e8400-e29b-41d4-a716-446655440003'),
(gen_random_uuid(), 'Диана Волкова', 'Окская', 'Английский', 'Pre-A1', 'Мария Иванова', 'active', 'Вс 13:00-14:30', 2000, 10, now(), now(), '850e8400-e29b-41d4-a716-446655440004');