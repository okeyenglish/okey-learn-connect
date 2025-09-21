-- Make client_id nullable in tasks table to allow tasks without clients
ALTER TABLE public.tasks 
ALTER COLUMN client_id DROP NOT NULL;

-- Add due_time column for more precise scheduling
ALTER TABLE public.tasks 
ADD COLUMN due_time time DEFAULT NULL;

-- Add comment to clarify the change
COMMENT ON COLUMN public.tasks.client_id IS 'Client associated with the task - can be null for general tasks';
COMMENT ON COLUMN public.tasks.due_time IS 'Specific time for the task within the due date (09:00-21:00)';