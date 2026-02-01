-- Migration: manager_quick_replies table for activity warnings and feedback
-- Apply to self-hosted Supabase (api.academyos.ru)
-- Date: 2026-02-01

-- Create table for quick reply suggestions
CREATE TABLE IF NOT EXISTS public.manager_quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'activity_warning', -- activity_warning, tab_feedback, etc.
  is_approved BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manager_quick_replies ENABLE ROW LEVEL SECURITY;

-- Policies: all authenticated users can read approved replies
CREATE POLICY "Users can read approved quick replies"
  ON public.manager_quick_replies
  FOR SELECT
  USING (is_approved = true OR auth.uid() = created_by);

-- Only admins can update/delete
CREATE POLICY "Admins can manage quick replies"
  ON public.manager_quick_replies
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own suggestions
CREATE POLICY "Users can suggest new quick replies"
  ON public.manager_quick_replies
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_manager_quick_replies_updated_at
  BEFORE UPDATE ON public.manager_quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default quick replies for activity warnings
INSERT INTO public.manager_quick_replies (text, category, is_approved, usage_count) VALUES
  ('Хорошо, исправлюсь', 'activity_warning', true, 0),
  ('У меня была консультация', 'activity_warning', true, 0),
  ('Работал с документами', 'activity_warning', true, 0),
  ('Был на звонке', 'activity_warning', true, 0)
ON CONFLICT DO NOTHING;

-- Insert default quick replies for tab feedback
INSERT INTO public.manager_quick_replies (text, category, is_approved, usage_count) VALUES
  ('Всё хорошо, работаю!', 'tab_feedback', true, 0),
  ('Был на перерыве', 'tab_feedback', true, 0),
  ('Работал в другой системе', 'tab_feedback', true, 0)
ON CONFLICT DO NOTHING;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
