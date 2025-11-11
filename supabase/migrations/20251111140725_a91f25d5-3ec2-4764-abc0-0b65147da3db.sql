-- Create branch_photos table for managing branch photo galleries
CREATE TABLE IF NOT EXISTS public.branch_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.organization_branches(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_main BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branch_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for branch_photos
CREATE POLICY "Branch photos are viewable by everyone"
ON public.branch_photos
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage branch photos"
ON public.branch_photos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    JOIN public.user_roles ON user_roles.user_id = profiles.id
    WHERE profiles.id = auth.uid()
    AND profiles.organization_id = branch_photos.organization_id
    AND user_roles.role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_branch_photos_branch_id ON public.branch_photos(branch_id);
CREATE INDEX idx_branch_photos_organization_id ON public.branch_photos(organization_id);
CREATE INDEX idx_branch_photos_sort_order ON public.branch_photos(sort_order);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_branch_photos_updated_at
BEFORE UPDATE ON public.branch_photos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraint to ensure only one main photo per branch
CREATE UNIQUE INDEX idx_branch_photos_main_unique 
ON public.branch_photos(branch_id) 
WHERE is_main = true;