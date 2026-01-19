-- Make chat-files bucket public so external services can access files
UPDATE storage.buckets SET public = true WHERE id = 'chat-files';