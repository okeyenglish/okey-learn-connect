-- Добавление полей для паспортных данных и документов преподавателя
ALTER TABLE public.teachers
ADD COLUMN passport_series TEXT,
ADD COLUMN passport_number TEXT,
ADD COLUMN passport_issued_by TEXT,
ADD COLUMN passport_issued_date DATE,
ADD COLUMN inn TEXT,
ADD COLUMN snils TEXT,
ADD COLUMN birthdate DATE,
ADD COLUMN birth_place TEXT,
ADD COLUMN registration_address TEXT,
ADD COLUMN residential_address TEXT;

-- Создание индексов для быстрого поиска по ИНН и СНИЛС
CREATE INDEX idx_teachers_inn ON public.teachers(inn) WHERE inn IS NOT NULL;
CREATE INDEX idx_teachers_snils ON public.teachers(snils) WHERE snils IS NOT NULL;

-- Комментарии к полям
COMMENT ON COLUMN public.teachers.passport_series IS 'Серия паспорта';
COMMENT ON COLUMN public.teachers.passport_number IS 'Номер паспорта';
COMMENT ON COLUMN public.teachers.passport_issued_by IS 'Кем выдан паспорт';
COMMENT ON COLUMN public.teachers.passport_issued_date IS 'Дата выдачи паспорта';
COMMENT ON COLUMN public.teachers.inn IS 'ИНН (12 цифр)';
COMMENT ON COLUMN public.teachers.snils IS 'СНИЛС (11 цифр)';
COMMENT ON COLUMN public.teachers.birthdate IS 'Дата рождения';
COMMENT ON COLUMN public.teachers.birth_place IS 'Место рождения';
COMMENT ON COLUMN public.teachers.registration_address IS 'Адрес регистрации';
COMMENT ON COLUMN public.teachers.residential_address IS 'Адрес проживания';