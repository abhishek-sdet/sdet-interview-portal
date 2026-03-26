-- Add shuffle_questions column to site_settings table
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false;

-- Update existing row to have shuffle_questions as false
UPDATE site_settings SET shuffle_questions = false WHERE shuffle_questions IS NULL;
