RPM Systems Group — Master Project Document
Last updated: August 17, 2026 | Source: Claude Code summaries + planning history


⚠️ Read This First — Status Reality Check
The Claude Code summary shows the React rewrite is significantly further along than the last recorded build plan ("(1) security hardening → (2) wellness check-in → (3) async messaging"). As of commit 65102f3:

Supabase Auth + RLS are in place → security hardening (step 1) appears substantially done
Weekly Wellness check-in → built (step 2 done)
Practitioner Messages inbox (realtime, signed URLs, audio/video) → built (step 3 done)
Performance Cycle builder, Panic Loop viewer, Social Map 3-administration flow, Pulse Report (single + compare views), Coach View impersonation → all built

This is good news, but it means the "on the horizon" plan is stale. Recommend confirming with yourself/Claude Code whether this is genuinely production-ready for the live pilot, or still needs a hardening pass, before treating the rewrite as done. See "Open Questions" at the bottom.


1. Company & Methodology Overview
RPM Systems Group — mental performance coaching platform for collegiate/HS athletic programs, built on the proprietary Realignment Performance Model.

Brand promise: "You have an offensive system. You have a defensive system. We build your mental system." Tagline: "Stop Spinning. Start Performing."

Core theory: Anxiety arises when an athlete equates Worth (Identity) with Mistakes (Safety). RPM "realigns" the two so athletes can play freely.

The RPM acronym (multi-layered, intentionally):

Reset. Pivot. Move. — the in-game tactical protocol (the "exit ramp" from the Panic Loop)
Root Pattern Map — the diagnostic assessment tool
Rate of Pressure & Mindset — a daily 1–10 coach/athlete check-in shorthand
Relentless Positive Momentum — the outcome/slogan framing

Shared language — Red Loop vs. Green Loop:

🛑 Red Loop (Panic Cycle): Trigger → Fear/Lies → Dysregulation (freezing, forcing, hiding)
🟢 Green Loop (Performance Cycle): Trigger → Truth/Anchor → Execution (focus, aggression, resilience)

Core methodology components: Panic Cycle (Red Loop), Performance Cycle (Green Loop), Truth Statement, Root Pattern Map, Reset Protocol, Social Map (peer nomination survey), Loop Partner system (collegiate implementation).

Tiered market structure (for scaling beyond the collegiate pilot):

Tier
Segment
Focus
Buyer
1 — Foundation
Middle School/Club
Normalize failure, emotional vocabulary
Booster clubs, parents, youth directors
2 — Prep
High School/Varsity
Identity formation, recruiting pressure
ADs, head coaches, districts
3 — Elite
Collegiate/Pro
Nervous system regulation, diagnostics
GMs, athletic departments


Tangible tools: RPM wristbands (Truth Statement hidden inside), bag tag checklists, locker room posters, "Flush It" team ritual, RPM Captains peer-leadership program.


2. Active Pilots
Davis & Elkins College Women's Soccer — live, Spring 2026, 26 players, currently mid-way through the 3-administration Social Map cycle (18/26 complete per last dashboard snapshot)
Potomac State Community College — planned, not yet started
Demo environment — fictional roster (Sofia Reyes, Jordan Mitchell, etc.) for prospective-program pitches; team code SENATORS26, demo coach login demo@rpmsystemsgroup.com / Demo26


3. Current Technical State (as of commit 65102f3)
3.1 Architecture
Rewrite stack: React app (component-per-feature), same Supabase Postgres instance as the live single-HTML portal
Live pilot portal: still the original single-HTML-file version, deployed via Cloudflare Pages (GitHub auto-deploy) — remains active while rewrite proceeds in parallel
Deployment: Cloudflare Pages + GitHub auto-deploy (Netlify abandoned — hit token/build limits)
Domain: rpmsystemsgroup.com via GoDaddy
Auth: Supabase Auth (email/password) for coaches/admins, forced password change on first login; athletes use team code + name + 4-digit PIN
Storage: Supabase Storage — team-logos (public), practitioner-messages (private, signed-URL access only)
Edge functions: manage-coach-auth (admin-only coach account provisioning), get-message-url (PIN-verified signed URL, marks message read)
3.2 Fully Built & Working Features
Athlete-facing

Unified Athlete Portal (team code → name → PIN → dashboard hub), session persisted via localStorage
Panic Cycle (11 Q) + Social Map (12 Q, 2 rotating sets) — Administration 1
Social-Map-only re-assessment for Administrations 2 & 3
Consent screen with confidentiality disclosure
Panic Loop viewer: Tier 1 (raw, always visible) + Tier 2 (practitioner-curated 5-node ring diagram, gated behind release)
Performance Cycle builder: 3-step wizard (Truth/Reset/Go-Move) pulling forward the athlete's own Panic Cycle answers, with practitioner approve/return-for-revision workflow
Weekly Wellness check-in (mental 1–5 + descriptor, physical 1–10), gated to per-team reset day
Practitioner Messages inbox — realtime unread badge, signed-URL audio/video playback
Dynamic question rendering from Supabase with hardcoded fallback

Coach-facing

Dashboard: roster, completion %, Core Influencer/Friction tiles, social-role tags, panic-cycle aggregates (never individual responses)
Pulse Report modal: Single View (exec summary, risk-zone scatter, influence/friction bars, algorithmic practice-group + rooming-pair generator) + Compare View (administration-over-administration trends); print-to-PDF
Athlete detail modal: social summary + player-comparison (cohesion score, friction proximity, relationship type), wellness folded in
Wellness tab: 3-week grid, auto-flagging (mental ≤2, physical ≤3), suggested coaching language

Admin/Practitioner-facing

Teams, Coaches, Roster CRUD (Coaches CRUD provisions real Supabase Auth accounts via edge function)
Panic Cycles admin — build/edit/release practitioner-curated documents
Performance Cycles admin — pending/returned/approved queues
Social Map administration control — advance team 1→2→3 with confirmation modal
Questions admin — full CRUD, soft-delete, live "Methodology Impact" panel that computes scoring/zone/dimension/comparability impact before saving, with typed-CONFIRM gate for high-impact changes
Practitioner Messages — record/upload audio/video (max 3 min/150MB)
Coach View — read-only impersonation of any team's dashboard for QA/support
3.3 Supabase Schema (reconstructed from RLS policies + query code)
Table
Purpose
teams
team_code, season, status, current_administration, wellness_reset_day, logo_url
roster
athlete records, per-team, status pending/complete
coaches
full_name, email, plaintext password (legacy), team_id, must_change_password
admins
email, plaintext password (legacy)
panic_cycle_responses
11 named Q columns, one row per athlete, Admin-1 only
panic_cycle_documents
practitioner-curated version, anon SELECT only if released=true
social_map_responses
one row per question per athlete per administration
pulse_report_scores
fully recalculated (delete+reinsert) after every submission
athlete_pins
unified portal-wide PIN, unique per (team_id, athlete_id)
performance_cycles
3-step builder data + approval workflow status
custom_questions
⚠ legacy per-team override table, superseded but not dropped
questions / question_options
dynamic question bank (11 PC + 24 SM seeded)
wellness_checkins
unique per (team_id, athlete_id, week_date)
messages / messages_athlete_view
messages table + safe-column view for athlete access
message_notifications
realtime-only trigger table for inbox refresh


All tables have created_at/updated_at with auto-update triggers, per architecture principle.
3.4 Partially Built / Cleanup Needed
custom_questions table — RLS-policied, has orphaned API functions (fetchCustomQuestions, saveCustomQuestion, etc.) with no call sites in the current UI. Half-migrated leftover.
Plaintext password columns on coaches/admins — real auth now runs through Supabase Auth, but the plaintext column is still selected and displayed/edited in AdminCoaches.jsx. Flagged as a cleanup item since April 2026; still not resolved.
3.5 Known Issues
WellnessFlow.jsx and MessagesFlow.jsx — dead code, not imported anywhere (superseded when AthletePortal.jsx inlined those screens directly). Safe to delete — worth confirming intent before removing in case they're a deliberate rollback path.
No separate "reset wellness PIN" admin action (currently rides on the unified portal PIN — fine unless that ever diverges).
AdminQuestions.jsx "Add new dimension" commits on blur only, no confirm button — easy to lose accidentally.
Hardcoded Supabase URL + anon key in src/lib/supabase.js — normal for anon-key + RLS setup, but worth a final RLS audit before treating as fully safe.


4. Locked Specs (do not modify during active pilot)
Intake instrument must remain locked across pilots to preserve comparable data — no changes until the product is solidified
Social Map three-administration structure (Set 1 / Set 2 / Set 1 repeat) tied to season phases
Mid-season Social Map joiners start at the current active administration — no catch-up required
Coaches see individual athlete wellness scores (not anonymized aggregates)


5. IP & Legal Status
Completed: IP inventory (delivered to lawyer as .docx)

Still pending for lawyer meeting:

Creation timeline
NDA template

Key IP categories:

Trademark candidates: brand name, tagline, logo (3 colorways — finalized as SVGs)
Copyright-eligible: assessment instruments, portal code
Trade secrets: scoring/classification logic, nomination weighting, three-administration structure
Speculative patent candidates: not yet scoped

CONFIRMED (2026-07-23): scoring and role-classification logic is still 100% client-side in the React rewrite — the trade-secret exposure is NOT resolved.

Verified by direct inspection of the production bundle (not just source):

recalculatePulseScores (src/lib/athleteApi.js:131–174) computes mention tallies, averages, and the exact classification ternary (Core Influencer / Polarizing Figure / Rejection Risk / Isolation Risk) entirely in browser JS, then writes results to pulse_report_scores via a direct client-side Supabase call (delete + insert) — not through any Postgres function, RPC, or edge function.
All five pulseAlgorithms.js functions (buildGroups/snake-draft, buildRoomingPairs, calculateFrictionProximity, calculateCohesionScore, determineRelationshipType) run client-side, imported directly into AthleteModal.jsx, PulseSingleView.jsx, PulseCompareView.jsx.
Confirmed present in plaintext in the actual Cloudflare-served production bundle (dist/assets/index-*.js) — Vite's default minifier shortens variable names but does not obfuscate string literals, classification logic, or control flow. Readable via basic browser dev tools, no special effort required.
No CREATE FUNCTION/CREATE TRIGGER touching scoring exists anywhere in the repo's SQL files — the only server-side function in the whole project is the generic updated_at timestamp trigger.
Secondary finding: an old single-HTML-file portal version with its own inline scoring logic (rpm_portal (10).html) is still committed to the GitHub repo's history — not served publicly, but a second copy of the trade-secret logic exists wherever repo access (clone/commit history) extends.

Fix scope (not yet implemented):

Score calculation — smaller lift: port recalculatePulseScores into a Postgres function or edge function (following the existing manage-coach-auth/get-message-url pattern), then tighten RLS so the browser can no longer write pulse_report_scores directly.
Pulse Report analytics (groupings, cohesion, friction proximity) — bigger lift, requires an architectural decision: compute chart-input data server-side too, or split sensitive comparison/grouping logic (server-side) from visualization-only aggregates (client-side). Needs scoping before implementation.


6. Pending Decisions / Open Questions
Is the React rewrite's scoring/classification logic (pulseAlgorithms.js) server-side now, or still client-side? ANSWERED 2026-07-23: confirmed still 100% client-side, visible in the production bundle. See Section 5 above. Still unresolved as of 2026-08-17.
Is the React rewrite considered pilot-ready? As of 2026-08-17, coach-side RLS is fixed and tested live, but athlete-side data access is confirmed exposed via the public anon key (Section 10) — pilot should be considered not yet fully secured until that's closed.
Priority/timeline for moving scoring server-side — does this need to happen before the lawyer meeting, or can the meeting proceed with the exposure disclosed as a known/in-progress item?
Delete or keep WellnessFlow.jsx / MessagesFlow.jsx (dead code) — deliberate rollback path or safe to remove?
Drop the legacy plaintext password columns on coaches/admins? PARTIALLY ANSWERED 2026-08-17: admins.password set to NULL. coaches.password intentionally kept — it's the mechanism for admin-set temp passwords coaches are forced to change on first login, not a leftover.
Formally deprecate/drop custom_questions table and its orphaned API functions?
When does the live pilot cut over from the single-HTML portal to the React rewrite?
Should the old rpm_portal (10).html file (with its own inline scoring logic) be purged from git history, or is repo access already tightly controlled enough that this isn't a practical risk?
NEW: Should the leaked admin password's git history be rewritten (force-push), or is rotation alone sufficient given the lawyer conversation is upcoming?
NEW, highest priority: timeline for building real athlete identity (PIN-verifying edge function + scoped token) to close the anon-key data exposure on roster, athlete_pins, wellness_checkins, panic_cycle_responses, social_map_responses, performance_cycles, and messages_athlete_view.


7. On the Horizon (needs re-sequencing given rewrite progress)
Resolve the Open Questions above (especially #1 and #2 — these affect IP/security claims)
Deliver remaining IP lawyer materials: creation timeline, NDA template
Formal Social Map interpretive-logic documentation (classification thresholds, question-weighting rules) — pending your answers to specific parameter questions raised previously
Methodology documentation for the Social Map specifically, for credible presentation to coaches/ADs
Expand pilot footprint: second D&E team (Women's Basketball or Men's Soccer recommended), Potomac State
USL League Two outreach — "pick your brain" style email not yet drafted
Finalize demo team naming (location-neutral collegiate names like Ridgeline/Summit are the leading direction)


8. Working Approach & Principles
Split: Claude.ai (this chat) for planning/strategy/documentation/outreach; Claude Code (CLI) for technical build/debug. Context bridged manually between sessions.
Scope discipline: feature set stays locked during active pilot phases before layering new complexity
Third-party tools rejected: CoachNow, Loom — everything (messaging, media) stays inside the Supabase-backed RPM ecosystem
Outreach tone: relational, low-pressure, "pick your brain" — never corporate/pitch-forward
Brand aesthetic: dark theme, green (#1A7A4A / #43B878) + red (#C0392B) accents, Manrope 800 weight


9. Tools & Resources
Category
Detail
Portal (live pilot)
Single HTML file → Cloudflare Pages via GitHub
Portal (rewrite)
React, component-per-feature, same Supabase instance
Backend
Supabase PostgreSQL + Auth + Storage + Realtime + Edge Functions
CLI tooling
Claude Code v2.1.76, Node.js v24.14.0, Git Bash (Windows 10)
Domain
rpmsystemsgroup.com (GoDaddy)
Document generation
pptxgenjs, Python + ReportLab, Word (.docx)
Brand assets
Logo finalized, 3 colorways, SVGs produced



10. Security Audit — Status as of 2026-08-17
✅ FIXED (verified live, not just planned):

1. Admin password rotation — DONE Old leaked password (RPMadmin26) confirmed dead (returns invalid_credentials). New password applied to the live Supabase Auth account. admins.password plaintext column set to NULL. supabase_auth_migration.sql:53 now holds a placeholder, not the real password. Note: the old password remains in git history permanently (rotation makes it useless, but doesn't erase it — history rewrite via force-push was offered but not done; revisit if that matters for the lawyer conversation).

2. Coach/admin RLS team-scoping — DONE Real policies applied (saved in supabase_rls_hardening_2026_08_17.sql): is_admin() and coach_team_id() helper functions added; coaches now scoped to team_id = coach_team_id() on team/roster/panic/social-map/pulse/wellness tables; sensitive admin-only tables (admins, coaches, athlete_pins, panic_cycle_documents, custom_questions, messages, message_notifications) now have zero coach access (verified no coach-facing component ever needed it) rather than false team-scoping. Tested live against a real coach account — confirmed locked out of another team's data (empty reads, explicit 403 on a write attempt) while own-team access and admin cross-team access both still work correctly.

Bonus fixes found + closed during this pass:

performance_cycles previously allowed any unauthenticated visitor to delete any team's performance cycles — DELETE removed, scoped to select/insert/update for anon, full access for admin.
questions/question_options previously allowed any unauthenticated visitor to deface the entire assessment question bank — locked to read-only for anon/authenticated, write reserved for admin.
Dead unused anon-read policy on message_notifications dropped.

All 7 previously-unverified tables (questions, question_options, performance_cycles, wellness_checkins, messages, message_notifications, messages_athlete_view) closed out — RLS was already enabled on all of them, but policies were dangerously permissive; now fixed except the athlete-facing view (see below).



🔴 NEW CRITICAL FINDING — NOT YET FIXED — athletes have no real database identity

Athlete access (PIN check) happens entirely in app-side JavaScript — never enforced by Postgres RLS. The public anon key (shipped to every browser on every page load) can currently be used to read another team's wellness scores, Panic Cycle responses, Social Map data, and performance cycles, simply by omitting the team/athlete filters the app normally sends — demonstrated directly by Claude Code, not theoretical. This affects: roster, athlete_pins, wellness_checkins, panic_cycle_responses, social_map_responses, performance_cycles, and the messages_athlete_view (a plain Postgres view that bypasses RLS entirely by design).

This is a real feature change, not a policy tweak — closing it means giving athletes an actual verifiable identity RLS can check (e.g., a PIN-verifying edge function that issues a scoped token), replacing the current "trust the client to filter correctly" model. Recommend treating this as the immediate next priority, given the pilot holds real athletes' confidential data.

Left unchanged, by design, lower concern: coaches.password still stores a plaintext value — but this is now the intended flow (admin sets a temp password, coach is forced to change it on first login), distinct from the admin's own permanent-password issue that's already fixed.

Also do now: revoke the Supabase Personal Access Token used to apply these fixes — Claude Code flagged this and it should not stay active.


Remaining action items
Priority: close the athlete-side anon-key exposure — design and implement real athlete identity (PIN-verifying edge function issuing a scoped token), then rewrite RLS for the 7 affected tables/view accordingly.
Revoke the Supabase Personal Access Token used for this fix.
Decide whether the leaked admin password needs a git history rewrite (force-push) ahead of the lawyer conversation, or if rotation alone is sufficient to disclose.
Wire src/lib/supabase.js to read from the existing .env file (still outstanding, not addressed in this pass).
Scoring/classification logic still runs entirely client-side (see Section 5) — unrelated to this security pass, still outstanding.



This document is the Google Drive read/share copy. The GitHub repo copy (maintained by Claude Code) should be treated as the technical source of truth; update this copy manually or ask Claude to refresh it when significant changes occur.
