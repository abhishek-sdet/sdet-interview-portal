-- Create a secure RPC function to grade and submit quizzes on the server-side.
-- This function runs with SECURITY DEFINER to bypass column-level restrictions.
CREATE OR REPLACE FUNCTION submit_and_grade_quiz(
  p_interview_id UUID,
  p_answers JSONB, -- array of objects: [{"question_id": "...", "selected_answer": "..."}]
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
  SELECT criteria_id, metadata
  INTO v_criteria_id, v_existing_meta
  FROM interviews
  WHERE id = p_interview_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0, 0::NUMERIC, FALSE, 'Interview session not found or has been deleted.'::TEXT;
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

  -- 3. Clear existing answers if any (retry safety)
  DELETE FROM answers WHERE interview_id = p_interview_id;

  -- 4. Grade the answers
  v_total_questions := jsonb_array_length(p_answers);
  
  FOR v_answer_record IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    v_question_id := (v_answer_record->>'question_id')::UUID;
    v_selected_answer := v_answer_record->>'selected_answer';

    -- Fetch the correct answer securely
    SELECT correct_answer INTO v_correct_answer
    FROM questions
    WHERE id = v_question_id;

    -- Normalize and compare answers
    IF v_correct_answer IS NOT NULL AND 
       regexp_replace(trim(lower(v_selected_answer)), E'[\\s\\u00A0]+', ' ', 'g') = 
       regexp_replace(trim(lower(v_correct_answer)), E'[\\s\\u00A0]+', ' ', 'g') THEN
      v_is_correct := TRUE;
      v_correct_count := v_correct_count + 1;
    ELSE
      v_is_correct := FALSE;
    END IF;

    -- Insert into answers table
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

  -- Prepare metadata
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

-- Enforce Column-Level Security (CLS) on the questions table.
-- Revoke SELECT on correct_answer for the 'anon' role (used by standard client portal API requests)
REVOKE SELECT ON public.questions FROM anon;
REVOKE SELECT (correct_answer) ON public.questions FROM anon;

-- Explicitly GRANT select access on all other columns to public/anon role so standard fetches still succeed
GRANT SELECT (
  id, criteria_id, question_text, options, difficulty, points, is_active, 
  created_at, updated_at, category, set_name, marks, section, subsection, 
  option_a, option_b, option_c, option_d, order_index, type, language, test_cases
) ON public.questions TO anon;
