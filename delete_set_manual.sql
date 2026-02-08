-- Quick fix: Manually delete the "Set A - General Testing" set
-- Run this in your Supabase SQL editor or via the Supabase dashboard

-- Option 1: Soft delete (set is_active to false) - RECOMMENDED
UPDATE questions 
SET is_active = false 
WHERE set_name = 'Set A - General Testing';

-- Option 2: Hard delete (permanently remove) - USE WITH CAUTION
-- DELETE FROM questions WHERE set_name = 'Set A - General Testing';

-- To verify the deletion:
SELECT * FROM questions WHERE set_name = 'Set A - General Testing';
