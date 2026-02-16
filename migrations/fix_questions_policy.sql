-- RLS POLICY FIX FOR ASPIRANT ACCESS
-- Run this in your Supabase SQL Editor to fix "Default Set" issue

-- 1. Enable RLS on questions table (if not already enabled)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if it exists to avoid errors
DROP POLICY IF EXISTS "Allow public read access to questions" ON questions;
DROP POLICY IF EXISTS "Enable read access for all users" ON questions;

-- 3. Create policy to allow ANYONE (including aspirants) to read questions
-- This fixes the issue where aspirants (who are "anon" users) cannot see question sets
CREATE POLICY "Allow public read access to questions"
ON questions FOR SELECT
TO public
USING (true);

-- 4. Do the same for criteria table just in case
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to criteria" ON criteria;

CREATE POLICY "Allow public read access to criteria"
ON criteria FOR SELECT
TO public
USING (true);

-- 5. Grant usage on schema (sometimes needed for anon)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated. Public read access enabled for questions and criteria.';
END $$;
