-- Add missing student statuses to the enum
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'not_started';
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'on_pause';
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'expelled';