-- Add external_id columns to track Holihope IDs
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;
ALTER TABLE learning_groups ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;
ALTER TABLE lesson_sessions ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;
ALTER TABLE individual_lessons ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teachers_external_id ON teachers(external_id);
CREATE INDEX IF NOT EXISTS idx_clients_external_id ON clients(external_id);
CREATE INDEX IF NOT EXISTS idx_students_external_id ON students(external_id);
CREATE INDEX IF NOT EXISTS idx_learning_groups_external_id ON learning_groups(external_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_external_id ON lesson_sessions(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_individual_lessons_external_id ON individual_lessons(external_id);