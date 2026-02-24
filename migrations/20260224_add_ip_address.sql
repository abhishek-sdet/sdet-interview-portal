-- Add ip_address column to interviews table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'interviews' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE interviews ADD COLUMN ip_address text;
    END IF;
END $$;
