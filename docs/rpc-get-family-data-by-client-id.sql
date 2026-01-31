-- RPC: get_family_data_by_client_id
-- Выполните этот SQL на self-hosted Supabase (api.academyos.ru)
-- Объединяет get_or_create_family_group_id + get_family_data_optimized в один вызов
-- Это сокращает время загрузки карточки клиента с ~400ms до ~200ms

CREATE OR REPLACE FUNCTION public.get_family_data_by_client_id(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_group_id uuid;
  v_client_phone text;
  v_client_name text;
  v_client_last_name text;
  v_group_name text;
  v_result jsonb;
BEGIN
  -- ============================================
  -- STEP 1: Get or create family group ID
  -- ============================================
  
  -- Check if client already has a family group
  SELECT family_group_id INTO v_family_group_id
  FROM family_members
  WHERE client_id = p_client_id
  LIMIT 1;

  IF v_family_group_id IS NULL THEN
    -- Get client info for phone matching and group naming
    SELECT phone, name, last_name 
    INTO v_client_phone, v_client_name, v_client_last_name
    FROM clients
    WHERE id = p_client_id;

    -- Try to find existing group by normalized phone
    IF v_client_phone IS NOT NULL AND v_client_phone != '' THEN
      SELECT fm.family_group_id INTO v_family_group_id
      FROM family_members fm
      JOIN clients c ON c.id = fm.client_id
      WHERE c.phone = v_client_phone
        AND fm.client_id != p_client_id
      LIMIT 1;

      IF v_family_group_id IS NOT NULL THEN
        -- Link client to existing group
        INSERT INTO family_members (family_group_id, client_id, relationship_type, is_primary_contact)
        VALUES (v_family_group_id, p_client_id, 'parent', false)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    -- If still no group, create new one
    IF v_family_group_id IS NULL THEN
      IF v_client_last_name IS NOT NULL AND v_client_last_name != '' THEN
        v_group_name := 'Семья ' || v_client_last_name;
      ELSIF v_client_name IS NOT NULL AND v_client_name != '' THEN
        v_group_name := 'Семья ' || split_part(v_client_name, ' ', 1);
      ELSE
        v_group_name := 'Семья клиента';
      END IF;

      INSERT INTO family_groups (name)
      VALUES (v_group_name)
      RETURNING id INTO v_family_group_id;

      -- Link client to new group as primary contact
      INSERT INTO family_members (family_group_id, client_id, relationship_type, is_primary_contact)
      VALUES (v_family_group_id, p_client_id, 'main', true);

      -- Ensure phone number exists in client_phone_numbers
      IF v_client_phone IS NOT NULL AND v_client_phone != '' THEN
        INSERT INTO client_phone_numbers (client_id, phone, is_primary)
        VALUES (p_client_id, v_client_phone, true)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- ============================================
  -- STEP 2: Get family data (same as get_family_data_optimized)
  -- ============================================
  
  SELECT jsonb_build_object(
    'family_group', (
      SELECT jsonb_build_object(
        'id', fg.id,
        'name', fg.name,
        'branch', fg.branch,
        'created_at', fg.created_at
      )
      FROM family_groups fg
      WHERE fg.id = v_family_group_id
    ),
    'members', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', fm.id,
          'client_id', fm.client_id,
          'client_number', c.client_number,
          'name', COALESCE(c.name, TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''))),
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
              ORDER BY cpn.is_primary DESC, cpn.created_at
            )
            FROM client_phone_numbers cpn
            WHERE cpn.client_id = c.id
          ), '[]'::jsonb)
        )
      )
      FROM family_members fm
      JOIN clients c ON c.id = fm.client_id
      WHERE fm.family_group_id = v_family_group_id
        AND (c.is_active IS NULL OR c.is_active = true)
    ), '[]'::jsonb),
    'students', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'student_number', s.student_number,
          'external_id', s.external_id,
          'holihope_id', s.holihope_metadata->>'Id',
          'first_name', s.first_name,
          'last_name', s.last_name,
          'middle_name', s.middle_name,
          'date_of_birth', s.date_of_birth,
          'avatar_url', s.avatar_url,
          'is_active', (s.status = 'active'),
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
              AND gs.is_active = true
          ), '[]'::jsonb),
          'individual_courses', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'course_id', il.id,
                'course_name', COALESCE(il.subject, 'Индивидуальные занятия'),
                'subject', il.subject,
                'is_active', il.is_active,
                'next_lesson', (
                  SELECT jsonb_build_object(
                    'lesson_date', ils.lesson_date,
                    'start_time', ils.start_time
                  )
                  FROM individual_lesson_sessions ils
                  WHERE ils.individual_lesson_id = il.id
                    AND ils.lesson_date >= CURRENT_DATE
                    AND ils.status != 'cancelled'
                  ORDER BY ils.lesson_date, ils.start_time
                  LIMIT 1
                )
              )
            )
            FROM individual_lessons il
            WHERE il.student_id = s.id
              AND il.is_active = true
          ), '[]'::jsonb)
        )
      )
      FROM students s
      WHERE s.family_group_id = v_family_group_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_family_data_by_client_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_data_by_client_id(uuid) TO service_role;

-- Usage example:
-- SELECT get_family_data_by_client_id('client-uuid-here');
