-- Добавляем значение 'cancelled' в enum group_status
ALTER TYPE group_status ADD VALUE IF NOT EXISTS 'cancelled';