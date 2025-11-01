-- Drop and recreate catalog view with updated_at field
DROP VIEW IF EXISTS public.catalog;

CREATE VIEW public.catalog AS
SELECT 
  a.id,
  a.title,
  a.kind,
  a.level,
  a.description,
  a.author_id,
  a.tags,
  a.latest_version,
  a.install_count,
  a.avg_rating,
  a.created_at,
  a.updated_at,
  av.preview_url,
  av.meta
FROM apps a
JOIN app_versions av ON a.id = av.app_id AND a.latest_version = av.version
WHERE a.status = 'published';