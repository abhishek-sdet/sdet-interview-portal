-- Fresher Interview System Database Schema
-- Execute this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CRITERIA TABLE
CREATE TABLE IF NOT EXISTS criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  passing_percentage INTEGER NOT NULL DEFAULT 70 CHECK (passing_percentage >= 0 AND passing_percentage <= 100),
  sub_heading TEXT,
  timer_duration INTEGER DEFAULT 45,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  criteria_id UUID REFERENCES criteria(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of options: ["Option A", "Option B", ...]
  correct_answer TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  points INTEGER DEFAULT 1 CHECK (points > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INTERVIEWS TABLE
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  criteria_id UUID REFERENCES criteria(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  passed BOOLEAN,
  metadata JSONB DEFAULT '{}'
);

-- 5. ANSWERS TABLE
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  selected_answer TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RESULTS VIEW (for easy querying)
CREATE OR REPLACE VIEW results AS
SELECT 
  i.id as interview_id,
  c.id as candidate_id,
  c.full_name,
  c.email,
  c.phone,
  cr.name as criteria_name,
  cr.passing_percentage,
  i.score,
  i.total_questions,
  CASE 
    WHEN i.total_questions > 0 THEN ROUND((i.score::DECIMAL / i.total_questions) * 100, 2)
    ELSE 0
  END as percentage,
  i.passed,
  i.status,
  i.completed_at,
  i.started_at,
  i.metadata
FROM interviews i
JOIN candidates c ON i.candidate_id = c.id
LEFT JOIN criteria cr ON i.criteria_id = cr.id
ORDER BY i.started_at DESC;

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_questions_criteria ON questions(criteria_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_criteria ON interviews(criteria_id);
CREATE INDEX IF NOT EXISTS idx_answers_interview ON answers(interview_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- CRITERIA POLICIES
-- Admins: Full access
CREATE POLICY "Admins full access to criteria" ON criteria
  FOR ALL USING (auth.role() = 'authenticated');

-- Public: Read only active criteria
CREATE POLICY "Public read active criteria" ON criteria
  FOR SELECT USING (is_active = true);

-- QUESTIONS POLICIES
-- Admins: Full access
CREATE POLICY "Admins full access to questions" ON questions
  FOR ALL USING (auth.role() = 'authenticated');

-- Public: Read only active questions
CREATE POLICY "Public read active questions" ON questions
  FOR SELECT USING (is_active = true);

-- CANDIDATES POLICIES
-- Admins: Read all
CREATE POLICY "Admins read all candidates" ON candidates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Public: Insert only (for registration)
CREATE POLICY "Anyone can create candidate" ON candidates
  FOR INSERT WITH CHECK (true);

-- INTERVIEWS POLICIES
-- Admins: Read all
CREATE POLICY "Admins read all interviews" ON interviews
  FOR SELECT USING (auth.role() = 'authenticated');

-- Public: Insert and update own interviews
CREATE POLICY "Anyone can create interview" ON interviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update interview" ON interviews
  FOR UPDATE USING (true);

-- ANSWERS POLICIES
-- Admins: Read all
CREATE POLICY "Admins read all answers" ON answers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Public: Insert answers during interview
CREATE POLICY "Anyone can submit answers" ON answers
  FOR INSERT WITH CHECK (true);

-- SEED DATA (Initial Criteria)
INSERT INTO criteria (name, description, passing_percentage) VALUES
  ('Fresher (0-2 years, No Testing)', 'For candidates with 0-2 years of experience and no testing background', 70),
  ('Experienced (Testing Background)', 'For candidates with testing experience (any years)', 75)
ON CONFLICT (name) DO NOTHING;

-- TRIGGER: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_criteria_updated_at BEFORE UPDATE ON criteria
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create an admin user in Supabase Auth';
  RAISE NOTICE '2. Add questions to the criteria';
  RAISE NOTICE '3. Configure your frontend environment variables';
END $$;
