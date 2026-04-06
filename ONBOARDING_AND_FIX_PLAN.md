# XamPreps Onboarding + Supabase to Firebase Migration Plan

Date: 2026-03-09  
Goal: stabilize MVP while migrating core platform services from Supabase to Firebase.

## 1. Target Stack (Firebase)

- Auth: **Firebase Authentication**
- Database: **Cloud Firestore** (primary app data)
- Storage: **Firebase Storage**
- Backend logic: **Cloud Functions for Firebase** (HTTP + callable + scheduled)
- Hosting: **Firebase Hosting**
- Realtime updates: Firestore listeners
- Optional analytics/monitoring: Firebase Analytics + Cloud Logging + Error Reporting

## 2. Migration Strategy (High-Level)

Use a **phased migration with controlled cutover**, not a big-bang rewrite:

1. Stabilize critical app risks first (authz bugs, linking flow, cross-user data leaks).
2. Build Firebase schema + security rules to mirror current behavior.
3. Introduce a backend abstraction layer in app code (repo/service layer).
4. Migrate feature-by-feature behind flags, with dual-run verification where needed.
5. Cut over production traffic to Firebase.
6. Decommission Supabase dependencies.

---

## 3. Onboarding Plan (Week 1)

### Day 1: Product and flow mapping

- Read:
  - `CODEBASE_REVIEW_REPORT.md`
  - `src/App.tsx`, `src/contexts/AuthContext.tsx`, role dashboards
- Map critical flows:
  - sign-up/login
  - exam list/start/submit/results
  - linking (requests + codes)
  - forum
  - admin moderation/exam management

### Day 2: Data model and authz inventory

- Extract current Supabase entities and access patterns.
- Build **Supabase -> Firestore mapping table** (collections, docs, indexes, constraints).
- Build **RLS -> Firestore Security Rules mapping**.

### Day 3: Firebase foundation setup

- Create Firebase project/environments.
- Configure Auth providers and role/custom-claims strategy.
- Scaffold Cloud Functions project + local emulators.
- Set Hosting config and deployment targets.

### Day 4-5: Start Phase 1 + Phase 2 migration workstreams

---

## 4. Phased Execution Plan

## Phase 1: Critical Stabilization (before heavy migration)

1. Fix route authorization edge cases (role-null bypass risk).
2. Fix cross-user data leak in recent-attempt queries.
3. Make account linking flows atomic and policy-consistent.
4. Remove/replace broken navigation routes.
5. Harden current edge-function auth checks (until Firebase functions replace them).

Exit criteria:

- No critical authz/data-leak known issues in current app behavior.

---

## Phase 2: Firebase Core Platform Setup

1. **Auth migration design**

- Define UID strategy and role model with custom claims (`student|parent|school|admin`).
- Implement signup/login/session lifecycle with Firebase Auth SDK.

2. **Firestore schema design**

- Define collections for:
  - profiles
  - user_roles or claims-backed role metadata
  - user_progress
  - exams/questions/question_parts
  - exam_attempts/question_history
  - subscriptions/billing records
  - notifications
  - link_requests/linked_accounts/link_codes
  - forum_categories/forum_posts/forum_replies
- Define required composite indexes upfront.

3. **Security rules**

- Translate Supabase RLS semantics into Firestore rules.
- Explicitly cover:
  - self read/write
  - linked-account scoped reads
  - admin-only writes
  - forum post/reply ownership and lock checks

4. **Storage migration setup**

- Create buckets/paths and Storage rules for:
  - question images
  - explanation PDFs

5. **Functions setup**

- Implement Cloud Functions replacements for:
  - AI explanations
  - study assistant
  - achievement checks
  - link redemption transactional flow

Exit criteria:

- Firebase project can run core services in emulator and staging.

---

## Phase 3: Data Migration and Dual-Run

1. **Export from Supabase**

- Export relational data and storage object manifests.

2. **Transform + import to Firestore**

- Build idempotent migration scripts:
  - relational rows -> document structures
  - enum conversions
  - timestamp normalization

3. **Storage copy**

- Copy Supabase storage assets to Firebase Storage paths.

4. **Dual-read / feature-flag rollout**

- Introduce data-access abstraction:
  - `ExamRepository`, `AuthRepository`, `ForumRepository`, etc.
- Toggle selected features to Firebase in staging first.

5. **Data parity verification**

- Run checksums/counts for key collections:
  - users, exams, attempts, links, posts, replies

Exit criteria:

- Firebase data parity validated for critical entities.

---

## Phase 4: Application Cutover

1. Switch app runtime integrations from Supabase client to Firebase SDK.
2. Replace Supabase auth context with Firebase auth provider + claims handling.
3. Replace Supabase edge function invocations with Firebase callable/HTTP functions.
4. Move deployment to Firebase Hosting + Functions pipelines.
5. Monitor logs/error rates and keep Supabase rollback window for defined period.

Exit criteria:

- Production traffic fully served by Firebase stack.

---

## Phase 5: Post-Cutover Cleanup

1. Remove Supabase client, types, migrations, and unused code paths.
2. Remove environment variables tied to Supabase.
3. Update README/runbooks/infra docs to Firebase-first.
4. Final security review of Firestore rules + Functions auth checks.
5. Performance tuning:

- hot query indexes
- batched writes for exam submit/history updates

Exit criteria:

- No runtime dependency on Supabase remains.

---

## 5. Firebase-Specific Risk Controls

- Use transactions for linking and other multi-step writes.
- Keep role checks server-backed (custom claims + rule checks).
- Never trust client-provided `userId` in functions.
- Add rate limits/abuse controls for AI proxy functions.
- Add strict CORS allowlist for public HTTP endpoints.

---

## 6. Recommended PR Breakdown

1. PR-1: Stabilization fixes (authz, data leak, linking consistency).
2. PR-2: Firebase project scaffolding + env/config + emulator workflow.
3. PR-3: Auth context migration (Firebase Auth + role claims).
4. PR-4: Firestore repositories + schema/index/rules baseline.
5. PR-5: Exam + attempts + progress flow migrated to Firestore.
6. PR-6: Linking + notifications + forum migrated.
7. PR-7: AI/achievement functions migrated to Cloud Functions.
8. PR-8: Hosting/deploy pipeline switched to Firebase.
9. PR-9: Supabase removal + final cleanup.

---

## 7. Validation and Test Gates

Minimum test gates per phase:

- Unit: repositories and permission guards.
- Integration: auth + exam submit + linking + forum moderation.
- E2E smoke:
  - sign up/login
  - take exam and view results
  - link student-parent/school
  - create/reply/moderate forum post
- Migration checks:
  - record counts and sample record integrity against Supabase source.

---

## 8. Immediate Next Actions

1. Approve Firebase target architecture and role/claims model.
2. Approve Firestore collection design draft and rules strategy.
3. Start PR-1 (critical stabilization) and PR-2 (Firebase scaffolding) in parallel.

---

## 9. Current Execution Status (Completed in Repo)

### Completed now

1. App runtime is Firebase-first across auth, exam flows, linking, notifications, forum, dashboards, and admin content paths.
2. Firebase callable surface now includes:
  - linking and linked-account transactions
  - exam content + attempts + history + review
  - forum user and admin actions
  - AI explanations and study assistant
  - admin exam/content management operations
3. Admin upload paths are migrated to Firebase Storage:
  - question image upload
  - batch image upload with callable-backed question image updates
  - explanation PDF upload/remove
4. Remaining Supabase runtime code was removed from `src/`.
5. Supabase code and dependency cleanup completed:
  - deleted `supabase/` directory
  - deleted `src/integrations/supabase/`
  - removed `@supabase/supabase-js` from `package.json`
6. Validation checks pass:
  - `npm run lint` (0 errors, warnings only)
  - `npm run build` successful
  - `npm --prefix functions run lint` successful

### Still open (migration-critical)

1. Firestore rules/index hardening needs final verification against all migrated queries and writes.
2. Staging parity tests against real user flows are still pending.
3. Legacy report docs still reference old Supabase findings as historical context.

---

## 10. Next Implementation Sprint (Ordered)

### Sprint A: Firebase Production Hardening

1. Finalize and validate Firestore + Storage rules with emulator tests for all role paths.
2. Confirm required Firestore composite indexes from live query logs.
3. Add defensive rate limits/validation for high-cost functions (`aiExplanations`, `studyAssistant`).

### Sprint B: Regression Testing + Data Parity

1. Execute E2E smoke for:
  - signup/login by role
  - exam lifecycle (start/submit/results/history/review)
  - parent/school linking and linked-student visibility
  - admin exam management and forum moderation
2. Verify migrated datasets in Firestore/Storage against expected counts and sample records.

### Sprint C: Operational Readiness

1. Update README/runbook for Firebase-only local development and deployment.
2. Add CI gates for lint/build/functions-lint and optional emulator test suite.
3. Define rollback and incident playbook for Functions + Firestore rule changes.
