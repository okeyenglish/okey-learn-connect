-- Create webhook_logs table for storing all webhook events (only if doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'webhook_logs') THEN
        CREATE TABLE public.webhook_logs (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          source TEXT NOT NULL,
          event_type TEXT NOT NULL,
          payload JSONB NOT NULL DEFAULT '{}',
          received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          processed_at TIMESTAMP WITH TIME ZONE,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );

        -- Enable RLS
        ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

        -- Create index for better performance
        CREATE INDEX idx_webhook_logs_source_event ON public.webhook_logs(source, event_type);
        CREATE INDEX idx_webhook_logs_received_at ON public.webhook_logs(received_at DESC);
    END IF;
END $$;