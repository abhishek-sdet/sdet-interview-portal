-- Add section and subsection columns to questions table

-- 1. Add columns if they don't exist
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS section TEXT CHECK (section IN ('general', 'elective')),
ADD COLUMN IF NOT EXISTS subsection TEXT;

-- 2. Update existing questions to have default values (optional but good for data integrity)
-- Let's assume all existing questions are 'General' -> 'Aptitude' for now, or just leave null.
-- Better to leave null and let admin update them.

-- 3. Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section);
CREATE INDEX IF NOT EXISTS idx_questions_subsection ON questions(subsection);

-- 4. Comment on columns
COMMENT ON COLUMN questions.section IS 'The main section: general (compulsory) or elective (optional choice)';
COMMENT ON COLUMN questions.subsection IS 'The specific subject: aptitude (for general), java, python, etc.';

-- 5. Notify success
DO $$
BEGIN
  RAISE NOTICE 'Schema updated successfully! Added section and subsection columns.';
END $$;
