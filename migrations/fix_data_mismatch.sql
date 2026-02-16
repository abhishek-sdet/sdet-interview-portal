-- FIX DATA MISMATCH FOR SET A
-- Run this in Supabase SQL Editor if "Set A" is still not visible

DO $$ 
DECLARE
    experienced_id UUID;
    cnt INTEGER;
BEGIN
    -- 1. Find the ID for 'Experienced (Testing Background)'
    -- We use ILIKE to find it even if case differs slightly
    SELECT id INTO experienced_id FROM criteria WHERE name ILIKE '%Experienced%' LIMIT 1;
    
    IF experienced_id IS NOT NULL THEN
        RAISE NOTICE 'Found Experienced Criteria ID: %', experienced_id;
        
        -- 2. Update questions that are 'Set A' to use this ID
        -- This fixes the mismatch if they were imported under a wrong ID
        UPDATE questions 
        SET criteria_id = experienced_id 
        WHERE category = 'Set A' AND criteria_id != experienced_id;
        
        GET DIAGNOSTICS cnt = ROW_COUNT;
        RAISE NOTICE 'Updated % questions to match Experienced criteria.', cnt;
    ELSE
        RAISE NOTICE 'Could not find Experienced criteria. Please check criteria table.';
    END IF;

    -- 3. Ensure all Set A questions are active
    UPDATE questions 
    SET is_active = true 
    WHERE category = 'Set A' AND is_active = false;
    
    GET DIAGNOSTICS cnt = ROW_COUNT;
    RAISE NOTICE 'Activated % questions in Set A.', cnt;
    
END $$;
