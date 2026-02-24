-- Add allow_screenshots to site_settings

-- 1. Add the column with a default of false (block screenshots by default for exams)
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS allow_screenshots BOOLEAN DEFAULT false;

-- 2. Update existing rows to false just in case
UPDATE site_settings SET allow_screenshots = false WHERE allow_screenshots IS NULL;

-- Note: RLS policies on site_settings already allow Admins full access and Public read access,
-- so no new policies are needed for this column.
