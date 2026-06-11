# XamPreps Handover Report — Pre-Dashboard Refinement Phase

Date: 2026-04-12
Project: XamPreps
Focus completed: Auth + identity + linking stabilization
Next phase: Dashboard refinement using external feature research

## 1. Current status

The platform is now in a much better state than before.

Core identity and linking flows are working on the canonical path:
- student email login works
- managed student access-code login works
- parent signup/signin works
- teacher signup/signin works
- school admin signup/signin works
- signout works across tested dashboard layouts
- settings save writes to canonical identity docs
- parent, teacher, and school-admin linking flows work on canonical collections
- student relationship summary now supports:
  - multiple parents/guardians
  - multiple teachers
  - one school only

## 2. What was cleaned up

### Runtime legacy cleanup completed
Deleted dead legacy UI/linking files:
- `src/integrations/firebase/linking.ts`
- `src/components/settings/AccountLinkingSection.tsx`
- `src/components/dashboard/LinkedAccountsCard.tsx`
- `src/components/dashboard/LinkRequestsCard.tsx`
- `src/components/modals/AddStudentDialog.tsx`
- `src/components/modals/GenerateLinkCodeDialog.tsx`
- `src/components/modals/LinkChildDialog.tsx`
- `src/components/modals/RedeemLinkCodeDialog.tsx`
- `src/components/modals/SendLinkRequestDialog.tsx`
- `src/pages/dashboards/SchoolDashboardContent.tsx`

### Canonical active runtime files now driving auth/linking
- `src/App.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/pages/Auth.tsx`
- `src/components/layout/DashboardLayout.tsx`
- `src/pages/SettingsPage.tsx`
- `src/components/identity/StudentLinkCodesPanel.tsx`
- `src/pages/dashboards/ParentDashboardContent.tsx`
- `src/pages/dashboards/TeacherDashboard.tsx`
- `src/pages/dashboards/SchoolAdminDashboard.tsx`
- `src/integrations/firebase/identity.ts`

## 3. Canonical relationship rules now in effect

### Allowed
- one student -> many parents/guardians
- one student -> many teachers
- one teacher -> many students
- one parent -> many students

### Restricted
- one student -> one school only
- second conflicting school link must be rejected

## 4. Canonical collections in use

### Identity
- `users`
- `student_profiles`
- `adult_profiles`
- `user_progress`
- `student_access`
- `auth_login_aliases`

### Relationship/linking
- `student_link_codes`
- `parent_student_links`
- `teacher_student_links`
- `school_student_links`
- `teacher_school_links`
- `schools`

## 5. Relationship flows confirmed working

### Parent
- student-generated parent code -> parent claims
- parent-issued invite -> student claims
- parent dashboard now shows linked/managed students correctly

### Teacher
- teacher-created managed student -> appears in teacher roster
- student-generated teacher code -> teacher claims
- teacher-issued invite -> student claims
- student dashboard now shows linked teachers
- teacher dashboard shows linked students

### School admin
- student-generated school code -> school admin claims
- school-issued invite -> student claims
- student dashboard shows linked school

## 6. Student relationship summary contract

Student summary is now array-safe for parents and teachers, singular for school.

Expected shape:

```ts
{
  ok: boolean;
  parents: Array<{
    uid: string;
    displayName: string | null;
    email: string | null;
    relationshipLabel: string;
  }>;
  teachers: Array<{
    uid: string;
    displayName: string | null;
    email: string | null;
    schoolName?: string | null;
  }>;
  school: {
    id: string;
    name: string | null;
  } | null;
}
```

## 7. Known remaining issue before dashboard expansion

One broken historical auth user still needs repair before broad dashboard testing:
- UID: `9uJxCSFfttd8b25HqJgNzdCsOQM2`
- email: `teacher2@gmail.com`
- state: exists in Firebase Auth but missing canonical `users/{uid}` and canonical role profile
- classification: active and should be preserved, not deleted

Recommended repair:
1. decide intended role = `teacher`
2. create `users/{uid}`
3. create `adult_profiles/{uid}`
4. set matching custom claim `role=teacher`

## 8. Remaining intentional legacy traces

These still exist, but only for admin, repair, migration, or disabled compatibility surfaces:
- disabled legacy wrappers inside `src/integrations/firebase/identity.ts`
- disabled legacy callables / migration helpers inside `functions/index.js`
- admin repair/audit UI:
  - `src/pages/dashboards/BusinessConsole.tsx`
  - `src/components/admin/IdentityOpsPanel.tsx`
- disabled placeholder route:
  - `src/pages/dashboards/SchoolDashboard.tsx`

These are not part of normal mounted user runtime.

## 9. Recommended next phase

Start dashboard refinement in a fresh chat window.

Important: do **not** jump straight into implementation prompts blindly.
First, review the external dashboard feature research and decide the product shape per role.

Recommended order:
1. Student dashboard
2. Parent dashboard
3. Teacher dashboard
4. School admin dashboard
5. Admin / super admin dashboard
6. Settings polish per role

## 10. Principles for dashboard refinement phase

Use these constraints in the next chat:
- do not reopen auth/linking architecture unless a regression is proven
- keep canonical data model as source of truth
- improve one dashboard at a time
- break implementation into small safe passes
- keep every pass testable with screenshots + console output
- avoid big multi-dashboard refactors in one step
- no new legacy compatibility layers

## 11. Regression checklist to keep using during dashboard work

1. student email login
2. student access-code login
3. parent signup and signout
4. teacher signup and signout
5. school admin signup and signout
6. settings save writes canonical identity docs
7. student-generated parent code -> parent claim
8. parent-issued invite -> student claim
9. student-generated teacher code -> teacher claim
10. teacher-issued invite -> student claim
11. student-generated school code -> school admin claim
12. school-issued invite -> student claim
13. same student links to two different parents successfully
14. same student links to two different teachers successfully
15. duplicate same-parent claim returns `already_linked`
16. duplicate same-teacher claim returns `already_linked`
17. second different school link is rejected clearly
18. student relationship summary shows parents array, teachers array, single school
19. broken user `teacher2@gmail.com` is repaired before broad dashboard testing

## 12. What to bring into the next chat

Bring these into the fresh window:
- this handover report
- dashboard feature research
- screenshots of current dashboard states by role
- any priority order you want across roles
- any business rules for each role that must stay fixed

## 13. Suggested opening message for the next chat

Use this in the next window:

"We have completed the auth, identity, and linking stabilization phase for XamPreps. Use the attached handover report as current system context. We are now starting dashboard refinement. First review my dashboard feature research and help me turn it into a phased implementation plan. Do not reopen auth/linking architecture unless a regression is clearly proven. Work dashboard by dashboard in small safe steps. Start with analysis and prioritization before writing the first coding-agent prompt."
