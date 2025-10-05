-- Добавляем поля оплаты в таблицу lesson_sessions (групповые занятия)
ALTER TABLE lesson_sessions 
ADD COLUMN IF NOT EXISTS paid_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_date date,
ADD COLUMN IF NOT EXISTS payment_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS lessons_count integer;

-- Добавляем комментарии для новых полей
COMMENT ON COLUMN lesson_sessions.paid_minutes IS 'Количество оплаченных минут занятия';
COMMENT ON COLUMN lesson_sessions.payment_id IS 'Ссылка на платеж';
COMMENT ON COLUMN lesson_sessions.payment_date IS 'Дата платежа';
COMMENT ON COLUMN lesson_sessions.payment_amount IS 'Сумма платежа';
COMMENT ON COLUMN lesson_sessions.lessons_count IS 'Количество занятий в платеже';

-- Создаем индекс для быстрого поиска по payment_id
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_payment_id ON lesson_sessions(payment_id);