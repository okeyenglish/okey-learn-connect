-- ============================================
-- SQL Migration: Сделать phone необязательным в employee_invitations
-- Применить вручную на api.academyos.ru
-- ============================================

-- Убираем NOT NULL ограничение с колонки phone
ALTER TABLE public.employee_invitations 
ALTER COLUMN phone DROP NOT NULL;

-- Добавляем комментарий для документации
COMMENT ON COLUMN public.employee_invitations.phone IS 'Телефон сотрудника (опционально). Если не указан, сотрудник заполнит при регистрации';
