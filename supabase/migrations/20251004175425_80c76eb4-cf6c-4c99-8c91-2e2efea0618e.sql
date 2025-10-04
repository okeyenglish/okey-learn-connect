-- Добавляем колонки для учета минут в индивидуальных занятиях
ALTER TABLE public.individual_lesson_sessions
ADD COLUMN duration INTEGER,
ADD COLUMN paid_minutes INTEGER DEFAULT 0;

COMMENT ON COLUMN public.individual_lesson_sessions.duration IS 'Продолжительность конкретного занятия в минутах (может отличаться от базовой)';
COMMENT ON COLUMN public.individual_lesson_sessions.paid_minutes IS 'Сколько минут оплачено для этого занятия';

-- Устанавливаем продолжительность для существующих занятий из базовой продолжительности урока
UPDATE public.individual_lesson_sessions ils
SET duration = COALESCE(
  (SELECT il.duration FROM public.individual_lessons il WHERE il.id = ils.individual_lesson_id),
  60
)
WHERE duration IS NULL;

-- Устанавливаем paid_minutes для уже оплаченных занятий
UPDATE public.individual_lesson_sessions ils
SET paid_minutes = COALESCE(
  (SELECT il.duration FROM public.individual_lessons il WHERE il.id = ils.individual_lesson_id),
  60
)
WHERE payment_id IS NOT NULL AND paid_minutes = 0;