-- Создаем семейные группы
INSERT INTO public.family_groups (name, branch, created_at, updated_at) VALUES 
('Семья Петровых', 'Окская', now(), now()),
('Семья Сидоровых', 'Окская', now(), now()),
('Семья Козловых', 'Окская', now(), now()),
('Семья Новиковых', 'Окская', now(), now());

-- Создаем клиентов для семей
INSERT INTO public.clients (name, phone, branch, created_at, updated_at) VALUES
('Родитель Петровых', '+79161234567', 'Окская', now(), now()),
('Родитель Сидоровых', '+79162345678', 'Окская', now(), now()),
('Родитель Козловых', '+79163456789', 'Окская', now(), now()),
('Родитель Новиковых', '+79164567890', 'Окская', now(), now());

-- Создаем тестовых студентов с привязкой к семейным группам
INSERT INTO public.students (name, first_name, last_name, age, family_group_id, status, phone, created_at, updated_at) VALUES 
('Петров Алексей Дмитриевич', 'Алексей', 'Петров', 12, (SELECT id FROM family_groups WHERE name = 'Семья Петровых' LIMIT 1), 'active', '+79161234567', now(), now()),
('Петрова Анна Дмитриевна', 'Анна', 'Петрова', 10, (SELECT id FROM family_groups WHERE name = 'Семья Петровых' LIMIT 1), 'active', '+79161234567', now(), now()),
('Сидоров Михаил Андреевич', 'Михаил', 'Сидоров', 14, (SELECT id FROM family_groups WHERE name = 'Семья Сидоровых' LIMIT 1), 'active', '+79162345678', now(), now()),
('Козлова Елена Сергеевна', 'Елена', 'Козлова', 16, (SELECT id FROM family_groups WHERE name = 'Семья Козловых' LIMIT 1), 'active', '+79163456789', now(), now()),
('Новиков Дмитрий Александрович', 'Дмитрий', 'Новиков', 15, (SELECT id FROM family_groups WHERE name = 'Семья Новиковых' LIMIT 1), 'active', '+79164567890', now(), now());