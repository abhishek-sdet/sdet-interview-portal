-- Add sub_heading column to criteria table
ALTER TABLE criteria
ADD COLUMN IF NOT EXISTS sub_heading TEXT DEFAULT '';

-- Optional: Update existing records if needed (example)
-- UPDATE criteria SET sub_heading = 'For candidates with 0-2 years of experience' WHERE name LIKE '%Fresher%';
