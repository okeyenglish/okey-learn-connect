-- Add branch column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch TEXT;

-- Add branch column to clients table  
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS branch TEXT;

-- Add branch column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS branch TEXT;

-- Add branch column to family_groups table
ALTER TABLE public.family_groups ADD COLUMN IF NOT EXISTS branch TEXT;

-- Create manager_branches table for additional branch access
CREATE TABLE IF NOT EXISTS public.manager_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, branch)
);

-- Create typing_status table
CREATE TABLE IF NOT EXISTS public.typing_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);

-- Enable RLS on new tables
ALTER TABLE public.manager_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for manager_branches
CREATE POLICY "Users can view their own additional branches" 
ON public.manager_branches 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own additional branches" 
ON public.manager_branches 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS policies for typing_status
CREATE POLICY "Users can view typing status for accessible clients" 
ON public.typing_status 
FOR SELECT 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c 
    INNER JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE c.branch = p.branch 
    OR c.branch IN (
      SELECT mb.branch FROM public.manager_branches mb 
      WHERE mb.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage typing status for accessible clients" 
ON public.typing_status 
FOR ALL 
USING (
  auth.uid() = user_id 
  AND client_id IN (
    SELECT c.id FROM public.clients c 
    INNER JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE c.branch = p.branch 
    OR c.branch IN (
      SELECT mb.branch FROM public.manager_branches mb 
      WHERE mb.user_id = auth.uid()
    )
  )
);

-- Function to get user's accessible branches
CREATE OR REPLACE FUNCTION public.get_user_branches(user_uuid UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_branches TEXT[];
BEGIN
  -- Get user's primary branch and additional branches
  SELECT array_agg(DISTINCT branch) INTO user_branches
  FROM (
    SELECT p.branch 
    FROM public.profiles p 
    WHERE p.user_id = user_uuid AND p.branch IS NOT NULL
    UNION
    SELECT mb.branch 
    FROM public.manager_branches mb 
    WHERE mb.user_id = user_uuid
  ) branches;
  
  RETURN COALESCE(user_branches, ARRAY[]::TEXT[]);
END;
$$;

-- Function to check if user can access branch
CREATE OR REPLACE FUNCTION public.can_access_branch(user_uuid UUID, target_branch TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN target_branch = ANY(public.get_user_branches(user_uuid));
END;
$$;

-- Trigger function to automatically clear old typing status
CREATE OR REPLACE FUNCTION public.cleanup_typing_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete typing status older than 5 minutes
  DELETE FROM public.typing_status 
  WHERE updated_at < NOW() - INTERVAL '5 minutes';
  
  RETURN NULL;
END;
$$;

-- Create trigger to cleanup old typing status on insert/update
DROP TRIGGER IF EXISTS cleanup_typing_status_trigger ON public.typing_status;
CREATE TRIGGER cleanup_typing_status_trigger
  AFTER INSERT OR UPDATE ON public.typing_status
  EXECUTE FUNCTION public.cleanup_typing_status();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_manager_branches_user_id ON public.manager_branches(user_id);
CREATE INDEX IF NOT EXISTS idx_manager_branches_branch ON public.manager_branches(branch);
CREATE INDEX IF NOT EXISTS idx_typing_status_client_id ON public.typing_status(client_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_user_id ON public.typing_status(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_updated_at ON public.typing_status(updated_at);

-- Enable realtime for typing_status table
ALTER TABLE public.typing_status REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;