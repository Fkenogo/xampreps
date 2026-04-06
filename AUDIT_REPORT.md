# XamPreps - Pre-Deployment Technical Audit Report

**Audit Date:** April 5, 2026  
**Auditor:** Senior Software Auditor  
**Product:** XamPreps - Ugandan Exam Preparation Platform  
**Scope:** Full repository audit for production readiness

---

## A. Executive Summary

### Overall Assessment: **NOT SAFE TO DEPLOY**

This application has **critical security vulnerabilities** and **deployment blockers** that must be resolved before any production release. The most severe issues are:

1. **Firestore security rules are completely open** - anyone can read/write all data until April 8, 2026 (3 days from audit date)
2. **Firebase API keys exposed in version control** - `.env.local` is committed with production credentials
3. **Missing Firestore indexes** - queries will fail in production
4. **No server-side payment processing** - payment flow is incomplete
5. **Inconsistent data schema** - dual camelCase/snake_case naming causes data integrity issues

### Deployment Status

- ❌ **BLOCKED** - Critical security issues
- ❌ **BLOCKED** - Exposed credentials
- ❌ **BLOCKED** - Missing database indexes
- ⚠️ **AT RISK** - Payment system incomplete
- ⚠️ **AT RISK** - Data schema inconsistencies

---

## B. Critical Issues (P0 - Must Fix Before Deployment)

### 1. Firestore Security Rules Expire in 3 Days

**Severity:** CRITICAL  
**File:** `firestore.rules`  
**Risk:** Complete data breach, unauthorized access to all user data

```javascript
// Current rule (line 15):
allow read, write: if request.time < timestamp.date(2026, 4, 8);
```

After April 8, 2026, ALL database operations will fail. Before that date, ANYONE can read/write ALL data.

**Fix Required:** Implement proper role-based security rules immediately.

### 2. Firebase API Keys Exposed in Version Control

**Severity:** CRITICAL  
**File:** `.env.local`  
**Risk:** Unauthorized access to Firebase project, quota exhaustion, data theft

The file contains:

- `VITE_FIREBASE_API_KEY=AIzaSyDvL8T0XsAmbp7Hjtc-6xKYSZuOzt4DYjg`
- `VITE_FIREBASE_PROJECT_ID=xampreps`
- `VITE_FIREBASE_AUTH_DOMAIN=xampreps.firebaseapp.com`

**Fix Required:**

1. Remove `.env.local` from git history
2. Add `.env.local` to `.gitignore`
3. Rotate all Firebase API keys
4. Use environment-specific configs

### 3. Missing Firestore Indexes

**Severity:** HIGH  
**File:** `firestore.indexes.json`  
**Risk:** Production queries will fail, app becomes unusable

The file contains only empty arrays:

```json
"indexes": [],
"fieldOverrides": []
```

Multiple queries in Cloud Functions require composite indexes that don't exist:

- `exam_attempts` queries with `userId` + `completedAt` ordering
- `question_history` queries with `userId` + `nextReview` filtering
- `forum_posts` queries with `categoryId` + `isPinned` ordering

### 4. No Payment Processing Implementation

**Severity:** HIGH  
**Files:** `src/pages/PaymentSuccessPage.tsx`, `src/components/pricing/`  
**Risk:** Revenue loss, user confusion, legal compliance issues

The payment flow shows a success page but:

- No actual payment gateway integration
- No subscription creation in Firestore
- No payment verification
- `subscriptions` collection is queried but never written to by the app

---

## C. Major Structural Gaps (P1)

### 1. Inconsistent Data Schema (Dual Naming Convention)

**Severity:** HIGH  
**Risk:** Data corruption, query failures, maintenance nightmare

The codebase uses BOTH camelCase AND snake_case for the same fields:

| Field       | camelCase    | snake_case    |
| ----------- | ------------ | ------------- |
| User ID     | `userId`     | `user_id`     |
| Exam ID     | `examId`     | `exam_id`     |
| Question ID | `questionId` | `question_id` |
| Created At  | `createdAt`  | `created_at`  |
| Updated At  | `updatedAt`  | `updated_at`  |
| Time Limit  | `timeLimit`  | `time_limit`  |
| Is Free     | `isFree`     | `is_free`     |

This pattern exists throughout:

- `functions/index.js` writes both variants
- Cloud Functions try both query patterns as fallbacks
- Firestore documents contain duplicate fields

**Example from `functions/index.js` (line 2055-2070):**

```javascript
const payload = {
  timeLimit: typeof d.time_limit === "number" ? d.time_limit : 60,
  time_limit: typeof d.time_limit === "number" ? d.time_limit : 60,
  isFree: !!d.is_free,
  is_free: !!d.is_free,
  // ... writes BOTH variants
};
```

### 2. Authentication Role Management Issues

**Severity:** HIGH  
**Files:** `src/contexts/AuthContext.tsx`, `firestore.rules`  
**Risk:** Privilege escalation, unauthorized access

Issues:

- Role is stored in `user_roles` collection but also expected in Firebase Auth claims
- No atomic transaction when creating user + role + progress
- Role can be changed client-side by modifying the `user_roles` document directly (once rules expire)
- `getIdTokenResult()` is called but custom claims are never set

### 3. Account Linking System Complexity

**Severity:** MEDIUM  
**Files:** `functions/index.js` (lines 31-532)  
**Risk:** Data inconsistency, orphaned records

The linking system has:

- `link_codes` collection for code-based linking
- `link_requests` collection for direct requests
- `linked_accounts` collection for established links
- Complex state machine with multiple paths to same outcome

### 4. Static/Demo Data in Production Code

**Severity:** MEDIUM  
**File:** `src/data/exams.ts`  
**Risk:** Confusion, maintenance issues

The `mockExams` array contains hardcoded exam data that appears to be for development/testing but is imported in production code paths.

---

## D. Medium Issues (P2)

### 1. AI Explanation Service Dependency

**Severity:** MEDIUM  
**File:** `functions/index.js` (lines 1824-1964)  
**Risk:** Service failure if API key missing or quota exceeded

- Depends on `LOVABLE_API_KEY` environment variable
- No fallback if AI service unavailable
- Uses external gateway (`ai.gateway.lovable.dev`)

### 2. Answer Checking Logic Inconsistencies

**Severity:** MEDIUM  
**Files:** `src/pages/ExamTakingPage.tsx`, `src/pages/ReviewSessionPage.tsx`  
**Risk:** Incorrect scoring, user frustration

The `normalizeText()` function and answer comparison logic:

- Removes periods, quotes, extra spaces
- Has special handling for "sh.", degrees, am/pm
- Uses substring matching for answers > 3 chars
- May incorrectly mark answers as correct

### 3. No Rate Limiting on Cloud Functions

**Severity:** MEDIUM  
**Risk:** Abuse, quota exhaustion, cost overrun

Cloud Functions have `maxInstances: 10` but no rate limiting per user.

### 4. Missing Error Boundaries

**Severity:** MEDIUM  
**Risk:** Poor user experience, hidden failures

While `ErrorBoundary` exists, it's only at the app root. Individual components lack error handling.

### 5. Forum Access Control

**Severity:** MEDIUM  
**File:** `functions/index.js` (lines 1556-1566)  
**Risk:** Unauthorized posting

Only parents and admins can create posts, but students can read all forum content. No category-level permissions.

---

## E. Minor Issues (P3)

### 1. Code Duplication

- Answer checking logic duplicated between `ExamTakingPage.tsx` and `ReviewSessionPage.tsx`
- Normalization functions should be shared utilities

### 2. Missing TypeScript Types

- Some Firebase function responses use `any` or incomplete types
- `QuestionWithParts` interface defined in multiple places

### 3. Hardcoded Values

- Daily XP goal hardcoded to 50 in `StudentDashboard.tsx`
- Subject list hardcoded to 4 subjects
- Max instances hardcoded to 10

### 4. No Unit Tests

- No test files found in repository
- No test configuration beyond ESLint

### 5. Console.log in Production

- Multiple `console.error()` and `console.log()` statements left in code
- Should use proper logging service

---

## F. Feature Completion Map

| Feature               | Status      | Evidence                                         | Risk         | Action                            |
| --------------------- | ----------- | ------------------------------------------------ | ------------ | --------------------------------- |
| User Registration     | Complete    | Auth.tsx, AuthContext                            | Low          | -                                 |
| User Login            | Complete    | Auth.tsx, AuthContext                            | Low          | -                                 |
| Student Dashboard     | Complete    | StudentDashboard.tsx                             | Low          | -                                 |
| Parent Dashboard      | Complete    | ParentDashboard.tsx                              | Low          | -                                 |
| School Dashboard      | Complete    | SchoolDashboard.tsx                              | Low          | -                                 |
| Admin Dashboard       | Complete    | AdminDashboard.tsx                               | Low          | -                                 |
| Exam Taking           | Complete    | ExamTakingPage.tsx                               | Medium       | Fix answer checking               |
| Exam History          | Complete    | HistoryPage.tsx                                  | Low          | -                                 |
| Review Sessions       | Complete    | ReviewSessionPage.tsx                            | Low          | -                                 |
| Forum                 | Complete    | ForumPage.tsx                                    | Medium       | Add moderation tools              |
| Account Linking       | Complete    | Multiple modals + functions                      | Medium       | Simplify flow                     |
| AI Explanations       | Complete    | Functions + hooks                                | Medium       | Add fallback                      |
| **Payments**          | **Broken**  | PaymentSuccessPage shows success without payment | **High**     | **Implement payment gateway**     |
| **Security Rules**    | **Broken**  | Open rules expire in 3 days                      | **Critical** | **Implement proper rules**        |
| **Firestore Indexes** | **Missing** | Empty indexes.json                               | **High**     | **Add required indexes**          |
| Achievements          | Partial     | Displayed but not awarded                        | Low          | Implement achievement system      |
| Notifications         | Partial     | CRUD exists but no triggers                      | Low          | Add notification triggers         |
| Subscriptions         | Broken      | Read but never written                           | High         | Implement subscription management |

---

## G. Security Findings

| Severity | Issue                                             | Risk                        | Fix                               |
| -------- | ------------------------------------------------- | --------------------------- | --------------------------------- |
| CRITICAL | Firestore rules allow all access until 2026-04-08 | Complete data breach        | Implement role-based rules        |
| CRITICAL | API keys in version control                       | Unauthorized project access | Remove, rotate, add to .gitignore |
| HIGH     | No server-side validation on user input           | Injection attacks           | Validate in Cloud Functions       |
| HIGH     | Direct Firestore access from client               | Data manipulation           | Restrict via security rules       |
| MEDIUM   | No rate limiting on functions                     | Abuse/DoS                   | Add rate limiting                 |
| MEDIUM   | AI API key in environment                         | Service disruption          | Use secret manager                |
| MEDIUM   | Forum allows anonymous reads                      | Content scraping            | Require authentication            |
| LOW      | No CSRF protection                                | Session hijacking           | Add CSRF tokens                   |
| LOW      | Password requirements minimal (6 chars)           | Weak passwords              | Enforce stronger requirements     |

---

## H. Database / Schema Findings

### Collections Identified:

1. `profiles` - User profile data
2. `user_roles` - Role assignments
3. `user_progress` - XP, streaks, achievements
4. `exams` - Exam metadata
5. `questions` - Question data
6. `question_parts` - Question sub-parts with answers
7. `exam_attempts` - User exam submissions
8. `question_history` - Spaced repetition tracking
9. `forum_categories` - Forum categories
10. `forum_posts` - Forum posts
11. `forum_replies` - Forum replies
12. `link_codes` - Parent/school linking codes
13. `link_requests` - Account link requests
14. `linked_accounts` - Established account links
15. `notifications` - User notifications
16. `achievements` - Available achievements
17. `user_achievements` - Earned achievements
18. `subscriptions` - Payment subscriptions (NOT IMPLEMENTED)
19. `paper_purchases` - Pay-per-paper purchases (PARTIAL)

### Schema Issues:

1. **Dual naming convention** - Every field exists in both camelCase and snake_case
2. **Missing required indexes** - Queries will fail without indexes
3. **No data validation** - Any field can be any type
4. **Orphaned collections** - `subscriptions` queried but never written
5. **Inconsistent timestamps** - Some use `serverTimestamp()`, some use ISO strings

---

## I. Deployment Checklist

### Before Deployment (BLOCKERS):

- [ ] **Implement proper Firestore security rules**
- [ ] **Remove `.env.local` from git and rotate all API keys**
- [ ] **Add required Firestore indexes**
- [ ] **Implement payment processing or remove payment UI**
- [ ] **Fix dual naming convention in data schema**
- [ ] **Add environment-specific configuration**

### Week 1 After Launch:

- [ ] Add rate limiting to Cloud Functions
- [ ] Implement proper logging (replace console.log)
- [ ] Add unit tests for critical paths
- [ ] Implement subscription management
- [ ] Add achievement awarding logic
- [ ] Set up monitoring and alerting

### Later:

- [ ] Refactor answer checking to shared utility
- [ ] Simplify account linking flow
- [ ] Add comprehensive error boundaries
- [ ] Implement A/B testing framework
- [ ] Add analytics tracking

---

## J. Priority Fix Plan

### P0 - Fix Before Deployment (BLOCKERS)

| Issue            | Files                      | Fix                        | Difficulty | Risk if Ignored          |
| ---------------- | -------------------------- | -------------------------- | ---------- | ------------------------ |
| Firestore rules  | `firestore.rules`          | Implement role-based rules | Medium     | **APP BREAKS IN 3 DAYS** |
| Exposed API keys | `.env.local`, `.gitignore` | Remove, rotate, ignore     | Easy       | **DATA BREACH**          |
| Missing indexes  | `firestore.indexes.json`   | Add composite indexes      | Medium     | **QUERIES FAIL**         |
| Payment system   | Multiple files             | Implement or remove        | Hard       | **REVENUE LOSS**         |

### P1 - Fix Within First Week

| Issue                   | Files                                | Fix                      | Difficulty |
| ----------------------- | ------------------------------------ | ------------------------ | ---------- |
| Dual naming             | `functions/index.js`, all data files | Standardize on camelCase | Hard       |
| Rate limiting           | `functions/index.js`                 | Add per-user limits      | Medium     |
| Subscription management | Functions + frontend                 | Implement full flow      | Medium     |

### P2 - Fix Later

| Issue            | Files                                         | Fix                         | Difficulty |
| ---------------- | --------------------------------------------- | --------------------------- | ---------- |
| Answer checking  | `ExamTakingPage.tsx`, `ReviewSessionPage.tsx` | Extract to shared utility   | Easy       |
| AI fallback      | `functions/index.js`                          | Add static explanations     | Easy       |
| Error boundaries | Multiple components                           | Add granular error handling | Medium     |

---

## K. Suggested Refactors

### 1. Data Layer Refactoring

Create a unified data access layer that:

- Handles camelCase ↔ snake_case conversion
- Provides typed interfaces
- Centralizes Firestore operations

### 2. Answer Checking Service

Extract answer comparison logic to a shared service with:

- Configurable normalization rules
- Subject-specific comparison strategies
- Unit test coverage

### 3. Authentication Service

Refactor auth to:

- Use Firebase Auth custom claims for roles
- Implement atomic user creation
- Add proper session management

### 4. Payment Service

If keeping payments:

- Integrate with Stripe/PayPal
- Implement webhook handling
- Add subscription lifecycle management

---

## L. Evidence - Key Files Reviewed

### Critical Files:

1. `firestore.rules` - Lines 1-18: Open security rules
2. `.env.local` - Lines 1-8: Exposed API keys
3. `firestore.indexes.json` - Lines 49-50: Empty indexes
4. `functions/index.js` - 2450 lines of Cloud Functions
5. `src/contexts/AuthContext.tsx` - Authentication implementation
6. `src/pages/ExamTakingPage.tsx` - Core exam functionality

### Supporting Files:

7. `src/App.tsx` - Routing and app structure
8. `src/components/ProtectedRoute.tsx` - Route protection
9. `src/pages/dashboards/*.tsx` - Dashboard implementations
10. `src/data/exams.ts` - Mock exam data
11. `package.json` - Dependencies and scripts

---

## Conclusion

This application has a solid foundation with well-implemented core features (exam taking, user management, dashboards). However, **it is NOT ready for production deployment** due to critical security vulnerabilities and missing infrastructure.

The most urgent issues are:

1. **Firestore security rules expire in 3 days** - app will break completely
2. **API keys are publicly exposed** - security risk
3. **Missing database indexes** - app will fail in production

**Recommendation:** Do not deploy until P0 issues are resolved. Allocate 1-2 weeks for security fixes and infrastructure setup before considering production release.
