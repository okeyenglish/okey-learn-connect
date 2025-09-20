-- Добавляем поддержку интеграции с мессенджерами

-- Создаем перечисление для типов мессенджеров
CREATE TYPE public.messenger_type AS ENUM ('whatsapp', 'telegram', 'system');

-- Создаем перечисление для статусов сообщений
CREATE TYPE public.message_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed', 'noAccount');

-- Добавляем поля в таблицу clients для интеграции с мессенджерами
ALTER TABLE public.clients 
ADD COLUMN whatsapp_chat_id TEXT,
ADD COLUMN telegram_chat_id TEXT,
ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Обновляем таблицу chat_messages для поддержки мессенджеров
ALTER TABLE public.chat_messages 
ADD COLUMN messenger_type messenger_type DEFAULT 'system',
ADD COLUMN message_status message_status DEFAULT 'sent',
ADD COLUMN webhook_id TEXT,
ADD COLUMN green_api_message_id TEXT,
ADD COLUMN is_outgoing BOOLEAN DEFAULT false,
ADD COLUMN file_url TEXT,
ADD COLUMN file_name TEXT,
ADD COLUMN file_type TEXT;

-- Создаем таблицу для настроек мессенджеров
CREATE TABLE public.messenger_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  messenger_type messenger_type NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  settings JSONB DEFAULT '{}',
  webhook_url TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(messenger_type)
);

-- Включаем RLS для новой таблицы
ALTER TABLE public.messenger_settings ENABLE ROW LEVEL SECURITY;

-- Создаем политики для messenger_settings
CREATE POLICY "Service role can manage messenger settings"
ON public.messenger_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- Создаем таблицу для логирования webhook событий
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  messenger_type messenger_type NOT NULL,
  event_type TEXT NOT NULL,
  webhook_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS для webhook_logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Создаем политики для webhook_logs
CREATE POLICY "Service role can manage webhook logs"
ON public.webhook_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Добавляем триггер обновления timestamp для messenger_settings
CREATE TRIGGER update_messenger_settings_updated_at
  BEFORE UPDATE ON public.messenger_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Создаем индексы для оптимизации
CREATE INDEX idx_clients_whatsapp_chat_id ON public.clients(whatsapp_chat_id) WHERE whatsapp_chat_id IS NOT NULL;
CREATE INDEX idx_clients_telegram_chat_id ON public.clients(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE INDEX idx_chat_messages_messenger_type ON public.chat_messages(messenger_type);
CREATE INDEX idx_chat_messages_green_api_message_id ON public.chat_messages(green_api_message_id) WHERE green_api_message_id IS NOT NULL;
CREATE INDEX idx_webhook_logs_processed ON public.webhook_logs(processed, created_at);

-- Обновляем существующие сообщения для совместимости
UPDATE public.chat_messages 
SET messenger_type = 'system', 
    is_outgoing = CASE 
      WHEN message_type = 'client' THEN false 
      ELSE true 
    END;