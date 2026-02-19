-- Create the admin_access_control table
CREATE TABLE IF NOT EXISTS admin_access_control (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('ip', 'device')),
    value TEXT NOT NULL, -- The IP address or the Device ID
    name TEXT NOT NULL, -- Friendly name for the IP/Device
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(type, value)
);

-- Enable RLS
ALTER TABLE admin_access_control ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can manage this
CREATE POLICY "Admins full access to access_control" ON admin_access_control
    FOR ALL USING (auth.role() = 'authenticated');

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE 'Admin access control table created successfully!';
END $$;
