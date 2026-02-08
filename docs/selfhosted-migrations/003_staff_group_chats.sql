-- Migration: Create staff_group_chats tables for branch-based staff groups
-- For self-hosted Supabase (api.academyos.ru)
-- Run this on the self-hosted database

-- Create staff_group_chats table for branch-based staff group chats
CREATE TABLE IF NOT EXISTS public.staff_group_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  organization_id uuid NOT NULL,
  branch_id uuid,
  branch_name text,
  is_branch_group boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create staff_group_chat_members table
CREATE TABLE IF NOT EXISTS public.staff_group_chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id uuid NOT NULL REFERENCES public.staff_group_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_chat_id, user_id)
);

-- Enable RLS
ALTER TABLE public.staff_group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_group_chat_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_group_chats
CREATE POLICY "Users can view group chats in their org"
  ON public.staff_group_chats
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage group chats"
  ON public.staff_group_chats
  FOR ALL
  USING (public.is_admin());

-- RLS policies for staff_group_chat_members
CREATE POLICY "Users can view group memberships in their org"
  ON public.staff_group_chat_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_group_chats sgc
      WHERE sgc.id = group_chat_id
      AND sgc.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can manage own membership"
  ON public.staff_group_chat_members
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all memberships"
  ON public.staff_group_chat_members
  FOR ALL
  USING (public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_staff_group_chats_updated_at
  BEFORE UPDATE ON public.staff_group_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_staff_group_chats_org_branch 
  ON public.staff_group_chats(organization_id, branch_name);
CREATE INDEX IF NOT EXISTS idx_staff_group_chat_members_user 
  ON public.staff_group_chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_group_chat_members_group 
  ON public.staff_group_chat_members(group_chat_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_group_chat_members;

-- Grant service role full access (for Edge Functions)
GRANT ALL ON public.staff_group_chats TO service_role;
GRANT ALL ON public.staff_group_chat_members TO service_role;
