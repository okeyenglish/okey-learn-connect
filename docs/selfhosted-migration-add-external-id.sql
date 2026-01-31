-- Migration: Add external_id column to students table
-- This column stores the HoliHope ID (e.g., 39748) for correct profile links
-- Apply this manually to self-hosted Supabase at api.academyos.ru

-- Step 1: Add external_id column
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Step 2: Create unique index per organization (allows same external_id in different orgs)
CREATE UNIQUE INDEX IF NOT EXISTS students_external_id_org_unique 
ON public.students(external_id, organization_id) WHERE external_id IS NOT NULL;

-- Step 3: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_external_id 
ON public.students(external_id);

-- Step 4: Update RPC function to return external_id
CREATE OR REPLACE FUNCTION public.get_family_data_optimized(p_family_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_organization_id uuid;
BEGIN
  -- Get organization_id for security check
  SELECT organization_id INTO v_organization_id
  FROM family_groups
  WHERE id = p_family_group_id;

  IF v_organization_id IS NULL THEN
    RETURN jsonb_build_object(
      'family_group', NULL,
      'members', '[]'::jsonb,
      'students', '[]'::jsonb
    );
  END IF;

  SELECT jsonb_build_object(
    'family_group', (
      SELECT jsonb_build_object(
        'id', fg.id,
        'name', fg.name,
        'branch', fg.branch,
        'created_at', fg.created_at
      )
      FROM family_groups fg
      WHERE fg.id = p_family_group_id
    ),
    'members', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', fm.id,
          'client_id', c.id,
          'client_number', c.client_number,
          'name', COALESCE(c.name, c.first_name || ' ' || COALESCE(c.last_name, '')),
          'phone', c.phone,
          'email', c.email,
          'branch', c.branch,
          'avatar_url', c.avatar_url,
          'relationship_type', fm.relationship_type,
          'is_primary_contact', fm.is_primary_contact,
          'telegram_chat_id', c.telegram_chat_id,
          'telegram_user_id', c.telegram_user_id,
          'whatsapp_chat_id', c.whatsapp_chat_id,
          'max_chat_id', c.max_chat_id,
          'phone_numbers', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', cpn.id,
                'phone', cpn.phone,
                'phone_type', cpn.phone_type,
                'is_primary', cpn.is_primary,
                'is_whatsapp_enabled', cpn.is_whatsapp_enabled,
                'is_telegram_enabled', cpn.is_telegram_enabled,
                'whatsapp_avatar_url', cpn.whatsapp_avatar_url,
                'telegram_avatar_url', cpn.telegram_avatar_url,
                'whatsapp_chat_id', cpn.whatsapp_chat_id,
                'telegram_chat_id', cpn.telegram_chat_id,
                'telegram_user_id', cpn.telegram_user_id,
                'max_chat_id', cpn.max_chat_id,
                'max_avatar_url', cpn.max_avatar_url
              )
            )
            FROM client_phone_numbers cpn
            WHERE cpn.client_id = c.id
          ), '[]'::jsonb)
        )
      )
      FROM family_members fm
      JOIN clients c ON c.id = fm.client_id
      WHERE fm.family_group_id = p_family_group_id
    ), '[]'::jsonb),
    'students', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'student_number', s.student_number,
          'external_id', s.external_id,
          'first_name', s.first_name,
          'last_name', s.last_name,
          'middle_name', s.middle_name,
          'date_of_birth', s.birth_date,
          'avatar_url', s.avatar_url,
          'is_active', COALESCE(s.status = 'active', s.is_active, false),
          'group_courses', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'group_id', lg.id,
                'group_name', lg.name,
                'subject', lg.subject,
                'is_active', lg.is_active,
                'next_lesson', (
                  SELECT jsonb_build_object(
                    'lesson_date', ls.lesson_date,
                    'start_time', ls.start_time
                  )
                  FROM lesson_sessions ls
                  WHERE ls.group_id = lg.id
                    AND ls.lesson_date >= CURRENT_DATE
                    AND ls.status != 'cancelled'
                  ORDER BY ls.lesson_date, ls.start_time
                  LIMIT 1
                )
              )
            )
            FROM group_students gs
            JOIN learning_groups lg ON lg.id = gs.group_id
            WHERE gs.student_id = s.id
          ), '[]'::jsonb),
          'individual_courses', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'course_id', ic.id,
                'course_name', ic.course_name || ' (инд.)',
                'subject', ic.subject,
                'is_active', ic.is_active,
                'next_lesson', (
                  SELECT jsonb_build_object(
                    'lesson_date', il.lesson_date,
                    'start_time', il.start_time
                  )
                  FROM individual_lessons il
                  WHERE il.individual_course_id = ic.id
                    AND il.lesson_date >= CURRENT_DATE
                    AND il.status != 'cancelled'
                  ORDER BY il.lesson_date, il.start_time
                  LIMIT 1
                )
              )
            )
            FROM individual_courses ic
            WHERE ic.student_id = s.id
          ), '[]'::jsonb)
        )
      )
      FROM students s
      WHERE s.family_group_id = p_family_group_id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_family_data_optimized(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_data_optimized(uuid) TO anon;
