# XamPreps MVP Codebase Review Report

Date: 2026-03-09  
Reviewer: Senior engineering audit (initial onboarding pass)  
Scope: Full repository static review (no code changes in this phase)

## 1. Product Understanding

### What this app does
XamPreps is an exam-prep platform for Ugandan national exams (PLE, UCE, UACE).  
It lets learners practice papers, take simulated exams, review performance, and get AI-supported explanations.

### Target users (inferred)
- Students: take exams, review mistakes, build streak/XP, use study assistant.
- Parents: monitor linked children and progress.
- Schools: monitor linked students and cohort performance.
- Admins: manage exams/questions/users and moderate community forum.

### Primary use cases
- Student signs up and starts practice/simulation.
- Parent/school links to student account and tracks activity.
- Admin curates exam content and moderates forum.

## 2. Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind + shadcn/ui + Radix UI
- React Router v6
- TanStack Query (light usage)

### Backend / Data / Services
- Supabase Auth + Postgres + Storage + Realtime + Edge Functions
- Supabase RLS policies and SQL migrations
- AI via Supabase Edge Functions forwarding to Lovable AI gateway

### Tooling
- ESLint configured, but TypeScript strictness intentionally relaxed (`strict: false`)
- Build/lint scripts are npm-based

## 3. High-Level Architecture

- `src/App.tsx` defines routing and role-protected pages.
- `AuthContext` manages session, profile, role, and progress state from Supabase.
- Pages are role-segmented (`student`, `parent`, `school`, `admin`) with shared `DashboardLayout`.
- Most business logic runs in the client and directly queries Supabase.
- Supabase Edge Functions handle:
  - AI explanations (`ai-explanations`)
  - Study assistant streaming chat (`study-assistant`)
  - Achievement awarding (`check-achievements`)

## 4. Implemented Features

- Auth/sign-up with role metadata.
- Role dashboards:
  - Student dashboard with stats, recent activity, exam finder, AI chat.
  - Parent and school dashboards with linked student summaries.
  - Admin dashboard with user/exam/forum management surfaces.
- Exam library with filters, list/grid, and mode selector.
- Exam taking in `practice`, `quiz`, and `simulation` UI modes.
- Results page with overview + per-question review.
- Spaced repetition review session from `question_history`.
- Account linking:
  - link requests
  - code generation/redeeming (`link_codes`)
- Forum and admin moderation tools.
- Notification bell with realtime inserts.

## 5. Partial / Incomplete Areas

- Monetization/access controls are scaffolded but not fully integrated into exam flow.
- Upgrade prompt system exists but is effectively stubbed.
- Admin analytics panels are placeholders.
- Legacy/unused pages remain in `src/pages` alongside active pages.

## 6. Code Quality & Structure Review

### Positives
- Reasonable domain-oriented foldering.
- UI components are mostly reusable.
- Data model is substantial and RLS-aware.

### Concerns
- Mixed legacy and active implementations increase cognitive load and maintenance risk.
- Heavy reliance on client-side direct DB writes for critical flows.
- Multiple `any`/casts and relaxed TS settings reduce safety.
- Navigation and access behavior have inconsistencies.
- README is generic boilerplate and not product-specific.

## 7. Feature Audit and Gaps

### Auth / role routing
- Intended: strict role protection.
- Actual: role guard can pass when role is not loaded/null in some scenarios.

### Exam access/paywall
- Intended: free/purchased/subscription gating.
- Actual: hook exists but is not integrated in start-exam path; schema mismatch exists.

### Exam taking/results
- Intended: reliable submit and result review.
- Actual: works generally; “view detailed results” relies on fetching latest attempt (not explicit insert return), which can be fragile.

### Account linking
- Intended: request-based + code-based linking.
- Actual: both exist, but request flow and policies are inconsistent for student-initiated requests; code redemption is non-atomic.

### Forum
- Intended: parent community + admin moderation.
- Actual: mostly complete, with policy/UI mismatches around who can post/reply.

## 8. Issues List

## ❌ Bugs

1. Role-protected route bypass risk when `role` is null  
   - File: `src/components/ProtectedRoute.tsx`  
   - Severity: critical

2. Sidebar links to non-existent routes (`/children`, `/reports`, `/students`, `/analytics`, `/admin/*`)  
   - File: `src/components/layout/DashboardLayout.tsx`  
   - Severity: medium

3. Quick Exam Finder can load another user’s recent exam  
   - File: `src/components/dashboard/QuickExamFinder.tsx`  
   - Severity: critical

4. Student “send request to parent” path conflicts with RLS policy  
   - Files: `src/components/settings/AccountLinkingSection.tsx`, `src/components/modals/SendLinkRequestDialog.tsx`, migration policies  
   - Severity: high

5. Link code redemption can mark code used before link creation succeeds (non-atomic)  
   - File: `src/components/modals/RedeemLinkCodeDialog.tsx`  
   - Severity: high

6. Settings form can initialize stale values before profile hydration  
   - File: `src/pages/SettingsPage.tsx`  
   - Severity: medium

## ⚠️ Logical Gaps / Incomplete

1. Paywall/access hook not wired into exam start flow  
   - Files: `src/hooks/useExamAccess.ts`, `src/pages/ExamsPage.tsx`  
   - Severity: high

2. Upgrade prompt logic hardcoded/no-op  
   - File: `src/hooks/useUpgradePrompts.ts`  
   - Severity: medium

3. Admin analytics tabs are placeholders  
   - File: `src/pages/dashboards/AdminDashboard.tsx`  
   - Severity: low

4. Legacy page set still present and potentially misleading  
   - Files: `src/pages/ExamPage.tsx`, `src/pages/ExamListPage.tsx`, `src/pages/LoginPage.tsx`, `src/pages/StudentDashboard.tsx`  
   - Severity: low

## 🔐 Security Concerns

1. `check-achievements` edge function trusts arbitrary `userId` while using service role  
   - File: `supabase/functions/check-achievements/index.ts`  
   - Severity: critical

2. AI edge functions have permissive CORS and no explicit auth checks  
   - Files: `supabase/functions/study-assistant/index.ts`, `supabase/functions/ai-explanations/index.ts`  
   - Severity: high

3. Frontend chat uses publishable key bearer for function calls  
   - File: `src/components/chat/StudyAssistant.tsx`  
   - Severity: high

4. `.env` is tracked and not ignored  
   - Files: `.env`, `.gitignore`  
   - Severity: medium

## 📉 Performance / Scalability Risks

1. Exam submission updates question history with sequential per-item DB operations  
   - File: `src/pages/ExamTakingPage.tsx`  
   - Severity: medium

2. Forum reply counts are fetched and aggregated in app layer repeatedly  
   - Files: `src/pages/ForumPage.tsx`, `src/components/admin/AdminForumModeration.tsx`  
   - Severity: low

## 🧩 Integration Problems

1. Subscription model mismatch (`Standard` used in app vs `Free|Premium` enum in DB/types)  
   - Files: migrations + `src/integrations/supabase/types.ts` + app hooks/layout  
   - Severity: high

2. Access hook references schema elements not present in typed DB (`paper_purchases`, free-trial columns)  
   - File: `src/hooks/useExamAccess.ts`  
   - Severity: high

3. Local execution tooling unavailable in this environment (no node/npm/bun binaries)  
   - Impact: build/lint/test commands could not be executed during this audit.  
   - Severity: medium

## 🧪 Testing Coverage

- No meaningful test suite detected (unit/integration/e2e absent).
- No clear CI quality-gate config in this repo snapshot.

## 9. Overall Assessment

The MVP has substantial feature coverage and a viable product core, but reliability and security are below production-ready threshold due to role-guard edge cases, linking flow inconsistencies, schema drift in monetization, and weak edge-function hardening.  

The codebase is salvageable with focused stabilization work before feature expansion.

---

## Addendum (2026-03-10)

This report reflects the initial onboarding audit snapshot from 2026-03-09.

Since that audit:
- The app runtime has been migrated to Firebase-first paths.
- Supabase runtime code and dependencies were removed from active source paths.

Supabase references in this report should be treated as historical findings from the pre-migration baseline.
