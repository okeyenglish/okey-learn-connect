-- Create storage bucket for student avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-avatars',
  'student-avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- Create RLS policies for student avatars bucket
CREATE POLICY "Authenticated users can view student avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'student-avatars');

CREATE POLICY "Authenticated users can upload student avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-avatars');

CREATE POLICY "Authenticated users can update student avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'student-avatars');

CREATE POLICY "Authenticated users can delete student avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'student-avatars');

-- Create student_parents table
CREATE TABLE public.student_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  relationship TEXT NOT NULL CHECK (relationship IN ('parent', 'mother', 'father', 'guardian', 'other')),
  phone TEXT,
  email TEXT,
  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "whatsapp": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_student_parents_student_id ON public.student_parents(student_id);
CREATE INDEX idx_student_parents_primary ON public.student_parents(student_id, is_primary_contact) WHERE is_primary_contact = true;

-- Enable RLS on student_parents
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_parents
CREATE POLICY "Authenticated users can view student parents"
ON public.student_parents FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage student parents"
ON public.student_parents FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'branch_manager')
);

-- Create student_payers table
CREATE TABLE public.student_payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  relationship TEXT NOT NULL CHECK (relationship IN ('parent', 'guardian', 'self', 'other')),
  phone TEXT,
  email TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'online')),
  is_invoice_recipient BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id) -- One payer per student for now
);

-- Create index for faster lookups
CREATE INDEX idx_student_payers_student_id ON public.student_payers(student_id);

-- Enable RLS on student_payers
ALTER TABLE public.student_payers ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_payers
CREATE POLICY "Authenticated users can view student payers"
ON public.student_payers FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage student payers"
ON public.student_payers FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'branch_manager') OR
  has_role(auth.uid(), 'accountant')
);

-- Create student_segments table
CREATE TABLE public.student_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX idx_student_segments_created_by ON public.student_segments(created_by);
CREATE INDEX idx_student_segments_global ON public.student_segments(is_global);

-- Enable RLS on student_segments
ALTER TABLE public.student_segments ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_segments
CREATE POLICY "Users can view their own segments"
ON public.student_segments FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR is_global = true);

CREATE POLICY "Users can create their own segments"
ON public.student_segments FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own segments"
ON public.student_segments FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own segments"
ON public.student_segments FOR DELETE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all segments"
ON public.student_segments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_student_parents_updated_at
  BEFORE UPDATE ON public.student_parents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_payers_updated_at
  BEFORE UPDATE ON public.student_payers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_segments_updated_at
  BEFORE UPDATE ON public.student_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.student_parents IS 'Stores information about student parents and guardians';
COMMENT ON TABLE public.student_payers IS 'Stores information about who pays for student lessons';
COMMENT ON TABLE public.student_segments IS 'Stores saved filter segments for student lists';
COMMENT ON COLUMN public.student_parents.notification_preferences IS 'JSON object with email, sms, whatsapp boolean flags';
COMMENT ON COLUMN public.student_segments.filters IS 'JSON object storing all filter conditions for the segment';