-- Move extensions from public to extensions schema for better security

-- Step 1: Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Step 2: Move vector extension
ALTER EXTENSION vector SET SCHEMA extensions;

-- Step 3: Move pg_trgm extension  
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Step 4: Grant usage on extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;

-- Step 5: Update search_path for database to include extensions schema
-- This ensures all functions can find the extensions
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Add comment
COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions - isolated from public schema for security';
