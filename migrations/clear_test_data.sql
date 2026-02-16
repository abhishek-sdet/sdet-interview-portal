-- Clear all candidate and interview data
-- Preserves Questions and Criteria

BEGIN;

DELETE FROM answers;
DELETE FROM interviews;
DELETE FROM candidates;

COMMIT;
