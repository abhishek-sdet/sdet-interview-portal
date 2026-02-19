-- Migration: Add is_fabricated column to interviews table and update results view
-- Date: 2026-02-19

-- 1. Add is_fabricated column to interviews table
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS is_fabricated BOOLEAN DEFAULT false;

-- 2. Update results view to include is_fabricated
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
  i.metadata,
  i.is_fabricated
FROM interviews i
JOIN candidates c ON i.candidate_id = c.id
LEFT JOIN criteria cr ON i.criteria_id = cr.id
ORDER BY i.started_at DESC;
