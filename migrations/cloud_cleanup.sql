-- ⚠️ WARNING: This will delete ALL candidate data!
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

BEGIN;

-- 1. Delete all answers
DELETE FROM answers;

-- 2. Delete all interviews
DELETE FROM interviews;

-- 3. Delete all candidates
DELETE FROM candidates;

COMMIT;

-- Verification
SELECT count(*) as candidates_remaining FROM candidates;
