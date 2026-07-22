-- Follow-up security hardening
-- Date: 2026-07-22
--
-- The 2026-07-18 hardening pass (20260718_security_hardening.sql) added the
-- submit_and_grade_quiz() RPC specifically so grading can't be forged by the
-- client, and locked down admin_access_control + questions.correct_answer.
-- It missed three things:
--
--  1. "Anyone can update recent interview" (interviews, FOR UPDATE) still
--     allows a direct PostgREST call to set score/percentage/passed/status
--     on any interview row from the last 14 days, completely bypassing the
--     grading RPC. Fix: revoke UPDATE on the graded columns for anon/
--     authenticated at the column-privilege level (same technique already
--     used for questions.correct_answer) so only the SECURITY DEFINER RPC
--     (which runs as the table owner) can touch them.
--  2. An older migration (fix_questions_policy.sql) added a second, broader
--     "USING (true)" SELECT policy on questions/criteria on top of the
--     original is_active-scoped one. RLS policies for the same command are
--     OR'd together, so the broader policy silently won and retired/
--     inactive question sets have been readable by candidates ever since.
--     Fix: drop the broad policies; the is_active-scoped ones from
--     supabase-schema.sql remain.
--  3. That same migration also ran
--     `GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;` — a blanket
--     grant that makes any table added later world-readable by default
--     unless someone remembers to REVOKE it. Fix: revoke the blanket grant
--     and re-grant SELECT explicitly only on the tables anon actually needs.
--  4. `interview_photos` has never had an UPDATE policy for anon (only
--     INSERT + SELECT), so the app's "resume an interview" flow — which now
--     needs to upsert a freshly-recaptured identity photo over the row
--     created at the original attempt — would silently fail once it hits
--     the ON CONFLICT DO UPDATE path. Fix: add a recency-scoped UPDATE
--     policy (same 14-day window as the rest of this table's policies) and
--     make sure anon still has the table-level grants it needs.
--  5. The explicit re-grant list in #3 missed `site_settings` — LandingPage,
--     AccessGuard, and QuizInterface all read it as anon (site-active flag,
--     screenshot/inspect/shuffle/fullscreen toggles). Without the grant those
--     reads 401 and silently fall back to hardcoded defaults, so an admin's
--     site-settings toggles stop having any effect. Fix: add it to the list.
--
-- NOT fixed here (needs a follow-up with its own testing pass, see chat):
--   The "Public select recent candidates/interviews" policies allow a
--   direct PostgREST call with no filter to enumerate every candidate/
--   interview row from the last 14 days. RLS can't distinguish "the app's
--   own filtered query" from "an unfiltered scan" — the same policy governs
--   both — so closing this properly means moving those reads behind
--   SECURITY DEFINER RPCs (like check_access_allowed) and updating every
--   call site in LandingPage.jsx / CriteriaSelection.jsx / QuizInterface.jsx
--   accordingly. That's a real rewrite of the live registration/resume flow
--   and should be tested end-to-end before going out, not shipped silently
--   in this pass.
--
-- Run this once in the Supabase SQL Editor, then verify:
--   a) A candidate can still complete and submit a quiz normally (grading
--      still happens via submit_and_grade_quiz — unaffected by this file).
--   b) `select * from questions where is_active = false limit 1;` — this
--      row should no longer come back when queried with the anon key.

-- ── 1. Stop direct client forgery of graded interview columns ───────────────
REVOKE UPDATE ON public.interviews FROM anon, authenticated;

GRANT UPDATE (
  time_limit_minutes, question_set, scheduled_interview_id
) ON public.interviews TO anon, authenticated;

-- ── 2. Remove the broader USING(true) read policies that were silently
--       overriding the is_active-scoped ones ─────────────────────────────────
DROP POLICY IF EXISTS "Allow public read access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public read access to criteria" ON criteria;

-- ── 3. Replace the blanket anon grant with an explicit least-privilege list ─
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;

GRANT SELECT ON public.criteria             TO anon;
GRANT SELECT ON public.scheduled_interviews TO anon;
GRANT SELECT ON public.candidates           TO anon;
GRANT SELECT ON public.interviews           TO anon;
GRANT SELECT ON public.answers              TO anon;
GRANT SELECT ON public.interview_photos     TO anon;
GRANT SELECT ON public.site_settings        TO anon;

-- IMPORTANT: `REVOKE SELECT ON ALL TABLES ... FROM anon` above clears a role's
-- SELECT privilege on a table entirely — including a previously-granted
-- COLUMN-scoped grant. It does NOT leave the narrower grant in place. So the
-- column-scoped grant from 20260622_secure_grading_rpc_and_column_security.sql
-- (everything on `questions` except `correct_answer`) must be re-issued here,
-- not just assumed to survive.
GRANT SELECT (
  id, criteria_id, question_text, options, difficulty, points, is_active,
  created_at, updated_at, category, set_name, marks, section, subsection,
  option_a, option_b, option_c, option_d, order_index, type, language, test_cases
) ON public.questions TO anon;
-- admin_access_control stays fully revoked from 20260718_security_hardening.sql

-- ── 4. Let a resumed interview's re-captured photo actually save ───────────
GRANT UPDATE ON public.interview_photos TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can update recent interview_photos" ON public.interview_photos;
CREATE POLICY "Anyone can update recent interview_photos" ON public.interview_photos
  FOR UPDATE USING (created_at > NOW() - INTERVAL '14 days');

DO $$
BEGIN
  RAISE NOTICE 'RLS follow-up applied: interview score/status columns are now RPC-only, inactive questions/criteria are hidden again, the blanket anon SELECT grant has been narrowed, and resumed-interview photo re-uploads can now save.';
END $$;
