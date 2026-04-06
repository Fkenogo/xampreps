# Firebase Data Model Draft (Supabase Migration)

Date: 2026-03-09  
Status: Draft v1 (implementation-ready baseline)

## 1. Conventions

- User ID source of truth: `request.auth.uid` (Firebase Auth UID)
- Timestamps: Firestore `Timestamp`
- Role source:
  - Primary: Auth custom claims (`role`)
  - Secondary mirror (optional): `/user_roles/{uid}` for UI queries/admin tooling
- Denormalization allowed for read-heavy views (dashboard/forum cards)

---

## 2. Collection Design

## `profiles/{uid}`
User profile and metadata.

Fields:
- `name: string`
- `email: string`
- `avatarUrl?: string`
- `level?: "PLE" | "UCE" | "UACE"`
- `school?: string`
- `dob?: string` (ISO date)
- `phone?: string`
- `contactPerson?: string`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

Indexes:
- `email` (for admin/search flows if needed)

---

## `user_progress/{uid}`
Gamification and streak state.

Fields:
- `xp: number`
- `streak: number`
- `lastExamDate?: string` (YYYY-MM-DD)
- `freeTrialUsed?: boolean`
- `freeTrialExamId?: string`
- `updatedAt: Timestamp`

---

## `subscriptions/{uid}`
Subscription status keyed by user.

Fields:
- `plan: "Free" | "Standard" | "Premium"` (final enum to be confirmed)
- `billingCycle?: "monthly" | "annual"`
- `startsAt: Timestamp`
- `expiresAt?: Timestamp`
- `updatedAt: Timestamp`

---

## `billing_records/{recordId}`

Fields:
- `userId: string`
- `subscriptionId?: string`
- `amount: number`
- `description: string`
- `paidAt: Timestamp`

Indexes:
- `userId + paidAt(desc)`

---

## `achievements/{achievementId}`
Achievement catalog.

Fields:
- `name: string`
- `slug: string` (stable ID for function checks, e.g. `first-steps`)
- `description: string`
- `icon?: string`
- `xpReward: number`
- `createdAt: Timestamp`

Indexes:
- `slug` unique-enforced in function/admin workflow

---

## `user_achievements/{uid}_{achievementId}` (or subcollection)
Option A (flat collection) recommended for easier querying.

Fields:
- `userId: string`
- `achievementId: string`
- `earnedAt: Timestamp`

Indexes:
- `userId + earnedAt(desc)`
- `achievementId` (optional)

---

## `exams/{examId}`

Fields:
- `title: string`
- `subject: string`
- `topic?: string`
- `year: number`
- `level: "PLE" | "UCE" | "UACE"`
- `timeLimit: number` (minutes)
- `questionCount: number`
- `avgScore: number`
- `isFree: boolean`
- `type: "Past Paper" | "Practice Paper"`
- `difficulty: "Easy" | "Medium" | "Hard"`
- `description?: string`
- `pdfSummary?: string`
- `explanationPdfUrl?: string`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

Indexes:
- `level + year(desc)`
- `type + level + year(desc)`
- `subject + level + year(desc)`
- `isFree + level + year(desc)`

---

## `exams/{examId}/questions/{questionId}`

Fields:
- `questionNumber: number`
- `text: string`
- `imageUrl?: string`
- `tableData?: map`
- `createdAt: Timestamp`

Indexes:
- `questionNumber asc`

---

## `exams/{examId}/questions/{questionId}/parts/{partId}`

Fields:
- `text: string`
- `marks: number`
- `answer: string`
- `explanation?: string`
- `answerType: "text" | "numeric" | "open-ended"`
- `orderIndex: number`
- `createdAt: Timestamp`

Indexes:
- `orderIndex asc`

---

## `exam_attempts/{attemptId}`

Fields:
- `userId: string`
- `examId: string`
- `mode: "practice" | "simulation"` (`quiz` UI maps to `practice`)
- `score: number`
- `totalQuestions: number`
- `timeTaken?: number` (seconds)
- `completedAt: Timestamp`

Indexes:
- `userId + completedAt(desc)`
- `userId + examId + completedAt(desc)`
- `examId + completedAt(desc)` (analytics/admin)

---

## `question_history/{uid_partId}`

Fields:
- `userId: string`
- `questionPartId: string`
- `examId: string`
- `lastAttempt: Timestamp`
- `isCorrect: boolean`
- `streak: number`
- `nextReview: Timestamp`

Indexes:
- `userId + nextReview(asc)`
- `userId + streak(desc)`

---

## `notifications/{notificationId}`

Fields:
- `userId: string`
- `text: string`
- `read: boolean`
- `createdAt: Timestamp`

Indexes:
- `userId + createdAt(desc)`
- `userId + read + createdAt(desc)`

---

## `link_requests/{requestId}`

Fields:
- `requesterId: string`
- `targetId: string`
- `status: "pending" | "accepted" | "rejected"`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

Indexes:
- `targetId + status + createdAt(desc)`
- `requesterId + status + createdAt(desc)`

---

## `linked_accounts/{linkId}`

Fields:
- `parentOrSchoolId: string`
- `studentId: string`
- `linkedAt: Timestamp`

Indexes:
- `parentOrSchoolId + linkedAt(desc)`
- `studentId + linkedAt(desc)`
- optional unique guard via deterministic ID `${parentOrSchoolId}_${studentId}`

---

## `link_codes/{codeId}`

Fields:
- `code: string` (8-char token, uppercase)
- `creatorId: string`
- `creatorType: "parent" | "school"`
- `usedBy?: string`
- `usedAt?: Timestamp`
- `expiresAt: Timestamp`
- `createdAt: Timestamp`

Indexes:
- `code` (lookup)
- `creatorId + createdAt(desc)`
- `usedBy + expiresAt` (optional)

---

## `forum_categories/{categoryId}`

Fields:
- `name: string`
- `description?: string`
- `icon?: string`
- `createdAt: Timestamp`

Indexes:
- `name`

---

## `forum_posts/{postId}`

Fields:
- `authorId: string`
- `categoryId: string`
- `title: string`
- `content: string`
- `tags: string[]`
- `isPinned: boolean`
- `isLocked: boolean`
- `repliesCount: number` (denormalized)
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

Indexes:
- `categoryId + isPinned(desc) + createdAt(desc)`
- `authorId + createdAt(desc)`

---

## `forum_posts/{postId}/replies/{replyId}`

Fields:
- `authorId: string`
- `content: string`
- `parentReplyId?: string`
- `createdAt: Timestamp`

Indexes:
- `createdAt asc`

---

## 3. Firestore Security Rules Skeleton (Draft)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthed() { return request.auth != null; }
    function uid() { return request.auth.uid; }
    function role() { return request.auth.token.role; }
    function isAdmin() { return role() == "admin"; }
    function isParent() { return role() == "parent"; }
    function isSchool() { return role() == "school"; }
    function isStudent() { return role() == "student"; }

    match /profiles/{userId} {
      allow read: if isAuthed() && (uid() == userId || isAdmin());
      allow update: if isAuthed() && uid() == userId;
      allow create: if isAuthed() && uid() == userId;
    }

    match /user_progress/{userId} {
      allow read, update: if isAuthed() && (uid() == userId || isAdmin());
    }

    match /exams/{examId} {
      allow read: if isAuthed();
      allow write: if isAdmin();

      match /questions/{questionId} {
        allow read: if isAuthed();
        allow write: if isAdmin();

        match /parts/{partId} {
          allow read: if isAuthed();
          allow write: if isAdmin();
        }
      }
    }

    match /exam_attempts/{attemptId} {
      allow create: if isAuthed() && request.resource.data.userId == uid();
      allow read: if isAuthed() && (resource.data.userId == uid() || isAdmin());
    }

    match /question_history/{id} {
      allow read, write: if isAuthed() && request.resource.data.userId == uid();
    }

    match /notifications/{id} {
      allow read, update, delete: if isAuthed() && resource.data.userId == uid();
      allow create: if false; // server-only (Cloud Functions/Admin SDK)
    }

    match /forum_categories/{id} {
      allow read: if isAuthed();
      allow write: if isAdmin();
    }

    match /forum_posts/{postId} {
      allow read: if isAuthed();
      allow create: if isAuthed() && (isParent() || isAdmin());
      allow update: if isAuthed() && (isAdmin() || resource.data.authorId == uid());
      allow delete: if isAdmin();

      match /replies/{replyId} {
        allow read: if isAuthed();
        allow create: if isAuthed() && (isParent() || isAdmin());
        allow update: if isAuthed() && (isAdmin() || resource.data.authorId == uid());
        allow delete: if isAdmin();
      }
    }
  }
}
```

Note: linked-account scoped reads should be enforced via helper docs or server endpoints where rule complexity becomes risky.

---

## 4. Cloud Functions Contracts (Draft)

## `redeemLinkCode` (callable)
Input:
- `code: string`

Behavior:
- Validate auth + student role.
- Validate code exists, unexpired, unused.
- Transaction:
  - mark code used
  - create linked account (idempotent)
- Return linked account summary.

## `checkAchievements` (callable or internal HTTP)
Input:
- optional none (derive user from auth)

Behavior:
- Never trust client-provided user id.
- Compute achievements from attempts/progress.
- Transactionally insert `user_achievements`, update XP, create notifications.

## `aiExplanations` / `studyAssistant` (HTTP/callable)
Behavior:
- Require auth token.
- Enforce per-user rate limits.
- Strict CORS allowlist.
- Structured logging with request/user IDs.

---

## 5. Supabase -> Firebase Mapping

| Supabase | Firebase |
|---|---|
| `auth.users` | Firebase Auth users |
| `profiles` | `profiles/{uid}` |
| `user_roles` | custom claims + optional `user_roles/{uid}` |
| `user_progress` | `user_progress/{uid}` |
| `subscriptions` | `subscriptions/{uid}` |
| `billing_records` | `billing_records/{id}` |
| `achievements` | `achievements/{id}` |
| `user_achievements` | `user_achievements/{uid}_{achievementId}` |
| `exams` | `exams/{id}` |
| `questions` | `exams/{id}/questions/{id}` |
| `question_parts` | `.../parts/{id}` |
| `exam_attempts` | `exam_attempts/{id}` |
| `question_history` | `question_history/{uid_partId}` |
| `notifications` | `notifications/{id}` |
| `link_requests` | `link_requests/{id}` |
| `linked_accounts` | `linked_accounts/{id}` |
| `link_codes` | `link_codes/{id}` |
| `forum_categories` | `forum_categories/{id}` |
| `forum_posts` | `forum_posts/{id}` |
| `forum_replies` | `forum_posts/{postId}/replies/{id}` |
| Storage buckets | Firebase Storage paths/buckets |

---

## 6. Migration Script Outline

1. Export Supabase data to JSON/CSV by table.
2. Transform to Firestore document shapes.
3. Import in dependency order:
   - users/profiles/roles
   - exams/questions/parts
   - progress/subscriptions
   - attempts/history
   - links/forum/notifications
4. Backfill denormalized counters (e.g., `repliesCount`, `questionCount`).
5. Run parity checks (counts + sampled records).

---

## 7. Open Decisions

1. Canonical subscription enum: keep `Premium` only or support `Standard` explicitly.
2. Claims-only roles vs claims+mirror doc strategy.
3. Keep forum replies as subcollection vs flat `forum_replies` collection.
4. Whether to move sensitive read paths behind functions instead of complex rules.

