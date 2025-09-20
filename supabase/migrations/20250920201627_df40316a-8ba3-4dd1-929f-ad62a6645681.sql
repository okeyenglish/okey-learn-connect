-- Создать таблицу для хранения состояний чатов
CREATE TABLE public.chat_states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  chat_id text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  is_unread boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, chat_id)
);

-- Enable RLS
ALTER TABLE public.chat_states ENABLE ROW LEVEL SECURITY;

-- Create policies for chat states
CREATE POLICY "Users can view their own chat states" 
ON public.chat_states 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat states" 
ON public.chat_states 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat states" 
ON public.chat_states 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat states" 
ON public.chat_states 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_chat_states_updated_at
BEFORE UPDATE ON public.chat_states
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();