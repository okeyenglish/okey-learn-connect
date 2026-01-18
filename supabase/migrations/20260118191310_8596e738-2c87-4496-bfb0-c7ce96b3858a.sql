-- Фаза 3: Система абонементов и пакетных цен (как в Hollihope)

-- 1. Создаём таблицу пакетов цен (абонементов)
CREATE TABLE IF NOT EXISTS price_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  
  -- Базовые параметры
  hours_count numeric NOT NULL,           -- Количество академических часов
  price numeric NOT NULL,                  -- Цена
  currency text DEFAULT 'RUB',
  
  -- Применимость
  branch text,                             -- Филиал (null = все)
  subject text,                            -- Предмет/курс (null = все)
  learning_type text,                      -- group/individual/both
  age_category_id uuid REFERENCES age_categories(id),
  
  -- Срок действия
  validity_days integer,                   -- Срок действия в днях (null = бессрочно)
  can_freeze boolean DEFAULT false,        -- Можно заморозить
  max_freeze_days integer DEFAULT 0,       -- Максимум дней заморозки
  
  -- Опции оплаты
  can_pay_partially boolean DEFAULT true,  -- Можно оплачивать частично
  min_payment_percent numeric DEFAULT 100, -- Минимальный процент оплаты
  
  -- Служебные
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  external_id text,
  holihope_metadata jsonb,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE price_packages IS 'Пакеты цен (абонементы) как в Hollihope';

-- RLS для price_packages
ALTER TABLE price_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view price packages" ON price_packages
  FOR SELECT USING (true);

CREATE POLICY "Users can manage price packages" ON price_packages
  FOR ALL USING (true);

-- 2. Добавляем поля в payments для связи с пакетами
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES price_packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS expires_at date,
ADD COLUMN IF NOT EXISTS is_frozen boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS frozen_at date,
ADD COLUMN IF NOT EXISTS freeze_days_used integer DEFAULT 0;

COMMENT ON COLUMN payments.package_id IS 'Ссылка на абонемент/пакет';
COMMENT ON COLUMN payments.expires_at IS 'Дата сгорания оплаты';
COMMENT ON COLUMN payments.is_frozen IS 'Оплата заморожена';
COMMENT ON COLUMN payments.frozen_at IS 'Дата начала заморозки';
COMMENT ON COLUMN payments.freeze_days_used IS 'Использовано дней заморозки';

-- 3. Создаём таблицу истории заморозок
CREATE TABLE IF NOT EXISTS payment_freezes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  freeze_start date NOT NULL,
  freeze_end date,
  days_count integer,
  reason text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE payment_freezes IS 'История заморозок оплат';

ALTER TABLE payment_freezes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view freezes" ON payment_freezes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage freezes" ON payment_freezes
  FOR ALL USING (true);

-- 4. Индексы
CREATE INDEX IF NOT EXISTS idx_price_packages_branch ON price_packages(branch) WHERE branch IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_price_packages_subject ON price_packages(subject) WHERE subject IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_price_packages_org ON price_packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_package ON payments(package_id) WHERE package_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_expires ON payments(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_freezes_payment ON payment_freezes(payment_id);