-- Migration: Add proctoring auto-submit toggle to site_settings
-- This allows admins to enable/disable the 3nd-strike auto-submit rule globally

-- 1. Add the column with a default of true (strict proctoring on by default)
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS proctoring_auto_submit BOOLEAN DEFAULT true;

-- 2. Ensure existing records are set to true
UPDATE site_settings SET proctoring_auto_submit = true WHERE proctoring_auto_submit IS NULL;

-- Note: RLS policies on site_settings already allow Public read access,
-- so QuizInterface can fetch this without authentication.
