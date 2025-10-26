-- Fix RLS policies for seo_pages to use profiles instead of auth.users
-- and allow org members to SELECT/INSERT/UPDATE their organization's rows

-- Ensure table exists (no-op if already created)
CREATE TABLE IF NOT EXISTS public.seo_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  url TEXT NOT NULL,
  analysis JSONB,
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, url)
);

-- Enable RLS (idempotent)
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

-- Drop old broken policies that referenced auth.users
DROP POLICY IF EXISTS "Users can view pages in their organization" ON public.seo_pages;
DROP POLICY IF EXISTS "Users can insert pages in their organization" ON public.seo_pages;
DROP POLICY IF EXISTS "Users can update pages in their organization" ON public.seo_pages;

-- Create correct policies using public.profiles
CREATE POLICY "seo_pages_select_by_org"
  ON public.seo_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = seo_pages.organization_id
    )
  );

CREATE POLICY "seo_pages_insert_by_org"
  ON public.seo_pages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = seo_pages.organization_id
    )
  );

CREATE POLICY "seo_pages_update_by_org"
  ON public.seo_pages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = seo_pages.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = seo_pages.organization_id
    )
  );

-- Keep trigger for updated_at if it doesn't exist; create function if missing
-- Function likely already exists. This will safely create if not present.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate trigger idempotently
DROP TRIGGER IF EXISTS update_seo_pages_updated_at ON public.seo_pages;
CREATE TRIGGER update_seo_pages_updated_at
  BEFORE UPDATE ON public.seo_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_seo_pages_organization_id ON public.seo_pages(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_pages_url ON public.seo_pages(url);
CREATE INDEX IF NOT EXISTS idx_seo_pages_last_analyzed ON public.seo_pages(last_analyzed_at DESC);
