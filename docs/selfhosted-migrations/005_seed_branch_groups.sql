-- =====================================================
-- Migration: Seed branch groups and add existing employees
-- For self-hosted Supabase (api.academyos.ru)
-- Run AFTER 003_staff_group_chats.sql
-- =====================================================

-- This script:
-- 1. Creates a group for each unique branch in profiles
-- 2. Adds all employees to their respective branch groups

-- Step 1: Insert branch groups for each unique branch
-- (Uses ON CONFLICT to skip existing groups)
INSERT INTO public.staff_group_chats (
  name,
  description,
  organization_id,
  branch_name,
  is_branch_group
)
SELECT DISTINCT
  p.branch || ' - Команда' AS name,
  'Групповой чат филиала ' || p.branch AS description,
  p.organization_id,
  p.branch AS branch_name,
  true AS is_branch_group
FROM public.profiles p
WHERE p.branch IS NOT NULL 
  AND p.branch != ''
  AND p.organization_id IS NOT NULL
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.staff_group_chats sgc
    WHERE sgc.organization_id = p.organization_id
    AND sgc.branch_name = p.branch
    AND sgc.is_branch_group = true
  );

-- Step 2: Add employees to their branch groups
-- (Uses ON CONFLICT to skip existing memberships)
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
INNER JOIN public.staff_group_chats sgc 
  ON sgc.branch_name = p.branch 
  AND sgc.organization_id = p.organization_id
  AND sgc.is_branch_group = true
WHERE p.branch IS NOT NULL 
  AND p.branch != ''
  AND p.organization_id IS NOT NULL
  AND p.is_active = true
ON CONFLICT (group_chat_id, user_id) DO NOTHING;

-- =====================================================
-- Verification queries (run after migration)
-- =====================================================

-- Check created branch groups:
-- SELECT name, branch_name, organization_id FROM public.staff_group_chats WHERE is_branch_group = true;

-- Check member counts per group:
-- SELECT sgc.name, sgc.branch_name, COUNT(m.user_id) as member_count
-- FROM public.staff_group_chats sgc
-- LEFT JOIN public.staff_group_chat_members m ON m.group_chat_id = sgc.id
-- WHERE sgc.is_branch_group = true
-- GROUP BY sgc.id, sgc.name, sgc.branch_name
-- ORDER BY member_count DESC;

-- Check employees and their group membership:
-- SELECT p.first_name, p.last_name, p.branch, sgc.name as group_name
-- FROM public.profiles p
-- LEFT JOIN public.staff_group_chat_members m ON m.user_id = p.id
-- LEFT JOIN public.staff_group_chats sgc ON sgc.id = m.group_chat_id AND sgc.is_branch_group = true
-- WHERE p.is_active = true AND p.branch IS NOT NULL
-- ORDER BY p.branch, p.first_name;
