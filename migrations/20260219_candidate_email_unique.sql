-- Migration: Make candidate email unique and cleanup existing duplicates
-- Date: 2026-02-19

-- 1. Create a temporary mapping of duplicate candidate IDs to a single canonical ID (the oldest one)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- For each email that has duplicates
    FOR r IN (
        SELECT email, MIN(id::text)::uuid as master_id
        FROM candidates
        WHERE email IS NOT NULL
        GROUP BY email
        HAVING COUNT(*) > 1
    ) LOOP
        -- Update interviews to point to the master_id
        UPDATE interviews 
        SET candidate_id = r.master_id 
        WHERE candidate_id IN (
            SELECT id FROM candidates WHERE email = r.email AND id != r.master_id
        );
        
        -- Delete the duplicate candidates
        DELETE FROM candidates 
        WHERE email = r.email AND id != r.master_id;
    END LOOP;
END $$;

-- 2. Now apply the unique constraint
ALTER TABLE candidates ADD CONSTRAINT unique_candidate_email UNIQUE (email);

