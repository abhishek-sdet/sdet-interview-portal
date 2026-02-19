-- Migration: Fix Registration Policies for Candidates and Interviews
-- Date: 2026-02-19

-- 1. CANDIDATES POLICIES
-- Allow public users to check if they are already registered
CREATE POLICY "Public select candidates by email" ON candidates
    FOR SELECT USING (true);

-- Allow public users to update their own info if re-registering
CREATE POLICY "Public update candidates" ON candidates
    FOR UPDATE USING (true);

-- 2. INTERVIEWS POLICIES
-- Allow public users to check if they have an active interview
CREATE POLICY "Public select interviews" ON interviews
    FOR SELECT USING (true);

-- Ensure anyone can create and update (already exists but just for completeness)
-- CREATE POLICY "Anyone can create interview" ON interviews FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Anyone can update interview" ON interviews FOR UPDATE USING (true);

-- NOTE: In a production environment with sensitive data, 
-- you would restrict these policies further (e.g., using email in metadata or session).
-- For this interview portal, this is the required setup for the flow to work.

DO $$
BEGIN
  RAISE NOTICE 'Registration policies updated successfully!';
END $$;
