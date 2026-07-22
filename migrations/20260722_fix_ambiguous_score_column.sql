-- HOTFIX: submit_and_grade_quiz() throws "column reference "score" is ambiguous"
-- Date: 2026-07-22
--
-- Root cause: 20260718_security_hardening.sql's anti-replay addition changed
-- the initial lookup to:
--
--   SELECT criteria_id, metadata, status, score, total_questions, percentage, passed
--   INTO v_criteria_id, v_existing_meta, v_status, v_prev_score, v_prev_total, v_prev_percentage, v_prev_passed
--   FROM interviews
--   WHERE id = p_interview_id;
--
-- The function's own RETURNS TABLE columns are named score/total_questions/
-- percentage/passed — identical to the interviews table's columns. Postgres
-- can't tell which one a bare "score" refers to, so under the default
-- plpgsql.variable_conflict = error setting it raises "column reference
-- "score" is ambiguous" on every call, i.e. every quiz submission fails.
--
-- Fix: alias the interviews table and qualify every column reference in
-- that lookup. Nothing else about the function's behavior changes.
--
-- Run this once in the Supabase SQL Editor. It's safe to run immediately —
-- CREATE OR REPLACE FUNCTION is idempotent and takes effect on the next call.

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
  -- 1. Fetch interview and criteria details (table aliased + columns qualified
  --    to resolve the ambiguity against this function's own OUT parameters)
  SELECT iv.criteria_id, iv.metadata, iv.status, iv.score, iv.total_questions, iv.percentage, iv.passed
  INTO v_criteria_id, v_existing_meta, v_status, v_prev_score, v_prev_total, v_prev_percentage, v_prev_passed
  FROM interviews iv
  WHERE iv.id = p_interview_id;

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

  -- 6. Update interviews table (aliased + qualified for the same reason as step 1)
  UPDATE interviews iv
  SET status = 'completed',
      completed_at = NOW(),
      score = v_correct_count,
      total_questions = v_total_questions,
      percentage = v_percentage,
      passed = v_passed,
      device_id = p_device_id,
      question_set = COALESCE(p_question_set, iv.question_set),
      metadata = v_new_meta
  WHERE iv.id = p_interview_id;

  RETURN QUERY SELECT TRUE, v_correct_count, v_total_questions, v_percentage, v_passed, NULL::TEXT;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE 'submit_and_grade_quiz() fixed — quiz submissions should succeed again.';
END $$;
