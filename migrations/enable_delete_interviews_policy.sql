-- Enable DELETE policy for interviews table
-- This allows authenticated admins to delete interview records
-- This is required for cleaning up data when a drive is deleted

CREATE POLICY "Admins can delete interviews" ON interviews
  FOR DELETE USING (auth.role() = 'authenticated');

-- Also enable DELETE policy for answers table (cascading cleanup)
CREATE POLICY "Admins can delete answers" ON answers
  FOR DELETE USING (auth.role() = 'authenticated');
