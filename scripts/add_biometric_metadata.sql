-- Migration Script: Add Metadata Column for Biometric Support
-- Run this in your Supabase SQL Editor

-- 1. Ensure the metadata column exists on the interviews table
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2. Ensure the metadata column exists on the candidates table (for future use)
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3. Update the results view to include the metadata column
-- We DROP the view first to avoid structure conflicts
DROP VIEW IF EXISTS results;
CREATE OR REPLACE VIEW results AS
SELECT 
  i.id as interview_id,
  c.id as candidate_id,
  c.full_name,
  c.email,
  c.phone,
  cr.name as criteria_name,
  cr.passing_percentage,
  i.score,
  i.total_questions,
  CASE 
    WHEN i.total_questions > 0 THEN ROUND((i.score::DECIMAL / i.total_questions) * 100, 2)
    ELSE 0
  END as percentage,
  i.passed,
  i.status,
  i.completed_at,
  i.started_at,
  i.metadata
FROM interviews i
JOIN candidates c ON i.candidate_id = c.id
LEFT JOIN criteria cr ON i.criteria_id = cr.id
ORDER BY i.started_at DESC;

-- 4. Verify the column exists (Optional verification query)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'interviews' AND column_name = 'metadata';
