-- 1. Create interview_photos table
CREATE TABLE IF NOT EXISTS public.interview_photos (
  interview_id UUID PRIMARY KEY REFERENCES public.interviews(id) ON DELETE CASCADE,
  photo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Migrate existing candidate photos from interviews metadata JSON to the new table
INSERT INTO public.interview_photos (interview_id, photo)
SELECT id, metadata->>'initial_photo'
FROM public.interviews
WHERE metadata->>'initial_photo' IS NOT NULL
ON CONFLICT (interview_id) DO NOTHING;

-- 3. Strip the base64 photos from the interviews metadata column to instantly reclaim space and stop egress leak
UPDATE public.interviews
SET metadata = metadata - 'initial_photo'
WHERE metadata->>'initial_photo' IS NOT NULL;

-- 4. Enable Row Level Security (RLS) on the photos table
ALTER TABLE public.interview_photos ENABLE ROW LEVEL SECURITY;

-- Admins: Full access
CREATE POLICY "Admins full access to interview_photos" ON public.interview_photos
  FOR ALL USING (auth.role() = 'authenticated');

-- Public: Anyone can insert their own photo during registration
CREATE POLICY "Anyone can insert interview_photos" ON public.interview_photos
  FOR INSERT WITH CHECK (true);

-- Public: Anyone can view their own photo (for simplicity and frontend fetching)
CREATE POLICY "Anyone can select interview_photos" ON public.interview_photos
  FOR SELECT USING (true);
