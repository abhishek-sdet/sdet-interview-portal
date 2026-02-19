-- Migration: Cleanup redundant and excessive question options
-- Date: 2026-02-19

DO $$
DECLARE
    r RECORD;
    new_options JSONB;
    unique_opt TEXT;
    opt TEXT;
    seen_opts TEXT[];
    final_count INTEGER;
    correct_idx INTEGER;
    new_correct_answer TEXT;
BEGIN
    FOR r IN (
        SELECT id, options, correct_option 
        FROM questions 
        WHERE jsonb_array_length(options) > 4 
           OR options::text ~ '"[^"]*":\s*"[^"]*"' -- Placeholder for potential logic to find dupes if needed
    ) LOOP
        seen_opts := ARRAY[]::TEXT[];
        new_options := '[]'::JSONB;
        final_count := 0;
        
        -- Deduplicate and limit to 4
        FOR opt IN SELECT jsonb_array_elements_text(r.options) LOOP
            IF final_count < 4 AND NOT (seen_opts @> ARRAY[trim(lower(opt))]) THEN
                seen_opts := seen_opts || trim(lower(opt));
                new_options := new_options || jsonb_build_array(trim(opt));
                final_count := final_count + 1;
            END IF;
        END LOOP;
        
        -- Update correct_answer mapping if it changed
        correct_idx := ascii(upper(r.correct_option)) - 65;
        IF correct_idx >= 0 AND correct_idx < jsonb_array_length(new_options) THEN
            new_correct_answer := new_options->>correct_idx;
        ELSE
            new_correct_answer := new_options->>0; -- Fallback to first if index out of bounds
        END IF;

        UPDATE questions 
        SET options = new_options,
            correct_answer = new_correct_answer,
            updated_at = NOW()
        WHERE id = r.id;
    END LOOP;
END $$;
