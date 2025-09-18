-- Add unique constraint on url field in docs table
ALTER TABLE public.docs ADD CONSTRAINT docs_url_unique UNIQUE (url);