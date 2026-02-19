-- Allow public (anon) read access to verify IP/Device ID
-- This is required because candidates on the landing page are not yet authenticated
CREATE POLICY "Public read access control for verification" ON admin_access_control
    FOR SELECT USING (true);

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE 'Access control read policy updated successfully!';
END $$;
