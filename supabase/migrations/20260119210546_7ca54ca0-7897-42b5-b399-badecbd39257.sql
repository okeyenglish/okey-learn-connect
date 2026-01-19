-- Fix get_teacher_unread_counts(): resolve PL/pgSQL output column ambiguity (teacher_id)

CREATE OR REPLACE FUNCTION public.get_teacher_unread_counts()
RETURNS TABLE (
  teacher_id UUID,
  client_id UUID,
  unread_count BIGINT,
  last_message_time TIMESTAMPTZ,
  last_message_text TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH teacher_phone AS (
    SELECT
      t.id AS tchr_id,
      CASE
        WHEN t.phone IS NULL OR t.phone = '' THEN NULL
        ELSE (
          CASE
            WHEN length(regexp_replace(t.phone, '\\D', '', 'g')) = 11
              AND left(regexp_replace(t.phone, '\\D', '', 'g'), 1) = '8'
              THEN '7' || right(regexp_replace(t.phone, '\\D', '', 'g'), 10)
            WHEN length(regexp_replace(t.phone, '\\D', '', 'g')) = 10
              THEN '7' || regexp_replace(t.phone, '\\D', '', 'g')
            ELSE regexp_replace(t.phone, '\\D', '', 'g')
          END
        )
      END AS t_phone
    FROM public.teachers t
    WHERE t.is_active = true
  ),
  candidates AS (
    SELECT
      tp.tchr_id,
      c.id AS client_id,
      -- normalized client phone
      (
        CASE
          WHEN c.phone IS NULL OR c.phone = '' THEN ''
          ELSE (
            CASE
              WHEN length(regexp_replace(c.phone, '\\D', '', 'g')) = 11
                AND left(regexp_replace(c.phone, '\\D', '', 'g'), 1) = '8'
                THEN '7' || right(regexp_replace(c.phone, '\\D', '', 'g'), 10)
              WHEN length(regexp_replace(c.phone, '\\D', '', 'g')) = 10
                THEN '7' || regexp_replace(c.phone, '\\D', '', 'g')
              ELSE regexp_replace(c.phone, '\\D', '', 'g')
            END
          )
        END
      ) AS c_phone_norm,
      -- normalized wa chat id (strip suffix and non-digits)
      (
        CASE
          WHEN c.whatsapp_chat_id IS NULL OR c.whatsapp_chat_id = '' THEN ''
          ELSE (
            CASE
              WHEN length(regexp_replace(regexp_replace(c.whatsapp_chat_id, '@.*$', ''), '\\D', '', 'g')) = 11
                AND left(regexp_replace(regexp_replace(c.whatsapp_chat_id, '@.*$', ''), '\\D', '', 'g'), 1) = '8'
                THEN '7' || right(regexp_replace(regexp_replace(c.whatsapp_chat_id, '@.*$', ''), '\\D', '', 'g'), 10)
              WHEN length(regexp_replace(regexp_replace(c.whatsapp_chat_id, '@.*$', ''), '\\D', '', 'g')) = 10
                THEN '7' || regexp_replace(regexp_replace(c.whatsapp_chat_id, '@.*$', ''), '\\D', '', 'g')
              ELSE regexp_replace(regexp_replace(c.whatsapp_chat_id, '@.*$', ''), '\\D', '', 'g')
            END
          )
        END
      ) AS c_wa_norm,
      c.telegram_chat_id,
      c.max_chat_id
    FROM teacher_phone tp
    JOIN public.clients c
      ON tp.t_phone IS NOT NULL
     AND (
       -- normalized phone match
       (
         CASE
           WHEN c.phone IS NULL OR c.phone = '' THEN NULL
           ELSE (
             CASE
               WHEN length(regexp_replace(c.phone, '\\D', '', 'g')) = 11
                 AND left(regexp_replace(c.phone, '\\D', '', 'g'), 1) = '8'
                 THEN '7' || right(regexp_replace(c.phone, '\\D', '', 'g'), 10)
               WHEN length(regexp_replace(c.phone, '\\D', '', 'g')) = 10
                 THEN '7' || regexp_replace(c.phone, '\\D', '', 'g')
               ELSE regexp_replace(c.phone, '\\D', '', 'g')
             END
           )
         END
       ) = tp.t_phone
       OR (
         CASE
           WHEN c.whatsapp_chat_id IS NULL OR c.whatsapp_chat_id = '' THEN NULL
           ELSE (
             CASE
               WHEN length(regexp_replace(regexp_replace(c.whatsapp_chat_id, '@.*$', ''), '\\D', '', 'g')) = 11
                 AND left(regexp_replace(regexp_replace(c.whatsapp_chat_id, '@.*$', ''), '\\D', '', 'g'), 1) = '8'
                 THEN '7' || right(regexp_replace(regexp_replace(c.whatsapp_chat_id, '@.*$', ''), '\\D', '', 'g'), 10)
               WHEN length(regexp_replace(regexp_replace(c.whatsapp_chat_id, '@.*$', ''), '\\D', '', 'g')) = 10
                 THEN '7' || regexp_replace(regexp_replace(c.whatsapp_chat_id, '@.*$', ''), '\\D', '', 'g')
               ELSE regexp_replace(regexp_replace(c.whatsapp_chat_id, '@.*$', ''), '\\D', '', 'g')
             END
           )
         END
       ) = tp.t_phone
       -- legacy: some chat_id fields may store phone
       OR c.telegram_chat_id = tp.t_phone
       OR c.max_chat_id = tp.t_phone
     )
  ),
  candidate_stats AS (
    SELECT
      cand.tchr_id,
      cand.client_id,
      (cand.c_wa_norm = tp.t_phone) AS match_whatsapp,
      (cand.c_phone_norm = tp.t_phone) AS match_phone,
      (SELECT count(*) FROM public.chat_messages cm WHERE cm.client_id = cand.client_id) AS msg_count,
      (SELECT max(cm.created_at) FROM public.chat_messages cm WHERE cm.client_id = cand.client_id) AS last_at,
      (SELECT count(*)
         FROM public.chat_messages cm
        WHERE cm.client_id = cand.client_id
          AND cm.is_read = false
          AND cm.is_outgoing = false
      ) AS unread_cnt,
      (SELECT cm.message_text
         FROM public.chat_messages cm
        WHERE cm.client_id = cand.client_id
        ORDER BY cm.created_at DESC
        LIMIT 1
      ) AS last_text
    FROM candidates cand
    JOIN teacher_phone tp ON tp.tchr_id = cand.tchr_id
  ),
  best AS (
    SELECT DISTINCT ON (cs.tchr_id)
      cs.tchr_id,
      cs.client_id,
      cs.unread_cnt::BIGINT AS unread_count,
      cs.last_at AS last_message_time,
      cs.last_text AS last_message_text
    FROM candidate_stats cs
    ORDER BY cs.tchr_id,
      (cs.msg_count > 0) DESC,
      cs.last_at DESC NULLS LAST,
      cs.match_whatsapp DESC,
      cs.match_phone DESC,
      cs.client_id
  )
  SELECT
    t.id AS teacher_id,
    b.client_id,
    COALESCE(b.unread_count, 0)::BIGINT AS unread_count,
    b.last_message_time,
    b.last_message_text
  FROM public.teachers t
  LEFT JOIN best b ON b.tchr_id = t.id
  WHERE t.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_unread_counts() TO authenticated;
