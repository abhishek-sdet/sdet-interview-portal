-- Migration: Auto re-evaluate interview pass/fail status when criteria passing percentage changes
-- Date: 2026-07-23
--
-- Purpose: When the passing percentage of a criteria is updated (e.g. from 70 to 65),
-- automatically update the 'passed' status of all completed interviews for that criteria.

CREATE OR REPLACE FUNCTION trigger_recalculate_interview_passing_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if passing_percentage actually changed
    IF NEW.passing_percentage IS DISTINCT FROM OLD.passing_percentage THEN
        UPDATE interviews
        SET passed = (
            CASE 
                WHEN total_questions > 0 THEN (ROUND((score::DECIMAL / total_questions) * 100, 2)) >= NEW.passing_percentage
                ELSE false
            END
        )
        WHERE criteria_id = NEW.id 
          AND status = 'completed' 
          AND total_questions > 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Drop the trigger if it already exists so the script is idempotent
DROP TRIGGER IF EXISTS reevaluate_passing_status_on_criteria_update ON criteria;

-- Attach the trigger to the criteria table
CREATE TRIGGER reevaluate_passing_status_on_criteria_update
AFTER UPDATE OF passing_percentage ON criteria
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_interview_passing_status();

DO $$
BEGIN
  RAISE NOTICE 'Auto re-evaluation trigger created successfully. Changing passing percentage in Configuration will now update past results instantly.';
END $$;
