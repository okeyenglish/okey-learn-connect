-- Enable RLS on textbooks table (if not enabled)
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can view textbooks" ON textbooks;
DROP POLICY IF EXISTS "Authenticated users can insert textbooks" ON textbooks;  
DROP POLICY IF EXISTS "Authenticated users can update textbooks" ON textbooks;
DROP POLICY IF EXISTS "Authenticated users can delete textbooks" ON textbooks;

-- Create new policies for authenticated users to manage all textbooks
CREATE POLICY "Authenticated users can view textbooks"
ON textbooks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert textbooks" 
ON textbooks FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update textbooks"
ON textbooks FOR UPDATE  
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete textbooks"
ON textbooks FOR DELETE
TO authenticated
USING (true);