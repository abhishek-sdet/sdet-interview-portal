-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    is_site_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial record if it doesn't exist
INSERT INTO site_settings (is_site_active)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM site_settings);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Admins: Full access
CREATE POLICY "Admins full access to site_settings" ON site_settings
  FOR ALL USING (auth.role() = 'authenticated');

-- Public: Read access
CREATE POLICY "Public read site_settings" ON site_settings
  FOR SELECT USING (true);
