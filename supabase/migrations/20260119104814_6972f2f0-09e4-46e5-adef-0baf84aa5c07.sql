-- Таблица терминалов оплаты (для организаций и филиалов)
CREATE TABLE public.payment_terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES organization_branches(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'tbank',
  terminal_key TEXT NOT NULL,
  terminal_password TEXT NOT NULL,
  is_test_mode BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, branch_id, provider)
);

-- Таблица онлайн-платежей для отслеживания статусов Т-Банка
CREATE TABLE public.online_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  terminal_id UUID NOT NULL REFERENCES payment_terminals(id),
  student_id UUID NOT NULL REFERENCES students(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  tbank_payment_id TEXT,
  order_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  payment_url TEXT,
  error_code TEXT,
  error_message TEXT,
  description TEXT,
  raw_request JSONB,
  raw_response JSONB,
  notification_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX idx_payment_terminals_org ON payment_terminals(organization_id);
CREATE INDEX idx_payment_terminals_branch ON payment_terminals(branch_id);
CREATE INDEX idx_online_payments_payment ON online_payments(payment_id);
CREATE INDEX idx_online_payments_order ON online_payments(order_id);
CREATE INDEX idx_online_payments_status ON online_payments(status);
CREATE INDEX idx_online_payments_student ON online_payments(student_id);

-- RLS для payment_terminals
ALTER TABLE payment_terminals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view terminals of their organization"
ON payment_terminals FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage terminals of their organization"
ON payment_terminals FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- RLS для online_payments
ALTER TABLE online_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view online payments of their organization"
ON online_payments FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role can manage online payments"
ON online_payments FOR ALL
USING (true)
WITH CHECK (true);

-- Триггеры обновления updated_at
CREATE TRIGGER update_payment_terminals_updated_at
BEFORE UPDATE ON payment_terminals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_online_payments_updated_at
BEFORE UPDATE ON online_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();