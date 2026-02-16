-- Fix Questions Table Schema
-- Execute this in Supabase SQL Editor to ensure all required columns exist

-- 1. Add 'category' column if it doesn't exist (used for Set Name)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'category') THEN
        ALTER TABLE questions ADD COLUMN category TEXT DEFAULT 'Set A';
    END IF;
END $$;

-- 2. Add 'section' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'section') THEN
        ALTER TABLE questions ADD COLUMN section TEXT DEFAULT 'general';
    END IF;
END $$;

-- 3. Add 'subsection' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'subsection') THEN
        ALTER TABLE questions ADD COLUMN subsection TEXT DEFAULT 'aptitude';
    END IF;
END $$;

-- 4. Add individual option columns if they match the legacy code expectation
-- (Even if 'options' JSONB exists, these might be needed for the frontend)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'option_a') THEN
        ALTER TABLE questions ADD COLUMN option_a TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'option_b') THEN
        ALTER TABLE questions ADD COLUMN option_b TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'option_c') THEN
        ALTER TABLE questions ADD COLUMN option_c TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'option_d') THEN
        ALTER TABLE questions ADD COLUMN option_d TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'correct_option') THEN
        ALTER TABLE questions ADD COLUMN correct_option TEXT;
    END IF;
END $$;

-- 5. Make 'options' nullable if it exists, to avoid errors if we send individual options
-- (Optional: only if you encounter issues with strictly required JSONB)
-- ALTER TABLE questions ALTER COLUMN options DROP NOT NULL;
