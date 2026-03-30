-- SQL Migration: Add Office Mode / Allow Multiple Attempts setting to Criteria
-- This allows same-day re-attempts for candidates in an office setting.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'criteria' AND column_name = 'allow_multiple_attempts') THEN
        ALTER TABLE criteria ADD COLUMN allow_multiple_attempts BOOLEAN DEFAULT false;
    END IF;
END $$;

COMMENT ON COLUMN criteria.allow_multiple_attempts IS 'If true, allows candidates to take this specific assessment multiple times or even if they have completed others today.';
