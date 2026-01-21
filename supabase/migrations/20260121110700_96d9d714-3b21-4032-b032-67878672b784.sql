
-- Merge Telegram-created duplicate clients back to their originals
-- Handles unique constraint on telegram_user_id by clearing it from duplicate first

DO $$
DECLARE
  v_record RECORD;
  v_merged_count INTEGER := 0;
BEGIN
  FOR v_record IN
    WITH telegram_clients AS (
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.telegram_user_id,
        c.telegram_chat_id,
        c.telegram_avatar_url
      FROM clients c
      WHERE c.telegram_user_id IS NOT NULL
        AND c.is_active = true
        AND (c.first_name IS NULL OR c.first_name = '' OR c.last_name IS NULL OR c.last_name = '')
    ),
    matches AS (
      SELECT DISTINCT ON (tc.id)
        tc.id as duplicate_id,
        tc.telegram_user_id,
        tc.telegram_chat_id,
        tc.telegram_avatar_url,
        c2.id as original_id
      FROM telegram_clients tc
      JOIN client_phone_numbers cpn ON 
        right(regexp_replace(cpn.phone, '\D', '', 'g'), 10) = right(regexp_replace(tc.phone, '\D', '', 'g'), 10)
      JOIN clients c2 ON c2.id = cpn.client_id 
        AND c2.id != tc.id 
        AND c2.is_active = true
        AND (c2.first_name IS NOT NULL AND c2.first_name != '' OR c2.last_name IS NOT NULL AND c2.last_name != '')
      ORDER BY tc.id, c2.created_at ASC
    )
    SELECT * FROM matches
  LOOP
    -- 1. Move all chat messages from duplicate to original
    UPDATE chat_messages 
    SET client_id = v_record.original_id 
    WHERE client_id = v_record.duplicate_id;
    
    -- 2. Move call logs
    UPDATE call_logs 
    SET client_id = v_record.original_id 
    WHERE client_id = v_record.duplicate_id;
    
    -- 3. Move call comments
    UPDATE call_comments 
    SET client_id = v_record.original_id 
    WHERE client_id = v_record.duplicate_id;
    
    -- 4. FIRST clear Telegram data from duplicate to avoid unique constraint
    UPDATE clients 
    SET telegram_user_id = NULL, telegram_chat_id = NULL, updated_at = now()
    WHERE id = v_record.duplicate_id;
    
    -- 5. NOW transfer Telegram data to original client (only if not already set)
    UPDATE clients 
    SET 
      telegram_user_id = CASE WHEN telegram_user_id IS NULL THEN v_record.telegram_user_id ELSE telegram_user_id END,
      telegram_chat_id = CASE WHEN telegram_chat_id IS NULL THEN v_record.telegram_chat_id ELSE telegram_chat_id END,
      telegram_avatar_url = COALESCE(telegram_avatar_url, v_record.telegram_avatar_url),
      updated_at = now()
    WHERE id = v_record.original_id
      AND telegram_user_id IS NULL; -- Only update if original doesn't have telegram
    
    -- 6. Update Telegram data on phone numbers
    UPDATE client_phone_numbers cpn_dup
    SET telegram_user_id = NULL, telegram_chat_id = NULL
    WHERE cpn_dup.client_id = v_record.duplicate_id;
    
    UPDATE client_phone_numbers cpn_orig
    SET 
      telegram_user_id = CASE WHEN cpn_orig.telegram_user_id IS NULL THEN v_record.telegram_user_id ELSE cpn_orig.telegram_user_id END,
      telegram_chat_id = CASE WHEN cpn_orig.telegram_chat_id IS NULL THEN v_record.telegram_chat_id ELSE cpn_orig.telegram_chat_id END,
      telegram_avatar_url = COALESCE(cpn_orig.telegram_avatar_url, v_record.telegram_avatar_url),
      is_telegram_enabled = true,
      updated_at = now()
    FROM client_phone_numbers cpn_dup
    WHERE cpn_orig.client_id = v_record.original_id
      AND cpn_dup.client_id = v_record.duplicate_id
      AND right(regexp_replace(cpn_orig.phone, '\D', '', 'g'), 10) = right(regexp_replace(cpn_dup.phone, '\D', '', 'g'), 10);
    
    -- 7. Delete phone numbers from duplicate
    DELETE FROM client_phone_numbers WHERE client_id = v_record.duplicate_id;
    
    -- 8. Delete client branches from duplicate
    DELETE FROM client_branches WHERE client_id = v_record.duplicate_id;
    
    -- 9. Deactivate the duplicate client
    UPDATE clients 
    SET is_active = false, updated_at = now() 
    WHERE id = v_record.duplicate_id;
    
    v_merged_count := v_merged_count + 1;
    RAISE NOTICE 'Merged duplicate % into original %', v_record.duplicate_id, v_record.original_id;
  END LOOP;
  
  RAISE NOTICE 'Total merged: % duplicates', v_merged_count;
END $$;
