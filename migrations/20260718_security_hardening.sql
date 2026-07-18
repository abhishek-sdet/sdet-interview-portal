-- Security Hardening Migration
-- Date: 2026-07-18
--
-- Fixes:
--  1. Replaces the "any authenticated user = admin" check (auth.role() = 'authenticated')
--     with a real admins allow-list (public.admins + is_admin()).
--  2. Closes public dump access on candidates / interviews / interview_photos by
--     scoping the anon-facing SELECT/UPDATE policies to a rolling recent window
--     instead of USING (true). Admin policies (is_admin()) still see everything.
--  3. Replaces the fully-public admin_access_control SELECT policy with a
--     SECURITY DEFINER RPC that only returns a yes/no verdict, not the raw
--     allow-list (so device IDs/IPs can no longer be enumerated).
--  4. Hardens submit_and_grade_quiz against replay: once an interview is
--     'completed', re-calling the RPC returns the stored result instead of
--     re-grading with new answers.
--
-- IMPORTANT — run this once in the Supabase SQL Editor, then verify:
--   a) Every existing admin login still works (this migration auto-seeds
--      public.admins with every current auth.users row, so nobody currently
--      able to log into /admin loses access).
--   b) The candidate registration/resume flow still works within the last
--      14 days of data (RECENCY_WINDOW below). Older abandoned interview IDs
--      left in a candidate's browser localStorage will now be treated as
--      "not found" (same as if the row had been deleted) — this is intended.

-- ── 1. Real admin allow-list ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read own admin row" ON public.admins;
CREATE POLICY "Admins can read own admin row" ON public.admins
  FOR SELECT USING (auth.uid() = user_id);

-- Preserve current access: today every authenticated user is treated as an
-- admin, so seed the allow-list with everyone who already has a login.
-- New admins going forward must be added explicitly:
--   INSERT INTO public.admins (user_id) VALUES ('<their-auth-user-uuid>');
INSERT INTO public.admins (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ── 2. Swap auth.role() = 'authenticated' for is_admin() everywhere ─────────
DROP POLICY IF EXISTS "Admins full access to criteria" ON criteria;
CREATE POLICY "Admins full access to criteria" ON criteria
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins full access to questions" ON questions;
CREATE POLICY "Admins full access to questions" ON questions
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins read all candidates" ON candidates;
CREATE POLICY "Admins read all candidates" ON candidates
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins read all interviews" ON interviews;
CREATE POLICY "Admins read all interviews" ON interviews
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins read all answers" ON answers;
CREATE POLICY "Admins read all answers" ON answers
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins full access to access_control" ON admin_access_control;
CREATE POLICY "Admins full access to access_control" ON admin_access_control
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins full access to interview_photos" ON public.interview_photos;
CREATE POLICY "Admins full access to interview_photos" ON public.interview_photos
  FOR ALL USING (is_admin());

-- ── 3. Scope public candidate/interview reads to a rolling recent window ───
-- (Admin policies above already grant full historical access via is_admin();
--  these OR together, so admins are unaffected.)

DROP POLICY IF EXISTS "Public select candidates by email" ON candidates;
CREATE POLICY "Public select recent candidates" ON candidates
  FOR SELECT USING (created_at > NOW() - INTERVAL '14 days');

DROP POLICY IF EXISTS "Public update candidates" ON candidates;
CREATE POLICY "Public update recent candidates" ON candidates
  FOR UPDATE USING (created_at > NOW() - INTERVAL '14 days');

DROP POLICY IF EXISTS "Public select interviews" ON interviews;
CREATE POLICY "Public select recent interviews" ON interviews
  FOR SELECT USING (started_at > NOW() - INTERVAL '14 days');

DROP POLICY IF EXISTS "Anyone can update interview" ON interviews;
CREATE POLICY "Anyone can update recent interview" ON interviews
  FOR UPDATE USING (started_at > NOW() - INTERVAL '14 days');

DROP POLICY IF EXISTS "Anyone can select interview_photos" ON public.interview_photos;
CREATE POLICY "Anyone can select recent interview_photos" ON public.interview_photos
  FOR SELECT USING (created_at > NOW() - INTERVAL '14 days');

-- ── 4. admin_access_control: verdict-only RPC instead of a public dump ─────
DROP POLICY IF EXISTS "Public read access control for verification" ON admin_access_control;

CREATE OR REPLACE FUNCTION public.check_access_allowed(p_ip TEXT, p_device_id TEXT)
RETURNS TABLE (has_restrictions BOOLEAN, allowed BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM admin_access_control) AS has_restrictions,
    EXISTS (
      SELECT 1 FROM admin_access_control
      WHERE (type = 'ip' AND value = p_ip)
         OR (type = 'device' AND value = p_device_id)
    ) AS allowed;
$$;

GRANT EXECUTE ON FUNCTION public.check_access_allowed(TEXT, TEXT) TO anon, authenticated;
REVOKE ALL ON public.admin_access_control FROM anon;

-- ── 5. Anti-replay for quiz grading ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION submit_and_grade_quiz(
  p_interview_id UUID,
  p_answers JSONB,
  p_device_id TEXT,
  p_question_set TEXT,
  p_auto_submitted BOOLEAN,
  p_auto_submit_reason TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  score INT,
  total_questions INT,
  percentage NUMERIC,
  passed BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_prev_score INT;
  v_prev_total INT;
  v_prev_percentage NUMERIC;
  v_prev_passed BOOLEAN;
  v_passing_percentage INT;
  v_correct_count INT := 0;
  v_total_questions INT := 0;
  v_percentage NUMERIC;
  v_passed BOOLEAN;
  v_criteria_id UUID;
  v_answer_record JSONB;
  v_question_id UUID;
  v_selected_answer TEXT;
  v_correct_answer TEXT;
  v_is_correct BOOLEAN;
  v_existing_meta JSONB;
  v_new_meta JSONB;
BEGIN
  -- 1. Fetch interview and criteria details
  SELECT criteria_id, metadata, status, score, total_questions, percentage, passed
  INTO v_criteria_id, v_existing_meta, v_status, v_prev_score, v_prev_total, v_prev_percentage, v_prev_passed
  FROM interviews
  WHERE id = p_interview_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0, 0::NUMERIC, FALSE, 'Interview session not found or has been deleted.'::TEXT;
    RETURN;
  END IF;

  -- 1b. ANTI-REPLAY: once completed, never re-grade — just hand back the
  -- stored result so repeated calls (e.g. from devtools) can't be used to
  -- retry with different answers until one combination passes.
  IF v_status = 'completed' THEN
    RETURN QUERY SELECT TRUE, v_prev_score, v_prev_total, v_prev_percentage, v_prev_passed,
      'This assessment has already been submitted.'::TEXT;
    RETURN;
  END IF;

  -- 2. Fetch passing percentage
  SELECT passing_percentage
  INTO v_passing_percentage
  FROM criteria
  WHERE id = v_criteria_id;

  IF NOT FOUND THEN
    v_passing_percentage := 70;
  END IF;

  -- 3. Clear existing answers if any (retry safety for in-progress-only state)
  DELETE FROM answers WHERE interview_id = p_interview_id;

  -- 4. Grade the answers
  v_total_questions := jsonb_array_length(p_answers);

  FOR v_answer_record IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    v_question_id := (v_answer_record->>'question_id')::UUID;
    v_selected_answer := v_answer_record->>'selected_answer';

    SELECT correct_answer INTO v_correct_answer
    FROM questions
    WHERE id = v_question_id;

    IF v_correct_answer IS NOT NULL AND
       regexp_replace(trim(lower(v_selected_answer)), E'[\\s\\u00A0]+', ' ', 'g') =
       regexp_replace(trim(lower(v_correct_answer)), E'[\\s\\u00A0]+', ' ', 'g') THEN
      v_is_correct := TRUE;
      v_correct_count := v_correct_count + 1;
    ELSE
      v_is_correct := FALSE;
    END IF;

    INSERT INTO answers (interview_id, question_id, selected_answer, is_correct)
    VALUES (p_interview_id, v_question_id, v_selected_answer, v_is_correct);
  END LOOP;

  -- 5. Calculate results
  IF v_total_questions > 0 THEN
    v_percentage := ROUND((v_correct_count::DECIMAL / v_total_questions) * 100, 2);
  ELSE
    v_percentage := 0;
  END IF;

  v_passed := v_percentage >= v_passing_percentage;

  v_new_meta := COALESCE(v_existing_meta, '{}'::JSONB);
  IF p_auto_submitted THEN
    v_new_meta := v_new_meta || jsonb_build_object('auto_submitted', TRUE, 'reason', p_auto_submit_reason);
  END IF;

  -- 6. Update interviews table
  UPDATE interviews
  SET status = 'completed',
      completed_at = NOW(),
      score = v_correct_count,
      total_questions = v_total_questions,
      percentage = v_percentage,
      passed = v_passed,
      device_id = p_device_id,
      question_set = COALESCE(p_question_set, question_set),
      metadata = v_new_meta
  WHERE id = p_interview_id;

  RETURN QUERY SELECT TRUE, v_correct_count, v_total_questions, v_percentage, v_passed, NULL::TEXT;
END;
$$;

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE 'Security hardening migration applied successfully!';
  RAISE NOTICE 'Verify admin login still works, then review public.admins for the seeded rows.';
END $$;
