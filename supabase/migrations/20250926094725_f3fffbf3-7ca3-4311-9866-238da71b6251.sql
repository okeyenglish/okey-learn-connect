-- Проверяем и создаем только недостающие типы и таблицы
DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('cash', 'card', 'bank_transfer', 'online');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE finance_payment_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE service_category_type AS ENUM ('individual', 'group', 'club', 'workshop', 'intensive', 'online');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Создаем таблицы только если их еще нет
CREATE TABLE IF NOT EXISTS public.price_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  branch TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  valid_from DATE,
  valid_until DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.price_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_category service_category_type NOT NULL DEFAULT 'individual',
  price NUMERIC NOT NULL,
  currency_id UUID REFERENCES public.currencies(id),
  unit TEXT NOT NULL DEFAULT 'урок',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS только если еще не включено
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'price_lists' AND relrowsecurity = true) THEN
        ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'price_list_items' AND relrowsecurity = true) THEN
        ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Создаем политики только если их еще нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'price_lists' AND policyname = 'Admins and managers can manage price lists from their branches') THEN
        EXECUTE 'CREATE POLICY "Admins and managers can manage price lists from their branches"
        ON public.price_lists
        FOR ALL
        USING (
          (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''branch_manager'') OR has_role(auth.uid(), ''manager'')) AND
          EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND (price_lists.branch = p.branch OR EXISTS (
              SELECT 1 FROM manager_branches mb 
              WHERE mb.manager_id = auth.uid() AND mb.branch = price_lists.branch
            ))
          )
        )';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'price_lists' AND policyname = 'Users can view price lists from their branches') THEN
        EXECUTE 'CREATE POLICY "Users can view price lists from their branches"
        ON public.price_lists
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND (price_lists.branch = p.branch OR EXISTS (
              SELECT 1 FROM manager_branches mb 
              WHERE mb.manager_id = auth.uid() AND mb.branch = price_lists.branch
            ))
          )
        )';
    END IF;
END $$;

-- Создаем индексы если их еще нет
CREATE INDEX IF NOT EXISTS idx_price_lists_branch ON public.price_lists(branch);
CREATE INDEX IF NOT EXISTS idx_price_list_items_price_list_id ON public.price_list_items(price_list_id);

-- Создаем триггеры для обновления updated_at если их еще нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_price_lists_updated_at') THEN
        CREATE TRIGGER update_price_lists_updated_at
        BEFORE UPDATE ON public.price_lists
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_price_list_items_updated_at') THEN
        CREATE TRIGGER update_price_list_items_updated_at
        BEFORE UPDATE ON public.price_list_items
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;