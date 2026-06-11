# Admin Dashboard Audit Report

**Date:** 2026-04-13  
**Phase:** Admin Dashboard V1 Planning  
**Status:** Analysis Complete — No Code Changes Made

---

## A. Files Reviewed

### Core Admin Dashboard Files

| File                                        | Purpose                               | Status                                        |
| ------------------------------------------- | ------------------------------------- | --------------------------------------------- |
| `src/pages/dashboards/AdminDashboard.tsx`   | Main Admin dashboard page (774 lines) | **Live — Primary surface**                    |
| `src/App.tsx`                               | Route configuration                   | **Live — `/dashboard/admin` route confirmed** |
| `src/components/layout/DashboardLayout.tsx` | Shared dashboard wrapper with sidebar | **Live — Used by all dashboards**             |

### Admin Components

| File                                            | Purpose                                 | Status                |
| ----------------------------------------------- | --------------------------------------- | --------------------- |
| `src/components/admin/IdentityOpsPanel.tsx`     | Identity reset & test user provisioning | **Live — Functional** |
| `src/components/admin/AdminForumModeration.tsx` | Forum category/post moderation          | **Live — Functional** |
| `src/components/admin/ExamEditDialog.tsx`       | V2 exam metadata editing                | **Live — Functional** |
| `src/components/admin/CreateSchoolDialog.tsx`   | School organization creation            | **Live — Functional** |
| `src/components/admin/AddUserDialog.tsx`        | User provisioning                       | **Live — Functional** |

### Firebase Integration

| File                                 | Purpose                      | Status                          |
| ------------------------------------ | ---------------------------- | ------------------------------- |
| `src/integrations/firebase/admin.ts` | Admin Cloud Function clients | **Live — 8 callable functions** |

### Cloud Functions (Backend)

| Function                               | Purpose                          | Status                      |
| -------------------------------------- | -------------------------------- | --------------------------- |
| `adminDashboardSummary`                | Users list + stats               | **Live**                    |
| `adminListSchools`                     | School organizations list        | **Live**                    |
| `adminListSchoolAdminCandidates`       | Candidates for school admin role | **Live**                    |
| `adminAuditCanonicalIdentityCoverage`  | Identity audit                   | **Live — Super admin only** |
| `adminRepairCanonicalIdentityCoverage` | Identity repair                  | **Live — Super admin only** |
| `adminResetIdentitySystem`             | Full identity reset              | **Live — Super admin only** |
| `adminProvisionIdentityTestUser`       | Test user creation               | **Live**                    |

### Super Admin Surface

| File                                       | Purpose                  | Status                    |
| ------------------------------------------ | ------------------------ | ------------------------- |
| `src/pages/dashboards/BusinessConsole.tsx` | Super admin only console | **Live — Separate route** |

### Context Documents Reviewed

| File                                                            | Purpose                              |
| --------------------------------------------------------------- | ------------------------------------ |
| `docs/handover/xampreps_dashboard_phase_handover_2026-04-12.md` | Auth/identity stabilization handover |
| `docs/architecture/Recommended-dashboard-features.md`           | Dashboard feature recommendations    |
| `docs/BRAND-GUIDELINES-DASHBOARD-UI-MAPPING.md`                 | Brand & color system                 |

---

## B. Current Admin Dashboard Map

### Route & Access

- **Route:** `/dashboard/admin`
- **Allowed roles:** `admin`, `super_admin`
- **Layout:** `DashboardLayout` with role preview switcher

### Current Sections (Tab-based)

| Tab              | Content                                                | Data Source                                                       | Status         |
| ---------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | -------------- |
| **Users**        | User list table with search/filter, Add User dialog    | `adminDashboardSummary` → `users/{uid}`, `profiles`, `user_roles` | ✅ Live        |
| **Exams**        | V2 exam list table, edit dialog, preview actions       | `adminListExamsFirebase` → `exams` collection                     | ✅ Live        |
| **Schools**      | School organizations table, Create School dialog       | `adminListSchools` → `schools` collection                         | ✅ Live        |
| **Identity Ops** | Identity reset, test user provisioning, operation logs | `IdentityOpsPanel` component                                      | ✅ Live        |
| **Analytics**    | 4 placeholder cards ("coming soon")                    | None                                                              | ⚠️ Placeholder |
| **Community**    | Forum moderation (categories + posts)                  | `AdminForumModeration` component                                  | ✅ Live        |

### Stats Cards (Top of Dashboard)

| Card          | Data Source                                 | Status  |
| ------------- | ------------------------------------------- | ------- |
| Total Users   | `adminDashboardSummary.stats.totalUsers`    | ✅ Live |
| Total Exams   | `adminDashboardSummary.stats.totalExams`    | ✅ Live |
| Exam Attempts | `adminDashboardSummary.stats.totalAttempts` | ✅ Live |
| Premium Users | `adminDashboardSummary.stats.premiumUsers`  | ✅ Live |

### Preview Mode

The Admin dashboard includes a role preview switcher that allows admin/super_admin to view other dashboards:

- Student View
- Parent View
- Teacher View
- School Admin View
- Legacy School View (disabled)
- Admin View

### Duplicate/Separate Surfaces

| Surface              | Route                         | Access                 | Relationship                                                              |
| -------------------- | ----------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| **Business Console** | `/dashboard/business-console` | `super_admin` only     | Separate super admin surface with identity audit/repair, view-as switcher |
| **Admin Dashboard**  | `/dashboard/admin`            | `admin`, `super_admin` | Primary admin operations surface                                          |

**Note:** The Business Console and Admin Dashboard have some overlap (identity ops). The Business Console focuses on identity audit/repair while Admin Dashboard has IdentityOpsPanel with reset + test user provisioning.

---

## C. Admin Dashboard V1 Recommendation

### Proposed Section Order for V1

```
1. Platform Summary (top cards)
   ├── Total Users (by role breakdown)
   ├── Total Exams (by subject/level)
   ├── Exam Attempts (with trend)
   └── Active Schools

2. School Overview (new tab or enhanced Schools tab)
   ├── School list with status
   ├── Primary admin assignment
   └── Subscription tier

3. User Overview (enhanced Users tab)
   ├── User list with role filter
   ├── Role distribution summary
   └── Recent registrations

4. Content Management (enhanced Exams tab)
   ├── V2 exam library
   ├── Exam metadata editing
   └── Preview/access control

5. Review & Moderation Workflows
   ├── Forum moderation (existing Community tab)
   └── Model answer review workflow (defer — needs V2 marking data)

6. System Health (defer — needs new data)
   ├── Identity coverage status
   └── Platform activity metrics
```

### What to Keep

- Users tab with search/filter
- Exams tab with V2 editing
- Schools tab with organization management
- Identity Ops panel (for admin operations)
- Forum moderation (Community tab)
- Role preview switcher in sidebar

### What to Improve

- Analytics tab: Replace placeholders with real aggregated data
- Stats cards: Add role breakdown and trends
- Schools tab: Show more actionable info (active students, teacher count)

### What to Defer

- Full analytics dashboard (needs aggregation infrastructure)
- Revenue tracking (payment system not configured)
- Advanced reporting exports
- Real-time activity monitoring

---

## D. Data Readiness Table

| Section                              | Status        | Source                                          | Notes                                         |
| ------------------------------------ | ------------- | ----------------------------------------------- | --------------------------------------------- |
| **Platform Summary — Total Users**   | ✅ Ready now  | `adminDashboardSummary` → `users` collection    | Returns count from canonical or legacy        |
| **Platform Summary — Total Exams**   | ✅ Ready now  | `exams` collection via `adminListExamsFirebase` | V2 exams only                                 |
| **Platform Summary — Exam Attempts** | ✅ Ready now  | `exam_attempts` collection                      | Count only, no breakdown                      |
| **Platform Summary — Premium Users** | ✅ Ready now  | `subscriptions` collection where plan=Premium   | May be empty if no premium users              |
| **School Overview**                  | ✅ Ready now  | `schools` collection via `adminListSchools`     | Full school data available                    |
| **School Admin Candidates**          | ✅ Ready now  | `adminListSchoolAdminCandidates`                | Users with school_admin role                  |
| **User List by Role**                | ✅ Ready now  | `adminDashboardSummary` → `users`               | Limited to 200, role from canonical or legacy |
| **User Role Distribution**           | ⚡ Light work | Aggregate from `users` collection               | Need to query all users or sample             |
| **Active Schools Count**             | ⚡ Light work | Query `schools` where status=active             | Simple count aggregation                      |
| **Recent Registrations**             | ⚡ Light work | Query `users` orderBy createdAt desc            | Already partially in user list                |
| **Exam by Subject/Level**            | ⚡ Light work | Aggregate from `exams` collection               | Data exists, needs client-side grouping       |
| **Analytics — User Growth**          | ❌ Defer      | Needs `user_progress` or activity tracking      | No historical growth data                     |
| **Analytics — Exam Completions**     | ❌ Defer      | Needs aggregated attempt data                   | Raw attempts exist but no aggregation         |
| **Analytics — Revenue**              | ❌ Defer      | Payment system not configured                   | No revenue data available                     |
| **Analytics — Popular Subjects**     | ❌ Defer      | Needs attempt aggregation by subject            | Would need backend aggregation                |
| **Identity Coverage Status**         | ✅ Ready now  | `adminAuditCanonicalIdentityCoverage`           | Super admin only, already in Business Console |
| **Model Answer Review Queue**        | ⚡ Light work | `v2GetReviewQueue` Cloud Function               | Exists for V2 marking engine                  |

**Legend:**

- ✅ Ready now — Data source exists and is accessible
- ⚡ Light work — Data exists but needs aggregation or additional query
- ❌ Defer — Needs new backend contract or data infrastructure

---

## E. Brand Direction Note

### How Admin Dashboard Should Differ from School Admin and Teacher

Based on `docs/BRAND-GUIDELINES-DASHBOARD-UI-MAPPING.md`:

#### Color Application

| Dashboard        | Primary Color Role                   | Secondary Colors                                   | Feel                        |
| ---------------- | ------------------------------------ | -------------------------------------------------- | --------------------------- |
| **Student**      | Purple (structure) + Orange (action) | Green (success), Blue (info)                       | Energetic, motivating       |
| **Teacher**      | Purple (structure)                   | Blue (oversight), Orange (alerts)                  | Intervention-focused        |
| **School Admin** | Purple (structure)                   | Blue (reporting), Orange (actions)                 | Oversight + management      |
| **Admin**        | **Purple (structure)**               | **Blue (system health)**, **Orange (alerts only)** | **Platform-wide, systemic** |

#### Admin Dashboard Visual Principles

1. **Broader scope** — Show platform-wide metrics, not just single-school data
2. **Oversight-first** — Prioritize system health and coverage over individual actions
3. **Structured layout** — Use cards and tables consistently, avoid clutter
4. **Calm readability** — More blue (info) than orange (action), orange reserved for alerts/interventions
5. **Systemic indicators** — Use segmented progress bars for coverage/completeness (per brand guidelines)

#### Specific Recommendations

- Use **purple** for navigation, headers, and structural elements
- Use **blue** cards for informational content (stats, summaries, system status)
- Use **orange** sparingly — only for alerts, pending actions, or intervention prompts
- Use **green** for healthy/operational status indicators
- Use **amber** for warnings (e.g., schools pending setup, identity coverage gaps)
- Avoid red except for critical errors

---

## F. Minimal Next Implementation Pass

### Phase 1: Audit Complete (This Report)

- ✅ Analysis of current state
- ✅ Data source identification
- ✅ V1 scope definition

### Phase 2: Admin Dashboard V1 Implementation (Recommended Next)

**Scope:** Enhance existing Admin dashboard with real data visualization

1. **Enhance Stats Cards**
   - Add role breakdown to Total Users card
   - Add subject breakdown to Total Exams card
   - Add trend indicators where data supports

2. **Improve Analytics Tab**
   - Replace "coming soon" placeholders with:
     - User growth chart (from user creation dates)
     - Exam completion summary (from exam_attempts)
     - Subject popularity (from exams + attempts)

3. **Enhance Schools Tab**
   - Add student count per school
   - Add teacher count per school
   - Show subscription status more prominently

4. **Add System Health Card**
   - Identity coverage status (from audit function)
   - Platform uptime indicator
   - Recent activity summary

### Phase 3: Advanced Features (Future)

- Export functionality (CSV/PDF reports)
- Real-time activity monitoring
- Advanced filtering and search
- Bulk operations

---

## G. Validation

### TypeScript Check

```
npx tsc --noEmit
```

**Result:** ✅ No errors (build completed successfully)

### Production Build

```
npm run build
```

**Result:** ✅ Successful

```
dist/index.html                     1.85 kB │ gzip:   0.72 kB
dist/assets/index-bn5ORL5v.css    109.46 kB │ gzip:  17.79 kB
dist/assets/index-CfiYcxQx.js   1,145.64 kB │ gzip: 329.44 kB
```

### No Code Changes Made

This audit pass was analysis-only. No files were modified.

---

## Summary

The Admin dashboard is in a **functional but incomplete** state:

**Strengths:**

- Core data sources are live and accessible
- User, Exam, and School management tabs are functional
- Identity operations panel is well-implemented
- Forum moderation is complete
- Role preview switcher works well

**Gaps:**

- Analytics tab is placeholder-only
- No aggregated metrics or trends
- Limited platform-wide overview
- Some data sources mix canonical and legacy formats

**Recommendation:**
Proceed with Phase 2 implementation focusing on enhancing the Analytics tab and adding platform-wide summary metrics using existing data sources. The foundation is solid; the next pass should focus on data visualization and aggregation rather than new data contracts.
