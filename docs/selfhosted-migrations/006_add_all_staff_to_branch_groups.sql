-- =====================================================
-- Migration: Add ALL employees to ALL branch groups
-- For self-hosted Supabase (api.academyos.ru)
-- Run AFTER 005_seed_branch_groups.sql
-- =====================================================

-- This script ensures ALL active employees see ALL branch groups
-- by adding them as members to every branch group in their organization

-- Add all active employees to all branch groups in their organization
INSERT INTO public.staff_group_chat_members (
  group_chat_id,
  user_id,
  role
)
SELECT 
  sgc.id AS group_chat_id,
  p.id AS user_id,
  'member' AS role
FROM public.profiles p
CROSS JOIN public.staff_group_chats sgc
WHERE sgc.is_branch_group = true
  AND sgc.organization_id = p.organization_id
  AND p.organization_id IS NOT NULL
  AND p.is_active = true
ON CONFLICT (group_chat_id, user_id) DO NOTHING;

-- =====================================================
-- Verification queries (run after migration)
-- =====================================================

-- Check member counts per group (should be equal to total active employees):
-- SELECT sgc.name, sgc.branch_name, COUNT(m.user_id) as member_count
-- FROM public.staff_group_chats sgc
-- LEFT JOIN public.staff_group_chat_members m ON m.group_chat_id = sgc.id
-- WHERE sgc.is_branch_group = true
-- GROUP BY sgc.id, sgc.name, sgc.branch_name
-- ORDER BY member_count DESC;

-- Check total active employees in organization:
-- SELECT COUNT(*) FROM public.profiles WHERE is_active = true AND organization_id IS NOT NULL;
