-- Migration: Remove student_agents table and fix family linking logic
-- Agents ARE clients (parents/contacts), not separate entities

-- Drop student_agents table - it's redundant
DROP TABLE IF EXISTS public.student_agents CASCADE;

-- Also drop student_extra_fields as it's better to use JSONB in students table
DROP TABLE IF EXISTS public.student_extra_fields CASCADE;

-- Add extra_fields JSONB column to students if not exists
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS extra_fields JSONB DEFAULT '{}'::jsonb;