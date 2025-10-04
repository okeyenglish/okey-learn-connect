-- Создаем тип для транзакций баланса
CREATE TYPE public.balance_transaction_type AS ENUM ('credit', 'debit', 'transfer_in', 'refund');

-- Создаем таблицу для хранения балансов студентов
CREATE TABLE IF NOT EXISTS public.student_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Создаем таблицу для истории транзакций баланса
CREATE TABLE IF NOT EXISTS public.balance_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  transaction_type balance_transaction_type NOT NULL,
  description text NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  lesson_session_id uuid REFERENCES public.individual_lesson_sessions(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.student_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

-- Политики для student_balances
CREATE POLICY "Authenticated users can view student balances"
ON public.student_balances FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage student balances"
ON public.student_balances FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Политики для balance_transactions
CREATE POLICY "Authenticated users can view balance transactions"
ON public.balance_transactions FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage balance transactions"
ON public.balance_transactions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Создаем функцию для добавления транзакции в баланс студента
CREATE OR REPLACE FUNCTION public.add_balance_transaction(
  _student_id uuid,
  _amount numeric,
  _transaction_type balance_transaction_type,
  _description text,
  _payment_id uuid DEFAULT NULL,
  _lesson_session_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance numeric;
BEGIN
  -- Получаем текущий баланс или создаем запись, если её нет
  INSERT INTO public.student_balances (student_id, balance)
  VALUES (_student_id, 0)
  ON CONFLICT (student_id) DO NOTHING;
  
  SELECT balance INTO current_balance
  FROM public.student_balances
  WHERE student_id = _student_id;
  
  -- Обновляем баланс в зависимости от типа транзакции
  IF _transaction_type IN ('credit', 'transfer_in', 'refund') THEN
    -- Пополнение баланса
    UPDATE public.student_balances
    SET balance = balance + _amount,
        updated_at = now()
    WHERE student_id = _student_id;
  ELSIF _transaction_type = 'debit' THEN
    -- Списание с баланса
    IF current_balance < _amount THEN
      RAISE EXCEPTION 'Недостаточно средств на балансе';
    END IF;
    
    UPDATE public.student_balances
    SET balance = balance - _amount,
        updated_at = now()
    WHERE student_id = _student_id;
  END IF;
  
  -- Записываем транзакцию
  INSERT INTO public.balance_transactions (
    student_id,
    amount,
    transaction_type,
    description,
    payment_id,
    lesson_session_id
  ) VALUES (
    _student_id,
    _amount,
    _transaction_type,
    _description,
    _payment_id,
    _lesson_session_id
  );
END;
$$;

-- Функция для получения баланса студента
CREATE OR REPLACE FUNCTION public.get_student_balance(_student_id uuid)
RETURNS TABLE (
  student_id uuid,
  balance numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT student_id, balance, created_at, updated_at
  FROM public.student_balances
  WHERE student_id = _student_id;
$$;

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_student_balances_student_id ON public.student_balances(student_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_student_id ON public.balance_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_at ON public.balance_transactions(created_at DESC);