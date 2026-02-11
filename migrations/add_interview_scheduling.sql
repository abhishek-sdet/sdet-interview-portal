-- Interview Scheduling System - Database Migration
-- Execute this in Supabase SQL Editor

-- 1. Create scheduled_interviews table
CREATE TABLE IF NOT EXISTS scheduled_interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  criteria_id UUID REFERENCES criteria(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  time_limit_minutes INTEGER NOT NULL CHECK (time_limit_minutes > 0),
  max_candidates INTEGER,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns to interviews table
ALTER TABLE interviews 
  ADD COLUMN IF NOT EXISTS scheduled_interview_id UUID REFERENCES scheduled_interviews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_interviews_date ON scheduled_interviews(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_interviews_criteria ON scheduled_interviews(criteria_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_interview_id);

-- 4. Create function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Add trigger for updated_at (drop first if exists to avoid conflicts)
DROP TRIGGER IF EXISTS update_scheduled_interviews_updated_at ON scheduled_interviews;
CREATE TRIGGER update_scheduled_interviews_updated_at BEFORE UPDATE ON scheduled_interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable RLS on scheduled_interviews
ALTER TABLE scheduled_interviews ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for scheduled_interviews
-- Admins: Full access
CREATE POLICY "Admins full access to scheduled_interviews" ON scheduled_interviews
  FOR ALL USING (auth.role() = 'authenticated');

-- Public: Read only active schedules
CREATE POLICY "Public read active scheduled_interviews" ON scheduled_interviews
  FOR SELECT USING (is_active = true);

-- 8. Create view for scheduled interviews with criteria details
CREATE OR REPLACE VIEW scheduled_interviews_view AS
SELECT 
  si.id,
  si.scheduled_date,
  si.time_limit_minutes,
  si.max_candidates,
  si.is_active,
  si.description,
  c.name as criteria_name,
  c.passing_percentage,
  si.created_at,
  si.updated_at,
  -- Count of interviews linked to this schedule
  (SELECT COUNT(*) FROM interviews WHERE scheduled_interview_id = si.id) as total_interviews,
  -- Count of completed interviews
  (SELECT COUNT(*) FROM interviews WHERE scheduled_interview_id = si.id AND status = 'completed') as completed_interviews
FROM scheduled_interviews si
LEFT JOIN criteria c ON si.criteria_id = c.id
ORDER BY si.scheduled_date DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Interview scheduling schema created successfully!';
  RAISE NOTICE 'Tables created: scheduled_interviews';
  RAISE NOTICE 'Views created: scheduled_interviews_view';
  RAISE NOTICE 'Next: Create AdminSchedule component';
END $$;
