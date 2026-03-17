-- Run this in Supabase SQL Editor
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS enforce_full_screen BOOLEAN DEFAULT false;

-- Update existing record to have the default value
UPDATE site_settings SET enforce_full_screen = false WHERE enforce_full_screen IS NULL;
