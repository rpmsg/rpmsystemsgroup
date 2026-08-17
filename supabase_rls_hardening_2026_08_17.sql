-- ═══════════════════════════════════════════════════════════════
-- RPM Portal — RLS Hardening (2026-08-17)
-- Replaces blanket `FOR ALL TO authenticated USING (true)` policies
-- with team-scoped coach access + admin-only cross-team access.
-- Also tightens two unrelated over-permissive anon/public policies
-- found during the audit (performance_cycles, message_notifications).
-- Applied via Supabase Management API (Personal Access Token), not
-- the dashboard SQL Editor — see chat log for verification output.
-- Safe to re-run: uses CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1. Helper functions
--    security definer so they can read coaches/admins even after
--    those tables' own RLS locks down (avoids recursive-policy
--    problems); search_path pinned to avoid hijacking.
-- ───────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

create or replace function public.coach_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.team_id from public.coaches c
  where lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.coach_team_id() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.coach_team_id() to authenticated;

-- ───────────────────────────────────────────────────────────────
-- 2. Team-scoped tables (coach: own team only, admin: all teams)
-- ───────────────────────────────────────────────────────────────

-- teams: coach reads only their own team row; admin manages all
drop policy if exists "teams_auth_all" on public.teams;
create policy "teams_coach_select_own" on public.teams
  for select to authenticated using (id = coach_team_id());
create policy "teams_admin_all" on public.teams
  for all to authenticated using (is_admin()) with check (is_admin());

-- roster: coach manages own team's roster; admin manages all
drop policy if exists "roster_auth_all" on public.roster;
create policy "roster_coach_all_own_team" on public.roster
  for all to authenticated using (team_id = coach_team_id()) with check (team_id = coach_team_id());
create policy "roster_admin_all" on public.roster
  for all to authenticated using (is_admin()) with check (is_admin());

-- panic_cycle_responses: coach reads own team's raw intake (dashboard); admin manages all
drop policy if exists "pcr_auth_all" on public.panic_cycle_responses;
create policy "pcr_coach_select_own_team" on public.panic_cycle_responses
  for select to authenticated using (team_id = coach_team_id());
create policy "pcr_admin_all" on public.panic_cycle_responses
  for all to authenticated using (is_admin()) with check (is_admin());

-- social_map_responses: coach reads own team's nominations (Pulse Report); admin manages all
drop policy if exists "smr_auth_all" on public.social_map_responses;
create policy "smr_coach_select_own_team" on public.social_map_responses
  for select to authenticated using (team_id = coach_team_id());
create policy "smr_admin_all" on public.social_map_responses
  for all to authenticated using (is_admin()) with check (is_admin());

-- pulse_report_scores: coach reads own team's scores (dashboard); admin manages all
drop policy if exists "prs_auth_all" on public.pulse_report_scores;
create policy "prs_coach_select_own_team" on public.pulse_report_scores
  for select to authenticated using (team_id = coach_team_id());
create policy "prs_admin_all" on public.pulse_report_scores
  for all to authenticated using (is_admin()) with check (is_admin());

-- wellness_checkins: coach reads own team's scores (WellnessTab/AthleteModal); admin manages all
-- (anon SELECT/INSERT policies untouched — required for the athlete PIN self-service flow)
drop policy if exists "wc_auth_all" on public.wellness_checkins;
create policy "wc_coach_select_own_team" on public.wellness_checkins
  for select to authenticated using (team_id = coach_team_id());
create policy "wc_admin_all" on public.wellness_checkins
  for all to authenticated using (is_admin()) with check (is_admin());

-- ───────────────────────────────────────────────────────────────
-- 3. Admin-only tables
--    No coach-facing component in src/components/coach touches
--    these tables (verified by source read on 2026-08-17) — coach
--    role gets zero policy, i.e. zero access, on all of these.
-- ───────────────────────────────────────────────────────────────

-- admins: admins only
drop policy if exists "admins_auth_all" on public.admins;
create policy "admins_admin_all" on public.admins
  for all to authenticated using (is_admin()) with check (is_admin());

-- coaches: each coach can see/update only their own row (login, change password);
-- only admins can create/delete coach rows or edit other coaches
drop policy if exists "coaches_auth_all" on public.coaches;
create policy "coaches_self_select" on public.coaches
  for select to authenticated using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "coaches_self_update" on public.coaches
  for update to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "coaches_admin_all" on public.coaches
  for all to authenticated using (is_admin()) with check (is_admin());

-- athlete_pins: admin-only management (coach dashboard never touches this table;
-- anon policy untouched — required for athlete PIN create/verify)
drop policy if exists "pins_auth_all" on public.athlete_pins;
create policy "pins_admin_all" on public.athlete_pins
  for all to authenticated using (is_admin()) with check (is_admin());

-- panic_cycle_documents: admin-only ("Admin functions" in cycleApi.js — release notes,
-- coaching notes; anon policy untouched — athletes read only their own released doc)
drop policy if exists "pcd_auth_all" on public.panic_cycle_documents;
create policy "pcd_admin_all" on public.panic_cycle_documents
  for all to authenticated using (is_admin()) with check (is_admin());

-- custom_questions: admin-only (unused by any current UI component; anon read
-- untouched since athleteApi.js reads it during assessment rendering)
drop policy if exists "cq_auth_all" on public.custom_questions;
create policy "cq_admin_all" on public.custom_questions
  for all to authenticated using (is_admin()) with check (is_admin());

-- performance_cycles: admin-only for the review workflow (approve/return).
-- Previous "anon_all" policy used TO public (== anon + authenticated) and
-- granted DELETE, which no app code path ever uses as anon — tightened to
-- the three commands the athlete flow actually performs.
drop policy if exists "anon_all" on public.performance_cycles;
create policy "pcyc_anon_select" on public.performance_cycles
  for select to anon using (true);
create policy "pcyc_anon_insert" on public.performance_cycles
  for insert to anon with check (true);
create policy "pcyc_anon_update" on public.performance_cycles
  for update to anon using (true) with check (true);
create policy "pcyc_admin_all" on public.performance_cycles
  for all to authenticated using (is_admin()) with check (is_admin());

-- messages: admin-only (AdminMessages.jsx / "Practitioner (admin)" functions —
-- no coach component references this table)
drop policy if exists "msg_auth_all" on public.messages;
create policy "msg_admin_all" on public.messages
  for all to authenticated using (is_admin()) with check (is_admin());

-- message_notifications: admin-only. The prior "notif_anon_select" policy was
-- dead weight — no code path in the app reads this table as anon (the athlete
-- inbox reads messages_athlete_view instead) — so it is dropped, not replaced.
drop policy if exists "notif_anon_select" on public.message_notifications;
drop policy if exists "notif_auth_all" on public.message_notifications;
create policy "notif_admin_all" on public.message_notifications
  for all to authenticated using (is_admin()) with check (is_admin());

-- questions / question_options: shared global question bank, no team_id.
-- Previous anon policies granted full CRUD (insert/update/delete) to any
-- unauthenticated visitor; app code only ever reads these tables as anon
-- (athleteApi.js) — write access belongs to admin only (adminApi.js
-- "Questions Table" functions).
drop policy if exists "anon full access" on public.questions;
drop policy if exists "questions_auth_all" on public.questions;
create policy "questions_anon_select" on public.questions
  for select to anon using (true);
create policy "questions_auth_select" on public.questions
  for select to authenticated using (true);
create policy "questions_admin_write" on public.questions
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "anon full access" on public.question_options;
drop policy if exists "question_options_auth_all" on public.question_options;
create policy "qopt_anon_select" on public.question_options
  for select to anon using (true);
create policy "qopt_auth_select" on public.question_options
  for select to authenticated using (true);
create policy "qopt_admin_write" on public.question_options
  for all to authenticated using (is_admin()) with check (is_admin());

-- ───────────────────────────────────────────────────────────────
-- Verify with:
--   select policyname, tablename, roles, cmd, qual, with_check
--   from pg_policies where schemaname = 'public' order by tablename, policyname;
-- ───────────────────────────────────────────────────────────────
