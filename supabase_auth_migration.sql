-- ═══════════════════════════════════════════════════════════════
-- RPM Portal — Supabase Auth Migration
-- Run in Supabase SQL editor (Settings → SQL Editor)
-- Safe to re-run: all inserts skip existing rows
-- ═══════════════════════════════════════════════════════════════

-- 1. Enable pgcrypto (needed for crypt / gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Update admin email to real email address
UPDATE public.admins
SET email = 'courtneywhite@fuller.edu'
WHERE email ILIKE 'rpmadmin' OR email = 'RPMadmin';

-- ───────────────────────────────────────────────────────────────
-- 3. Create auth.users for every coach in the coaches table
--    Skips any email that already has an auth account
-- ───────────────────────────────────────────────────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  c.email,
  crypt(c.password, gen_salt('bf', 10)),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  'authenticated',
  'authenticated'
FROM public.coaches c
WHERE c.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = c.email);

-- ───────────────────────────────────────────────────────────────
-- 4. Create auth.users for the admin account
-- ───────────────────────────────────────────────────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'courtneywhite@fuller.edu',
  crypt('RPMadmin26', gen_salt('bf', 10)),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  'authenticated',
  'authenticated'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'courtneywhite@fuller.edu'
);

-- ───────────────────────────────────────────────────────────────
-- 5. Create auth.identities for all new users (email provider)
--    NOTE: if this errors with "column provider_id does not exist",
--    remove the provider_id line — older Supabase versions omit it.
-- ───────────────────────────────────────────────────────────────
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  json_build_object('sub', u.id::text, 'email', u.email)::jsonb,
  'email',
  u.id::text,
  now(), now(), now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);

-- ───────────────────────────────────────────────────────────────
-- 6. Drop ALL existing RLS policies on public tables
-- ───────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ───────────────────────────────────────────────────────────────
-- 7. Ensure RLS is enabled on all tables
-- ───────────────────────────────────────────────────────────────
ALTER TABLE public.teams                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panic_cycle_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_map_responses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_report_scores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_pins           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panic_cycle_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_questions       ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────
-- 8. New RLS policies
--
-- Principle: anon = unauthenticated athletes (read-only or
--   submit-only depending on table).  authenticated = coaches
--   and admins who have signed in via Supabase Auth.
-- ───────────────────────────────────────────────────────────────

-- teams: athletes read active teams by code; coaches/admins do everything
CREATE POLICY "teams_anon_select"   ON public.teams FOR SELECT TO anon          USING (status = 'active');
CREATE POLICY "teams_auth_all"      ON public.teams FOR ALL    TO authenticated  USING (true) WITH CHECK (true);

-- roster: athletes read the name list and mark themselves complete
CREATE POLICY "roster_anon_select"  ON public.roster FOR SELECT TO anon          USING (true);
CREATE POLICY "roster_anon_update"  ON public.roster FOR UPDATE TO anon          USING (true) WITH CHECK (true);
CREATE POLICY "roster_auth_all"     ON public.roster FOR ALL    TO authenticated  USING (true) WITH CHECK (true);

-- coaches: no anon access (table contains plaintext passwords until Phase 2 cleanup)
CREATE POLICY "coaches_auth_all"    ON public.coaches FOR ALL   TO authenticated  USING (true) WITH CHECK (true);

-- admins: no anon access
CREATE POLICY "admins_auth_all"     ON public.admins  FOR ALL   TO authenticated  USING (true) WITH CHECK (true);

-- panic_cycle_responses: athletes insert; coaches/admins read and manage
CREATE POLICY "pcr_anon_insert"     ON public.panic_cycle_responses FOR INSERT TO anon          WITH CHECK (true);
CREATE POLICY "pcr_auth_all"        ON public.panic_cycle_responses FOR ALL    TO authenticated  USING (true) WITH CHECK (true);

-- social_map_responses: athletes read doneThisAdmin count + insert; coaches/admins full
CREATE POLICY "smr_anon_select"     ON public.social_map_responses FOR SELECT TO anon          USING (true);
CREATE POLICY "smr_anon_insert"     ON public.social_map_responses FOR INSERT TO anon          WITH CHECK (true);
CREATE POLICY "smr_auth_all"        ON public.social_map_responses FOR ALL    TO authenticated  USING (true) WITH CHECK (true);

-- pulse_report_scores: athletes insert + delete (recalc on resubmit); coaches/admins read
CREATE POLICY "prs_anon_insert"     ON public.pulse_report_scores FOR INSERT TO anon          WITH CHECK (true);
CREATE POLICY "prs_anon_delete"     ON public.pulse_report_scores FOR DELETE TO anon          USING (true);
CREATE POLICY "prs_auth_all"        ON public.pulse_report_scores FOR ALL    TO authenticated  USING (true) WITH CHECK (true);

-- athlete_pins: athletes create and verify their own 4-digit PINs (no auth required)
CREATE POLICY "pins_anon_all"       ON public.athlete_pins FOR ALL TO anon          USING (true) WITH CHECK (true);
CREATE POLICY "pins_auth_all"       ON public.athlete_pins FOR ALL TO authenticated  USING (true) WITH CHECK (true);

-- panic_cycle_documents: athletes see their released doc; coaches/admins full
CREATE POLICY "pcd_anon_select"     ON public.panic_cycle_documents FOR SELECT TO anon          USING (released = true);
CREATE POLICY "pcd_auth_all"        ON public.panic_cycle_documents FOR ALL    TO authenticated  USING (true) WITH CHECK (true);

-- custom_questions: athletes read questions; coaches/admins manage them
CREATE POLICY "cq_anon_select"      ON public.custom_questions FOR SELECT TO anon          USING (true);
CREATE POLICY "cq_auth_all"         ON public.custom_questions FOR ALL    TO authenticated  USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────
-- DONE. Verify with:
--   SELECT email FROM auth.users ORDER BY created_at;
--   SELECT policyname, tablename, roles, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
--
-- Phase 2 (after confirming login works):
--   ALTER TABLE public.coaches DROP COLUMN password;
--   ALTER TABLE public.admins  DROP COLUMN password;
-- ───────────────────────────────────────────────────────────────
