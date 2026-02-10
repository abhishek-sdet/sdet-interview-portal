-- Add timer_duration column to criteria table
-- This allows admins to set interview time limits per criteria

ALTER TABLE criteria 
ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT NULL 
CHECK (timer_duration IS NULL OR timer_duration > 0);

COMMENT ON COLUMN criteria.timer_duration IS 'Interview duration in minutes. NULL means no time limit.';

-- Update existing criteria to have no time limit by default
-- (NULL value already set by DEFAULT NULL)

-- Example: Set 30 minute timer for Fresher criteria
-- UPDATE criteria SET timer_duration = 30 WHERE name = 'Fresher (0-2 years, No Testing)';

-- Example: Set 45 minute timer for Experienced criteria  
-- UPDATE criteria SET timer_duration = 45 WHERE name = 'Experienced (Testing Background)';
