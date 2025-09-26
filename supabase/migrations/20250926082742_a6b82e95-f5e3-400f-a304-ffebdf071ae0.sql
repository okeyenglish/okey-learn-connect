-- Создание справочника дисциплин (предметов)
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создание справочника уровней подготовки
CREATE TABLE public.proficiency_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  level_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создание справочника форм обучения
CREATE TABLE public.learning_formats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создание справочника возрастных категорий
CREATE TABLE public.age_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  min_age INTEGER,
  max_age INTEGER,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создание справочника причин пропусков
CREATE TABLE public.absence_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  payment_coefficient DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- 1.00 = 100%, 0.50 = 50%
  is_excused BOOLEAN NOT NULL DEFAULT false, -- уважительная причина
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создание справочника аудиторий
CREATE TABLE public.classrooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  equipment TEXT[], -- оборудование в аудитории
  is_online BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Вставка базовых данных
INSERT INTO public.subjects (name, description, sort_order) VALUES
('Английский язык', 'Обучение английскому языку', 1),
('Немецкий язык', 'Обучение немецкому языку', 2),
('Французский язык', 'Обучение французскому языку', 3),
('Испанский язык', 'Обучение испанскому языку', 4),
('Итальянский язык', 'Обучение итальянскому языку', 5),
('Китайский язык', 'Обучение китайскому языку', 6);

INSERT INTO public.proficiency_levels (name, description, level_order) VALUES
('Beginner', 'Начальный уровень', 1),
('Elementary', 'Элементарный уровень', 2),
('Pre-Intermediate', 'Ниже среднего', 3),
('Intermediate', 'Средний уровень', 4),
('Upper-Intermediate', 'Выше среднего', 5),
('Advanced', 'Продвинутый уровень', 6),
('Native', 'Носитель языка', 7);

INSERT INTO public.learning_formats (name, description, is_online) VALUES
('Групповая', 'Занятия в группе', false),
('Индивидуальная', 'Индивидуальные занятия', false),
('Парная', 'Занятия в паре', false),
('Онлайн групповая', 'Групповые занятия онлайн', true),
('Онлайн индивидуальная', 'Индивидуальные занятия онлайн', true),
('Смешанная', 'Комбинированный формат', false);

INSERT INTO public.age_categories (name, min_age, max_age, description) VALUES
('Дошкольники', 3, 6, 'Дети дошкольного возраста'),
('Младшие школьники', 7, 10, 'Учащиеся начальной школы'),
('Средние школьники', 11, 14, 'Учащиеся средней школы'),
('Старшие школьники', 15, 17, 'Учащиеся старших классов'),
('Взрослые', 18, 99, 'Взрослые студенты'),
('Все возрасты', 3, 99, 'Без ограничений по возрасту');

INSERT INTO public.absence_reasons (name, description, payment_coefficient, is_excused) VALUES
('Болезнь', 'Болезнь студента', 0.00, true),
('Семейные обстоятельства', 'Семейные обстоятельства', 0.00, true),
('Технические проблемы', 'Проблемы с интернетом/техникой', 0.00, true),
('Не предупредил', 'Пропуск без предупреждения', 1.00, false),
('Опоздание более 15 минут', 'Значительное опоздание', 0.50, false),
('Отпуск/каникулы', 'Плановый отпуск или каникулы', 0.00, true);

-- Добавление триггеров для обновления updated_at
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proficiency_levels_updated_at BEFORE UPDATE ON public.proficiency_levels
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_formats_updated_at BEFORE UPDATE ON public.learning_formats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_age_categories_updated_at BEFORE UPDATE ON public.age_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_absence_reasons_updated_at BEFORE UPDATE ON public.absence_reasons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON public.classrooms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Включение RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proficiency_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- Политики RLS для справочников (чтение всем аутентифицированным, изменение только админам/методистам)
CREATE POLICY "Authenticated users can view subjects" ON public.subjects
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and methodists can manage subjects" ON public.subjects
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role));

CREATE POLICY "Authenticated users can view proficiency levels" ON public.proficiency_levels
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and methodists can manage proficiency levels" ON public.proficiency_levels
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role));

CREATE POLICY "Authenticated users can view learning formats" ON public.learning_formats
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and methodists can manage learning formats" ON public.learning_formats
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role));

CREATE POLICY "Authenticated users can view age categories" ON public.age_categories
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and methodists can manage age categories" ON public.age_categories
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role));

CREATE POLICY "Authenticated users can view absence reasons" ON public.absence_reasons
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and methodists can manage absence reasons" ON public.absence_reasons
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role));

CREATE POLICY "Users can view classrooms from their branches" ON public.classrooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND (classrooms.branch = p.branch OR EXISTS (
                SELECT 1 FROM manager_branches mb 
                WHERE mb.manager_id = auth.uid() AND mb.branch = classrooms.branch
            ))
        )
    );

CREATE POLICY "Admins and managers can manage classrooms from their branches" ON public.classrooms
    FOR ALL USING (
        (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_manager'::app_role)) AND
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND (classrooms.branch = p.branch OR EXISTS (
                SELECT 1 FROM manager_branches mb 
                WHERE mb.manager_id = auth.uid() AND mb.branch = classrooms.branch
            ))
        )
    )
    WITH CHECK (
        (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'branch_manager'::app_role)) AND
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND (classrooms.branch = p.branch OR EXISTS (
                SELECT 1 FROM manager_branches mb 
                WHERE mb.manager_id = auth.uid() AND mb.branch = classrooms.branch
            ))
        )
    );