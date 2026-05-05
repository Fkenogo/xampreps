# XamPreps Identity Model V2

This document defines the additive canonical identity model for the XamPreps auth redesign.

## Goals

- keep `student` as an independent Firebase Auth identity in every onboarding path
- make `teacher` and `school_admin` first-class auth users
- model `school` as an organization record, not a login user
- store supervision and management relationships in explicit link collections
- introduce the new structure without breaking current auth and linking flows during rollout

## Canonical Roles

Real auth users:

- `student`
- `parent`
- `teacher`
- `school_admin`
- `admin`
- `super_admin`

Non-auth entities:

- `schools`

## Canonical Collections

### `users/{uid}`

Canonical identity record for every real auth user.

Key fields:

- `uid`
- `primaryRole`
- `secondaryRoles`
- `status`
- `displayName`
- `email`
- `phone`
- `hasEmailLogin`
- `createdBy`
- `authProviderSummary`
- `profileVersion`
- `createdAt`
- `updatedAt`

### `schools/{schoolId}`

Institution record. Not a login identity.

Key fields:

- `schoolId`
- `name`
- `registrationNumber`
- `country`
- `district`
- `schoolType`
- `status`
- `subscriptionTier`
- `onboardingMode`
- `primaryAdminUid`
- `billingOwnerUid`
- `createdBy`
- `createdAt`
- `updatedAt`

### `student_profiles/{uid}`

Student-only profile attributes.

Key fields:

- `uid`
- `firstName`
- `lastName`
- `preferredName`
- `dateOfBirth`
- `country`
- `educationLevel`
- `gradeLevel`
- `candidateNumber`
- `learningMode`
- `loginMode`
- `onboardingState`
- `mustChangePassword`
- `mustSetPin`
- `createdAt`
- `updatedAt`

### `adult_profiles/{uid}`

Adult auth-user profile for:

- `parent`
- `teacher`
- `school_admin`

Key fields:

- `uid`
- `adultType`
- `firstName`
- `lastName`
- `phone`
- `country`
- `jobTitle`
- `status`
- `createdAt`
- `updatedAt`

### `student_access/{studentUid}`

Managed student login metadata for non-email access.

Key fields:

- `studentUid`
- `accessCode`
- `accessCodeNormalized`
- `temporarySecretHash`
- `pinHash`
- `passwordInitialized`
- `failedAttempts`
- `lockedUntil`
- `lastAccessCodeRotationAt`
- `lastLoginAt`
- `credentialState`
- `createdAt`
- `updatedAt`

Notes:

- never store plain password or PIN
- `accessCode` is a bootstrap identifier, not a replacement auth system

### `auth_login_aliases/{aliasKey}`

Fast alias-to-uid resolver for access-code login.

Key fields:

- `aliasKey`
- `uid`
- `type`
- `status`
- `createdAt`
- `updatedAt`

### `parent_student_links/{parentUid_studentUid}`

Parent-to-student supervision link.

Key fields:

- `parentUid`
- `studentUid`
- `relationshipType`
- `status`
- `permissions`
- `createdBy`
- `createdAt`

### `school_student_links/{schoolId_studentUid}`

School-to-student roster link.

Key fields:

- `schoolId`
- `studentUid`
- `status`
- `studentNumber`
- `className`
- `streamName`
- `startDate`
- `endDate`
- `permissions`
- `createdBy`
- `createdAt`

### `teacher_student_links/{teacherUid_studentUid}`

Teacher-to-student relationship link.

Key fields:

- `teacherUid`
- `studentUid`
- `status`
- `source`
- `scope`
- `subjectTags`
- `permissions`
- `createdBy`
- `createdAt`

### `teacher_school_links/{teacherUid_schoolId}`

Teacher association with a school organization.

Key fields:

- `teacherUid`
- `schoolId`
- `status`
- `employmentType`
- `subjectTags`
- `createdBy`
- `createdAt`

### `school_admin_links/{schoolId_uid}`

School admin membership link to an institution.

Key fields:

- `schoolId`
- `uid`
- `role`
- `status`
- `permissions`
- `createdBy`
- `createdAt`

### `student_creation_records/{recordId}`

Audit trail for every managed student provisioning event.

Key fields:

- `recordId`
- `studentUid`
- `createdByUid`
- `createdByRole`
- `creationMethod`
- `initialLinkTargets`
- `initialAccessCode`
- `setupState`
- `createdAt`

### `admin_preview_sessions/{sessionId}`

Admin-only preview/impersonation metadata.

Key fields:

- `sessionId`
- `adminUid`
- `targetUid`
- `targetRole`
- `reason`
- `createdAt`
- `expiresAt`

## Relationship Rules

- a student may exist without any parent, teacher, or school link
- a student may have one or more parent links later
- a student may have one active school link at a time in the first rollout
- a student may have multiple teacher links
- a teacher may be independent or linked to a school
- a school can continue existing even if a school admin leaves

## Current Schema Conflicts

The current app still uses legacy auth/linking assumptions that conflict with this model:

1. `school` is currently treated as a login role in:
- [`AuthContext.tsx`](/Users/theo/xampreps/src/contexts/AuthContext.tsx)
- [`App.tsx`](/Users/theo/xampreps/src/App.tsx)
- current dashboard routing

2. Role resolution still depends on legacy `user_roles/{uid}` values that include `school`.

3. Human profile data is still stored in the legacy `profiles/{uid}` collection.

4. Parent/school-to-student relationships currently depend on:
- `link_codes`
- `linked_accounts`
- post-signup linking flows

5. The current model assumes many students self-register first, then connect later.

## Phase 1 Scope

Phase 1 only introduces:

- canonical type definitions
- validation helpers
- Firestore helper layer
- architecture documentation

It does **not** yet:

- replace current auth
- create new login flows
- migrate existing users
- deprecate legacy collections

## Recommended Next Steps

1. add role foundation for `teacher` and `school_admin`
2. introduce `schools` as organization data
3. add server-side managed student provisioning
4. add access-code login bootstrap
5. add compatibility/migration layer before removal of legacy linking
