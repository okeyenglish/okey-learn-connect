-- RPC: get_or_create_family_group_id
-- Выполните этот SQL на self-hosted Supabase (api.academyos.ru)
-- Заменяет 5-7 последовательных запросов одним вызовом

CREATE OR REPLACE FUNCTION public.get_or_create_family_group_id(p_client_id uuid)
RETURNS uuid
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
BEGIN
  -- Step 1: Check if client already has a family group
  SELECT family_group_id INTO v_family_group_id
  FROM family_members
  WHERE client_id = p_client_id
  LIMIT 1;

  IF v_family_group_id IS NOT NULL THEN
    RETURN v_family_group_id;
  END IF;

  -- Step 2: Get client info for phone matching and group naming
  SELECT phone, name, last_name 
  INTO v_client_phone, v_client_name, v_client_last_name
  FROM clients
  WHERE id = p_client_id;

  -- Step 3: Try to find existing group by normalized phone
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
      
      RETURN v_family_group_id;
    END IF;
  END IF;

  -- Step 4: Create new family group
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

  -- Step 5: Link client to new group as primary contact
  INSERT INTO family_members (family_group_id, client_id, relationship_type, is_primary_contact)
  VALUES (v_family_group_id, p_client_id, 'main', true);

  -- Step 6: Ensure phone number exists in client_phone_numbers
  IF v_client_phone IS NOT NULL AND v_client_phone != '' THEN
    INSERT INTO client_phone_numbers (client_id, phone, is_primary)
    VALUES (p_client_id, v_client_phone, true)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_family_group_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_or_create_family_group_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_family_group_id(uuid) TO service_role;
