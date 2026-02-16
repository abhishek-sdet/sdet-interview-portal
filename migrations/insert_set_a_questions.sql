-- Insert Questions for SET A (General, Java, Python)
-- This script directly populates the questions table based on the user's provided document content.

-- 1. Get Criteria ID (Assuming 'Fresher' criteria exists, fallback to first available)
DO $$
DECLARE
    v_criteria_id UUID;
    v_cat TEXT := 'Set A';
BEGIN
    SELECT id INTO v_criteria_id FROM criteria ORDER BY created_at DESC LIMIT 1;
    
    IF v_criteria_id IS NULL THEN
        RAISE NOTICE 'No criteria found! Please run the criteria setup script first.';
        RETURN;
    END IF;

    -- SECTION: GENERAL APTITUDE (12 Questions)
    
    -- Q1
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'general', 'aptitude', 
            'What does a 500 status code in REST indicate?', 
            '["Success", "Redirection", "Server Error", "Client Timeout"]'::jsonb, 
            'Server Error', 'C', 'medium');
            
    -- Q2
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'general', 'aptitude', 
            'Which HTTP method is used to update an existing resource?', 
            '["GET", "POST", "PUT", "DELETE"]'::jsonb, 
            'PUT', 'C', 'medium');
            
    -- Q3
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'general', 'aptitude', 
            'Which status code indicates the successful creation of a resource in a REST API?', 
            '["200", "201", "204", "400"]'::jsonb, 
            '201', 'B', 'medium');
            
    -- Q4
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'general', 'aptitude', 
            'What is verification in software testing?', 
            '["Ensuring the product meets user needs", "Evaluating intermediate work products", "Executing test cases", "Reporting bugs"]'::jsonb, 
            'Evaluating intermediate work products', 'B', 'medium');

    -- Q5
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'general', 'aptitude', 
            'Which testing ensures that recent changes have not adversely affected existing features?', 
            '["Unit Testing", "Regression Testing", "System Testing", "Alpha Testing"]'::jsonb, 
            'Regression Testing', 'B', 'medium');

    -- Q6
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'general', 'aptitude', 
            'Which type of testing checks system robustness under extreme load conditions?', 
            '["Load Testing", "Stress Testing", "Functional Testing", "Regression Testing"]'::jsonb, 
            'Stress Testing', 'B', 'medium');

    -- Q7
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'general', 'aptitude', 
            'What type of performance testing checks how a system handles sudden, sharp load changes?', 
            '["Load Testing", "Endurance Testing", "Spike Testing", "Unit Testing"]'::jsonb, 
            'Spike Testing', 'C', 'medium');

    -- Q8
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'general', 'aptitude', 
            'Which performance test evaluates system behavior under continuous load over an extended period?', 
            '["Smoke Testing", "Spike Testing", "Endurance Testing", "Usability Testing"]'::jsonb, 
            'Endurance Testing', 'C', 'medium');

    -- Q9
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'general', 'aptitude', 
            'What does CRUD stand for in databases?', 
            '["Create, Run, Undo, Delete", "Create, Read, Update, Delete", "Compile, Read, Update, Delete", "Copy, Refresh, Update, Drop"]'::jsonb, 
            'Create, Read, Update, Delete', 'B', 'medium');

    -- Q10
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'general', 'aptitude', 
            'Which clause is used to filter grouped data after aggregation?', 
            '["GROUP BY", "WHERE", "HAVING", "ORDER BY"]'::jsonb, 
            'HAVING', 'C', 'medium');

    -- Q11
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'general', 'aptitude', 
            'Which SQL command is used to modify existing records?', 
            '["SELECT", "INSERT", "UPDATE", "DELETE"]'::jsonb, 
            'UPDATE', 'C', 'medium');

    -- Q12
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'general', 'aptitude', 
            'Which of the following is a framework under Agile methodology?', 
            '["V-Model", "Scrum", "Spiral", "Prototype"]'::jsonb, 
            'Scrum', 'B', 'medium');

    -- SECTION: JAVA (3 Questions)

    -- J1
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'elective', 'java', 
            'What will the following code print? String s1 = "hello"; String s2 = new String("hello"); System.out.println(s1 == s2);', 
            '["true", "false", "Compilation error", "Runtime error"]'::jsonb, 
            'false', 'B', 'hard');

    -- J2
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'elective', 'java', 
            'What will be the output of the following code? int[] arr = new int[5]; System.out.println(arr[2]);', 
            '["0", "null", "Compilation error", "ArrayIndexOutOfBoundsException"]'::jsonb, 
            '0', 'A', 'hard');

    -- J3
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'elective', 'java', 
            'What is the output of this code? System.out.println(''D'' - ''A'');', 
            '["3", "68", "A", "Error"]'::jsonb, 
            '3', 'A', 'hard');

    -- SECTION: PYTHON (3 Questions)

    -- P1
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'elective', 'python', 
            'What is the output of the following list comprehension? [x for x in range(5) if x % 2 == 0]', 
            '["[1, 3, 5]", "[0, 2, 4]", "[2, 4, 6]", "[0, 1, 2, 3, 4]"]'::jsonb, 
            '[0, 2, 4]', 'B', 'hard');

    -- P2
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'elective', 'python', 
            'Which of the following will raise a TypeError?', 
            '["\"2\" + \"3\"", "2 + 3.0", "\"2\" + 3", "int(\"3\") + 4"]'::jsonb, 
            '"2" + 3', 'C', 'hard');

    -- P3
    INSERT INTO questions (criteria_id, category, section, subsection, question_text, options, correct_answer, correct_option, difficulty)
    VALUES (v_criteria_id, v_cat, 'elective', 'python', 
            'What will be the output of the following function call? def foo(a, b, c=5): print(a, b, c) foo(1, *(2,))', 
            '["1 2 5", "1 5 2", "1 2 TypeError", "SyntaxError"]'::jsonb, 
            '1 2 5', 'A', 'hard');

END $$;
