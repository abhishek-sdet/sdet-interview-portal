-- Guard against a runaway/uncompressed photo ever being stored.
-- Current capture pipeline (src/pages/interview/ExamRules.jsx) compresses to
-- ~480x360 JPEG @ quality 0.35, which lands well under 100 KB as base64.
-- This CHECK is a safety net, not the primary size control — it just makes
-- sure a bug (or a future change that skips compression) can't silently
-- start filling the DB with multi-MB rows.
--
-- 300,000 chars ≈ ~220 KB of actual image data (base64 is ~1.33x binary
-- size) — comfortably above the ~20-40 KB normal photos land at.

ALTER TABLE public.interview_photos
  ADD CONSTRAINT photo_size_guard CHECK (length(photo) <= 300000);

DO $$
BEGIN
  RAISE NOTICE 'Photo size guard constraint added successfully!';
END $$;
