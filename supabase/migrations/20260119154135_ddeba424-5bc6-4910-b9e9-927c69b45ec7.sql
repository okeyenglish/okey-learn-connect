-- Исправляем RPC функцию: убираем teacher_id (не существует в individual_lessons)
CREATE OR REPLACE FUNCTION get_family_data_optimized(p_family_group_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'family_group', (
      SELECT json_build_object(
        'id', fg.id,
        'name', fg.name,
        'branch', fg.branch,
        'created_at', fg.created_at
      )
      FROM family_groups fg 
      WHERE fg.id = p_family_group_id
    ),
    'members', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', fm.id,
          'client_id', c.id,
          'client_number', c.client_number,
          'name', c.name,
          'phone', c.phone,
          'email', c.email,
          'avatar_url', c.avatar_url,
          'relationship_type', fm.relationship_type,
          'is_primary_contact', fm.is_primary_contact,
          'phone_numbers', COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', cpn.id,
                'phone', cpn.phone,
                'phone_type', cpn.phone_type,
                'is_primary', cpn.is_primary,
                'is_whatsapp_enabled', cpn.is_whatsapp_enabled,
                'is_telegram_enabled', cpn.is_telegram_enabled,
                'whatsapp_avatar_url', cpn.whatsapp_avatar_url,
                'telegram_avatar_url', cpn.telegram_avatar_url
              )
            )
            FROM client_phone_numbers cpn 
            WHERE cpn.client_id = c.id),
            '[]'::json
          )
        )
      )
      FROM family_members fm
      JOIN clients c ON fm.client_id = c.id
      WHERE fm.family_group_id = p_family_group_id
    ), '[]'::json),
    'students', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', s.id,
          'first_name', s.first_name,
          'last_name', s.last_name,
          'middle_name', s.middle_name,
          'date_of_birth', s.date_of_birth,
          'avatar_url', s.avatar_url,
          'is_active', s.status = 'active',
          'group_courses', COALESCE(
            (SELECT json_agg(
              json_build_object(
                'group_id', lg.id,
                'group_name', lg.name,
                'subject', lg.subject,
                'is_active', gs.status = 'active' AND lg.status = 'active',
                'next_lesson', (
                  SELECT json_build_object(
                    'lesson_date', ls.lesson_date,
                    'start_time', ls.start_time
                  )
                  FROM lesson_sessions ls
                  WHERE ls.group_id = lg.id 
                    AND ls.lesson_date >= CURRENT_DATE
                    AND ls.status = 'scheduled'
                  ORDER BY ls.lesson_date, ls.start_time
                  LIMIT 1
                )
              )
            )
            FROM group_students gs
            JOIN learning_groups lg ON gs.group_id = lg.id
            WHERE gs.student_id = s.id),
            '[]'::json
          ),
          'individual_courses', COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', il.id,
                'subject', il.subject,
                'price_per_lesson', il.price_per_lesson,
                'is_active', il.is_active AND il.status != 'finished',
                'teacher_name', il.teacher_name
              )
            )
            FROM individual_lessons il 
            WHERE il.student_id = s.id),
            '[]'::json
          )
        )
      )
      FROM students s
      WHERE s.family_group_id = p_family_group_id
    ), '[]'::json)
  ) INTO result;
  
  RETURN result;
END;
$$;