-- Изменяем тип поля lessons_count в таблице payments с integer на numeric
-- чтобы поддерживать дробные академические часы (например, 1.5 ак.ч. для 60-минутного занятия)

ALTER TABLE payments 
ALTER COLUMN lessons_count TYPE numeric USING lessons_count::numeric;