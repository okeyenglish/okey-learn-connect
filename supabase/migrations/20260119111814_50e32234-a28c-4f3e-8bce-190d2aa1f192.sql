-- Добавляем поле client_id в online_payments для выставления счетов клиентам
ALTER TABLE public.online_payments 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

-- Делаем student_id опциональным (если ещё не было сделано)
ALTER TABLE public.online_payments 
ALTER COLUMN student_id DROP NOT NULL;

-- Добавляем индекс для client_id
CREATE INDEX IF NOT EXISTS idx_online_payments_client_id ON public.online_payments(client_id);

-- Комментарий для документации
COMMENT ON COLUMN public.online_payments.client_id IS 'ID клиента, которому выставлен счёт (альтернатива student_id для CRM)';