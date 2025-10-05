-- Добавляем новые статусы для занятий
ALTER TYPE lesson_status ADD VALUE IF NOT EXISTS 'free';
ALTER TYPE lesson_status ADD VALUE IF NOT EXISTS 'free_skip';
ALTER TYPE lesson_status ADD VALUE IF NOT EXISTS 'paid_skip';