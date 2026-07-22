-- Run this in Supabase SQL Editor to add the missing column for Developer Tools setting
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS allow_inspect BOOLEAN DEFAULT false;
