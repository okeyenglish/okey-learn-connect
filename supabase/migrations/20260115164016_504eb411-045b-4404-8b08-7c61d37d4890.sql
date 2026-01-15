-- Create function for batch updating salebot_client_id
CREATE OR REPLACE FUNCTION public.batch_update_salebot_ids(
  p_client_ids UUID[],
  p_salebot_ids BIGINT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE clients c
  SET salebot_client_id = data.salebot_id
  FROM (
    SELECT 
      unnest(p_client_ids) as client_id,
      unnest(p_salebot_ids) as salebot_id
  ) data
  WHERE c.id = data.client_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;