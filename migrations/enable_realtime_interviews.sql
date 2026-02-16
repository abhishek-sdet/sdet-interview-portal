-- Enable Realtime for Interviews Table (Safe Check)

-- 1. Set REPLICA IDENTITY to FULL
-- This ensures that UPDATE and DELETE events contain all columns, which is necessary for correct real-time updates.
ALTER TABLE interviews REPLICA IDENTITY FULL;

-- 2. Add table to supabase_realtime publication safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel
    JOIN pg_class ON pg_class.oid = pg_publication_rel.prrelid
    JOIN pg_publication ON pg_publication.oid = pg_publication_rel.prpubid
    WHERE pg_class.relname = 'interviews'
    AND pg_publication.pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interviews;
  END IF;
END $$;
