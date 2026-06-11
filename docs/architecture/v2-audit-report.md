# XamPreps V2 Implementation Audit Report

**Date:** April 8, 2026  
**Auditor:** Claude Code Analysis  
**Scope:** Full V2 implementation verification

---

## 1. Collection Naming - VERIFIED ✅

**Actual Implementation:**

```typescript
// src/integrations/firebase/v2-collections.ts
export const EXAM_COLLECTIONS = {
  exams: "exams", // Production name
  sections: "sections", // Production name
  instructionGroups: "instruction_groups", // Production name
  contextBlocks: "context_blocks", // Production name
  items: "items", // Production name
  interactions: "interactions", // Production name
  markingRules: "marking_rules", // Production name
  rubrics: "rubrics", // Production name
  modelAnswerVersions: "model_answer_versions", // Production name
  examAttempts: "exam_attempts", // Production name
  submissions: "submissions", // Production name
  reviewTasks: "review_tasks", // Production name
  feedbackTemplates: "feedback_templates", // Production name
};
```

**Cloud Functions:** Uses hardcoded collection names (`db.collection('interactions')`, etc.) - matches production naming.

**Firestore Rules:** Uses production collection names (`/items/{itemId}`, `/interactions/{interactionId}`, etc.).

**Documentation Status:**

- `docs/architecture/v2-implementation-report.md` - CORRECT (says production names)
- `docs/architecture/v2-firestore-indexes.md` - NEEDS UPDATE (still references `v2_` prefix in JSON)

---

## 2. Cloud Functions Audit

**File:** `functions/v2/markingEngine.js`

### Exports Verified ✅

```javascript
module.exports = {
  autoMarkSubmission,
  getReviewQueue,
  submitTeacherReview,
  aggregateAttemptScores,
  createModelAnswerVersion,
  approveModelAnswerVersion,
};
```

### Issues Found ⚠️

1. **Duplicate `admin.initializeApp()`** - The file has its own `admin.initializeApp()` which will conflict with the main `functions/index.js`. This needs to be removed or the functions need to be imported into the main index.

2. **Not wired into main functions/index.js** - The V2 functions are in a separate file but not exported from the main entry point. They won't be deployable as-is.

3. **Brittle MCQ parsing** - Line in `markMcqOptionMatch`:

   ```javascript
   const correctOptions = rule.exactAnswer ? JSON.parse(rule.exactAnswer) : [];
   ```

   This assumes `exactAnswer` is a JSON string for MCQ, which is inconsistent with other marking modes.

4. **Missing error handling** - No try/catch around `JSON.parse`.

### Deployability Status: ❌ NOT READY

- Functions exist but are not wired into deployable entry point
- Need to either:
  - Import V2 functions into `functions/index.js`, OR
  - Deploy as separate service

---

## 3. Security Rules Audit

**File:** `firestore.rules`

### V2 Collections Protected ✅

| Collection            | Read Access                    | Write Access                           |
| --------------------- | ------------------------------ | -------------------------------------- |
| sections              | authenticated                  | isContentEditor                        |
| instruction_groups    | authenticated                  | isContentEditor                        |
| context_blocks        | authenticated                  | isContentEditor                        |
| items                 | authenticated                  | isContentEditor                        |
| interactions          | authenticated                  | isContentEditor                        |
| marking_rules         | isContentEditor                | isContentEditor                        |
| rubrics               | isContentEditor \|\| isTeacher | isContentEditor                        |
| model_answer_versions | authenticated                  | isContentEditor                        |
| submissions           | own \|\| isTeacher             | own (create) / teacher (update scores) |
| review_tasks          | assigned \|\| own \|\| admin   | isTeacher                              |
| feedback_templates    | isTeacher                      | isContentEditor                        |

### Issues Found ⚠️

1. **Legacy collections still exposed** - `questions`, `question_parts` collections still have rules allowing read to all authenticated users. These should be deprecated.

2. **`isTeacher()` and `isContentEditor()` functions defined** - But they do Firestore reads which have performance implications.

### Deployability Status: ✅ READY

- Rules are syntactically valid
- Can be deployed with `firebase deploy --only firestore:rules`

---

## 4. Renderer Components Audit

**Directory:** `src/components/exam/v2/`

### Components Created ✅

- `V2ExamRenderer.tsx` - Top-level container
- `V2SectionRenderer.tsx` - Section rendering
- `V2InstructionGroupRenderer.tsx` - Instruction groups
- `V2ContextBlockRenderer.tsx` - Context blocks (passages, tables, images)
- `V2ItemRenderer.tsx` - Items/questions
- `V2InteractionRenderer.tsx` - Response inputs
- `index.ts` - Exports

### Issues Found ⚠️

1. **NOT wired into any route** - The V2 renderer components exist but are not imported or used anywhere in the app. There's no test route or fixture runner.

2. **No data fetching** - Components expect data as props but there's no hook or context for fetching V2 data.

3. **TypeScript errors in V2InteractionRenderer** - Type assertions for MCQ options may cause runtime issues.

### Status: ⚠️ CREATED BUT NOT INTEGRATED

- Components exist and are syntactically valid
- No route or screen uses them yet
- Need to create a test/demo route to validate rendering

---

## 5. Test Fixtures Audit

**File:** `docs/architecture/v2-test-fixtures.md`

### Status: 📄 DOCUMENTATION ONLY

The fixtures exist as JSON examples in documentation but:

- ❌ No actual Firestore data exists
- ❌ No fixture loading script
- ❌ No automated test runner
- ❌ No validation that fixtures would actually work

The fixtures are **design specifications**, not **executable test data**.

---

## 6. End-to-End Readiness

| Component               | Status                  | Ready? |
| ----------------------- | ----------------------- | ------ |
| TypeScript types        | Complete                | ✅     |
| Collection access layer | Complete                | ✅     |
| Validation helpers      | Complete                | ✅     |
| Rendering components    | Created, not integrated | ⚠️     |
| Cloud Functions         | Created, not wired      | ⚠️     |
| Security rules          | Complete                | ✅     |
| Test fixtures           | Documentation only      | ❌     |
| Index configuration     | Documented, not created | ❌     |

---

## 7. Contradictions Found

1. **Collection naming in indexes doc** - `v2-firestore-indexes.md` uses `v2_exams` prefix in JSON but code uses `exams`. The markdown table is correct but the JSON block needs updating.

2. **Implementation report claims completion** - But Cloud Functions aren't wired and renderers aren't integrated.

3. **Test fixtures described as "tested"** - But they're only documentation, not executable.

---

## 8. Code Gaps Before Exam Import

1. **Cloud Functions entry point** - Must wire V2 functions into `functions/index.js`
2. **Firestore indexes** - Must create indexes in Firebase console
3. **Test route/screen** - Need a way to load and display V2 content
4. **Fixture loading** - Need script to create test data in Firestore
5. **Duplicate admin.initializeApp()** - Remove from `markingEngine.js`

---

## 9. Verification Commands for Kenogo

```bash
# 1. Build check
npm run build

# 2. Type check (if configured)
npm run typecheck  # or npx tsc --noEmit

# 3. Lint check
npm run lint

# 4. Deploy functions (after wiring V2 functions)
cd functions && npm run build  # if using TypeScript
firebase deploy --only functions

# 5. Deploy security rules
firebase deploy --only firestore:rules

# 6. Create indexes (manual or via CLI)
firebase firestore:indexes

# 7. Verify collections in Firestore console
# Visit: https://console.firebase.google.com/project/[PROJECT_ID]/firestore/data
```

---

## 10. Summary

**What's Actually Done:**

- ✅ Complete TypeScript type system
- ✅ Complete Firestore collection access layer
- ✅ Validation helpers for all entities
- ✅ Rendering components (not integrated)
- ✅ Cloud Functions code (not wired)
- ✅ Security rules (ready to deploy)
- ✅ Documentation

**What's NOT Done:**

- ❌ Cloud Functions not deployable (not in entry point)
- ❌ Renderers not integrated into app
- ❌ No test route or fixture runner
- ❌ No actual test data in Firestore
- ❌ Indexes not created
- ❌ Duplicate `admin.initializeApp()` issue

**Before First Exam Import:**

1. Wire V2 Cloud Functions into `functions/index.js`
2. Deploy indexes
3. Create test route with fixture data
4. Validate end-to-end flow with test data
5. Fix any runtime issues discovered

**Risk Level:** MEDIUM

- Architecture is sound
- Implementation gaps are fixable
- No fundamental redesign needed
