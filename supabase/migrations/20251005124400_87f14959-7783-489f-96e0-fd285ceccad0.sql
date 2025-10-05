-- Создаем таблицу для хранения цен на курсы
CREATE TABLE IF NOT EXISTS public.course_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name TEXT NOT NULL UNIQUE,
  price_per_40_min NUMERIC NOT NULL,
  price_per_academic_hour NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.course_prices ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Authenticated users can view course prices"
  ON public.course_prices
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and methodists can manage course prices"
  ON public.course_prices
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'methodist'::app_role));

-- Создаем триггер для автоматического обновления updated_at
CREATE TRIGGER update_course_prices_updated_at
  BEFORE UPDATE ON public.course_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Вставляем начальные данные из существующего прайс-листа
INSERT INTO public.course_prices (course_name, price_per_40_min, price_per_academic_hour) VALUES
  ('super safari 1', 1250, 833),
  ('super safari 2', 1250, 833),
  ('super safari 3', 2000, 1000),
  ('kid''s box 1', 1500, 750),
  ('kid''s box 2', 1500, 750),
  ('kid''s box 3', 1500, 750),
  ('kid''s box 4', 1500, 750),
  ('kid''s box 5', 1500, 750),
  ('kid''s box 6', 1500, 750),
  ('prepare 1', 1750, 875),
  ('prepare 2', 1750, 875),
  ('prepare 3', 1750, 875),
  ('prepare 4', 1750, 875),
  ('prepare 5', 1750, 875),
  ('prepare 6', 1750, 875),
  ('prepare 7', 1750, 875),
  ('empower a1', 1750, 875),
  ('empower a2', 1750, 875),
  ('empower b1', 1750, 875),
  ('empower b1+', 1750, 875),
  ('empower b2', 1750, 875),
  ('empower c1', 1750, 875)
ON CONFLICT (course_name) DO NOTHING;