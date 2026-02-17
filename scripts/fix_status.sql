
-- Fix Interview Status for Abhishek Johri (abhgh150@gmail.com)
-- Context: User scored 77.8% but was marked as PASSED. Criteria is 80%.
-- This script updates the status to FAILED (passed = false).

UPDATE interviews
SET passed = false
FROM candidates
WHERE interviews.candidate_id = candidates.id
  AND candidates.email = 'abhgh150@gmail.com'
  AND interviews.passed = true
  AND (interviews.score::float / GREATEST(interviews.total_questions, 1)::float) < 0.80;

-- Verify the update
SELECT 
    c.email, 
    i.score, 
    i.total_questions, 
    (i.score::float / GREATEST(i.total_questions, 1)::float) as percentage,
    i.passed
FROM interviews i
JOIN candidates c ON i.candidate_id = c.id
WHERE c.email = 'abhgh150@gmail.com';
