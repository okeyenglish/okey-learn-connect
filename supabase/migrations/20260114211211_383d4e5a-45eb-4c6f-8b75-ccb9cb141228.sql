-- Migrate existing max avatars from metadata to the new column
UPDATE public.clients
SET max_avatar_url = holihope_metadata->'max_info'->>'avatar_url'
WHERE holihope_metadata->'max_info'->>'avatar_url' IS NOT NULL
  AND max_avatar_url IS NULL;

-- Also set whatsapp_avatar_url for clients that have avatar from whatsapp (avatar contains wa.me or similar patterns)
-- For now, let's set whatsapp_avatar_url = avatar_url for clients where avatar_url looks like WhatsApp avatar
UPDATE public.clients
SET whatsapp_avatar_url = avatar_url
WHERE avatar_url IS NOT NULL
  AND avatar_url NOT LIKE '%oneme.ru%'
  AND avatar_url NOT LIKE '%max%'
  AND whatsapp_avatar_url IS NULL;