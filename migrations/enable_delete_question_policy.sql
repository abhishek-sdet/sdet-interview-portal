-- Enable DELETE, UPDATE, INSERT for authenticated users (Admins)
-- Run this in Supabase SQL Editor to fix "Delete Entire Set" issue

-- 1. Create DELETE policy for authenticated users
CREATE POLICY "Enable delete for authenticated users"
ON questions FOR DELETE
TO authenticated
USING (true);

-- 2. Create UPDATE policy for authenticated users
CREATE POLICY "Enable update for authenticated users"
ON questions FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Create INSERT policy for authenticated users
CREATE POLICY "Enable insert for authenticated users"
ON questions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Added DELETE, UPDATE, INSERT policies for authenticated users on questions table.';
END $$;
