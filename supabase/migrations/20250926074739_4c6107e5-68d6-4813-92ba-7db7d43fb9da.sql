-- Четвертая часть: заполняем базовые права доступа для каждой роли
INSERT INTO public.role_permissions (role, permission, resource, can_create, can_read, can_update, can_delete) VALUES
-- Администратор - полные права на все
('admin', 'manage', 'all', true, true, true, true),
('admin', 'manage', 'users', true, true, true, true),
('admin', 'manage', 'roles', true, true, true, true),
('admin', 'manage', 'settings', true, true, true, true),

-- Управляющий филиалом - управление своим филиалом
('branch_manager', 'manage', 'branch_users', true, true, true, false),
('branch_manager', 'manage', 'schedules', true, true, true, true),
('branch_manager', 'manage', 'groups', true, true, true, true),
('branch_manager', 'view', 'reports', false, true, false, false),
('branch_manager', 'manage', 'students', true, true, true, false),

-- Методист - управление учебным процессом
('methodist', 'manage', 'courses', true, true, true, true),
('methodist', 'manage', 'schedules', true, true, true, true),
('methodist', 'manage', 'groups', true, true, true, true),
('methodist', 'manage', 'teachers', false, true, true, false),
('methodist', 'view', 'reports', false, true, false, false),

-- Старший преподаватель - управление преподавателями и расписанием
('head_teacher', 'manage', 'schedules', true, true, true, false),
('head_teacher', 'manage', 'teachers', false, true, true, false),
('head_teacher', 'manage', 'groups', false, true, true, false),
('head_teacher', 'view', 'reports', false, true, false, false),

-- Менеджер - управление клиентами и продажами
('manager', 'manage', 'clients', true, true, true, false),
('manager', 'manage', 'leads', true, true, true, false),
('manager', 'manage', 'calls', true, true, true, false),
('manager', 'view', 'schedules', false, true, false, false),

-- Менеджер по продажам - фокус на продажах
('sales_manager', 'manage', 'leads', true, true, true, false),
('sales_manager', 'manage', 'clients', true, true, true, false),
('sales_manager', 'manage', 'calls', true, true, true, false),
('sales_manager', 'view', 'reports', false, true, false, false),

-- Маркетолог - управление маркетингом и анализом
('marketing_manager', 'manage', 'campaigns', true, true, true, true),
('marketing_manager', 'view', 'analytics', false, true, false, false),
('marketing_manager', 'view', 'reports', false, true, false, false),
('marketing_manager', 'view', 'leads', false, true, false, false),

-- Бухгалтер - управление финансами
('accountant', 'manage', 'payments', true, true, true, false),
('accountant', 'manage', 'invoices', true, true, true, false),
('accountant', 'view', 'financial_reports', false, true, false, false),
('accountant', 'manage', 'salaries', false, true, true, false),

-- Администратор (ресепшн) - базовые операции
('receptionist', 'manage', 'clients', true, true, true, false),
('receptionist', 'view', 'schedules', false, true, false, false),
('receptionist', 'manage', 'calls', true, true, false, false),

-- Учитель - управление своими занятиями
('teacher', 'manage', 'own_lessons', false, true, true, false),
('teacher', 'manage', 'attendance', true, true, true, false),
('teacher', 'manage', 'homework', true, true, true, false),
('teacher', 'view', 'students', false, true, false, false),

-- Студент - доступ к своей информации
('student', 'view', 'own_data', false, true, false, false),
('student', 'view', 'schedule', false, true, false, false),
('student', 'view', 'homework', false, true, false, false),
('student', 'manage', 'profile', false, true, true, false);