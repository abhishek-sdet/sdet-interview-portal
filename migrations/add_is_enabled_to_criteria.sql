-- Add is_enabled column to criteria table
-- This allows admins to enable/disable criteria visibility in the aspirant app

ALTER TABLE criteria 
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;

-- Update existing records to be enabled by default
UPDATE criteria 
SET is_enabled = true 
WHERE is_enabled IS NULL;

-- Add comment to column
COMMENT ON COLUMN criteria.is_enabled IS 'Controls whether this criteria is visible in the aspirant app';
