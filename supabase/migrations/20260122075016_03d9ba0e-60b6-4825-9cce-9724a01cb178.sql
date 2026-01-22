-- Delete old duplicate push subscriptions, keep only the latest one per user
DELETE FROM push_subscriptions 
WHERE user_id = '0a5d61cf-f502-464c-887a-86ad763cf7e7'
  AND id != '560b9b04-467a-4c68-a978-879ce170319b';