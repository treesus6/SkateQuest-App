-- =====================================================
-- PostGIS Extension Schema Migration
-- =====================================================
-- This migration moves the PostGIS extension from the public schema
-- to a dedicated extensions schema (security best practice)
--
-- IMPORTANT: Run this ONLY if you have already installed the schema
-- and PostGIS is currently in the public schema.
--
-- For new installations, use the updated supabase-schema.sql instead.
-- =====================================================

-- Create dedicated schema for extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on extensions schema to relevant roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move PostGIS extension to extensions schema
-- This is non-destructive and preserves all existing data and objects
ALTER EXTENSION postgis SET SCHEMA extensions;

-- Also move uuid-ossp for consistency (if it exists in public)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname = 'uuid-ossp' AND n.nspname = 'public'
    ) THEN
        ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
    END IF;
END $$;

-- Update search_path to include extensions schema
-- This ensures PostGIS functions work without schema qualification
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Update search_path for all existing roles
ALTER ROLE postgres SET search_path TO public, extensions;
ALTER ROLE anon SET search_path TO public, extensions;
ALTER ROLE authenticated SET search_path TO public, extensions;
ALTER ROLE service_role SET search_path TO public, extensions;

-- Verify the migration
-- Run this to confirm PostGIS is now in the extensions schema:
-- SELECT e.extname, n.nspname as schema
-- FROM pg_extension e
-- JOIN pg_namespace n ON e.extnamespace = n.oid
-- WHERE e.extname IN ('postgis', 'uuid-ossp');

-- Expected output:
--   extname   | schema
-- ------------+-----------
--  postgis    | extensions
--  uuid-ossp  | extensions
