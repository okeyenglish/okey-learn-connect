-- Создаем систему абонементов для языкового центра

-- Enum для типов абонементов
CREATE TYPE public.subscription_type AS ENUM ('per_lesson', 'monthly', 'weekly');

-- Enum для статусов абонементов
CREATE TYPE public.subscription_status AS ENUM ('active', 'paused', 'expired', 'cancelled');

-- Основная таблица абонементов
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.learning_groups(id) ON DELETE SET NULL,
  
  -- Основная информация
  name TEXT NOT NULL,
  subscription_type subscription_type NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  
  -- Финансовые параметры
  total_price NUMERIC(10,2) NOT NULL,
  price_per_lesson NUMERIC(10,2),
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  
  -- Количественные параметры
  total_lessons INTEGER, -- Для поурочных абонементов
  remaining_lessons INTEGER DEFAULT 0,
  
  -- Временные параметры
  start_date DATE NOT NULL,
  end_date DATE,
  valid_until DATE, -- Дата истечения абонемента
  
  -- Настройки списания
  auto_charge BOOLEAN DEFAULT true,
  freeze_enabled BOOLEAN DEFAULT true,
  makeup_lessons_allowed BOOLEAN DEFAULT true,
  
  -- Филиал и предмет
  branch TEXT NOT NULL DEFAULT 'Окская',
  subject TEXT NOT NULL DEFAULT 'Английский',
  level TEXT,
  
  -- Метаданные
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Таблица для истории транзакций по абонементам
CREATE TABLE public.subscription_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  lesson_session_id UUID REFERENCES public.lesson_sessions(id) ON DELETE SET NULL,
  
  -- Тип операции
  transaction_type TEXT NOT NULL, -- 'charge', 'refund', 'bonus', 'correction'
  
  -- Изменения баланса
  lessons_changed INTEGER DEFAULT 0, -- Изменение количества занятий
  amount_changed NUMERIC(10,2) DEFAULT 0, -- Изменение суммы
  
  -- Описание
  description TEXT NOT NULL,
  reason TEXT,
  
  -- Метаданные
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Таблица тарифных планов (шаблоны абонементов)
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Основная информация
  name TEXT NOT NULL,
  description TEXT,
  subscription_type subscription_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Параметры плана
  lessons_count INTEGER, -- Количество занятий (для поурочных)
  duration_days INTEGER, -- Продолжительность в днях
  price NUMERIC(10,2) NOT NULL,
  price_per_lesson NUMERIC(10,2),
  
  -- Настройки
  auto_renewal BOOLEAN DEFAULT false,
  freeze_days_allowed INTEGER DEFAULT 0,
  makeup_lessons_count INTEGER DEFAULT 0,
  
  -- Ограничения
  branch TEXT,
  subject TEXT,
  age_category group_category,
  min_level TEXT,
  max_level TEXT,
  
  -- Метаданные
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица для заморозок абонементов
CREATE TABLE public.subscription_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  
  -- Период заморозки
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  
  -- Причина и описание
  reason TEXT NOT NULL,
  description TEXT,
  
  -- Метаданные
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Включаем RLS для всех таблиц
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_freezes ENABLE ROW LEVEL SECURITY;

-- Политики для subscriptions
CREATE POLICY "Users can view subscriptions from their branches"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (subscriptions.branch = p.branch 
         OR EXISTS (
           SELECT 1 FROM public.manager_branches mb
           WHERE mb.manager_id = auth.uid() 
           AND mb.branch = subscriptions.branch
         ))
  )
);

CREATE POLICY "Users can manage subscriptions from their branches"
ON public.subscriptions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (subscriptions.branch = p.branch 
         OR EXISTS (
           SELECT 1 FROM public.manager_branches mb
           WHERE mb.manager_id = auth.uid() 
           AND mb.branch = subscriptions.branch
         ))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (subscriptions.branch = p.branch 
         OR EXISTS (
           SELECT 1 FROM public.manager_branches mb
           WHERE mb.manager_id = auth.uid() 
           AND mb.branch = subscriptions.branch
         ))
  )
);

-- Студенты могут видеть свои абонементы
CREATE POLICY "Students can view their own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.profiles p ON p.phone = s.phone
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid() AND ur.role = 'student'
  )
);

-- Политики для subscription_transactions
CREATE POLICY "Users can view transactions from their branch subscriptions"
ON public.subscription_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = subscription_transactions.subscription_id
    AND (s.branch = p.branch 
         OR EXISTS (
           SELECT 1 FROM public.manager_branches mb
           WHERE mb.manager_id = auth.uid() 
           AND mb.branch = s.branch
         ))
  )
);

CREATE POLICY "Users can manage transactions from their branch subscriptions"
ON public.subscription_transactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = subscription_transactions.subscription_id
    AND (s.branch = p.branch 
         OR EXISTS (
           SELECT 1 FROM public.manager_branches mb
           WHERE mb.manager_id = auth.uid() 
           AND mb.branch = s.branch
         ))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = subscription_transactions.subscription_id
    AND (s.branch = p.branch 
         OR EXISTS (
           SELECT 1 FROM public.manager_branches mb
           WHERE mb.manager_id = auth.uid() 
           AND mb.branch = s.branch
         ))
  )
);

-- Политики для subscription_plans (тарифные планы доступны всем аутентифицированным)
CREATE POLICY "Authenticated users can view subscription plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and managers can manage subscription plans"
ON public.subscription_plans
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'branch_manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'branch_manager'));

-- Политики для subscription_freezes
CREATE POLICY "Users can view freezes from their branch subscriptions"
ON public.subscription_freezes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = subscription_freezes.subscription_id
    AND (s.branch = p.branch 
         OR EXISTS (
           SELECT 1 FROM public.manager_branches mb
           WHERE mb.manager_id = auth.uid() 
           AND mb.branch = s.branch
         ))
  )
);

CREATE POLICY "Users can manage freezes from their branch subscriptions"
ON public.subscription_freezes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = subscription_freezes.subscription_id
    AND (s.branch = p.branch 
         OR EXISTS (
           SELECT 1 FROM public.manager_branches mb
           WHERE mb.manager_id = auth.uid() 
           AND mb.branch = s.branch
         ))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = subscription_freezes.subscription_id
    AND (s.branch = p.branch 
         OR EXISTS (
           SELECT 1 FROM public.manager_branches mb
           WHERE mb.manager_id = auth.uid() 
           AND mb.branch = s.branch
         ))
  )
);

-- Создаем триггеры для обновления updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();