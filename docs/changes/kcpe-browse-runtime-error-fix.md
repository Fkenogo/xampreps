# KCPE Browse Runtime Error Fix

## Date

2026-04-17

## Exact Runtime Error

Loading `/past-papers` reproduced the public page error state:

```text
Unable to load exams
```

Calling the same browse loader directly in the browser context showed the rejected error:

```text
FirebaseError: Missing or insufficient permissions.
```

## Failing Function

**File:** `src/integrations/firebase/content.ts`  
**Function:** `getQuestionCount()` called by `listExamsFirebase()`  
**Failing operation:** the fallback item-count query:

```ts
getDocs(query(collection(db, 'items'), where('examId', '==', examId)))
```

The query is not safe for the public browse page because Firestore rules allow unauthenticated reads of `exams`, but V2 content collections such as `items` are authenticated-only.

## Root Cause

The Kenya exam `exams/AmGY3KFqvkjvF8vOwWeT` became visible to `listExamsFirebase()` after `engineVersion: "v2"` was added. Unlike the Uganda fixture, the Kenya document does not carry `questionCount` or `question_count`.

Because no stored question-count field was available, the browse mapper tried to derive the count by querying `items`. That query failed for a public unauthenticated visitor with `FirebaseError: Missing or insufficient permissions.` Since the documents were mapped inside one `Promise.all`, that single rejected count query caused the entire `/past-papers` list load to reject.

Kenya country/level normalization was not the failing path:

```text
country = "KENYA" -> KENYA
level = "KCPE" -> KCPE
stage = PRIMARY
```

## Fix

Changed `listExamsFirebase()` so browse summaries prefer safe exam-document metadata before trying any content query:

- `questionCount`
- `question_count`
- `totalQuestions`
- `total_questions`
- `itemCount`
- `item_count`
- `totalItems`
- `total_items`
- `totalMarks`

For the KCPE Mathematics 2023 import, `totalMarks: 50` now provides the public card count without reading gated `items`.

Also hardened list loading:

- `getQuestionCount()` catches count-query failures, logs the exam id, and returns `0` instead of rejecting the whole page.
- `listExamsFirebase()` wraps each document mapping in `try/catch`, logs the failed exam id and reason, and skips only that record.

## Files Changed

- `src/integrations/firebase/content.ts`

## Manual Test Results

Local dev server: `http://localhost:8080/past-papers`

| Check | Result |
| --- | --- |
| `/past-papers` loads normally | Pass |
| `KCPE Mathematics 2023` appears | Pass |
| Uganda fixture exam still appears | Pass |
| Country filter includes Kenya and filters to Kenya only | Pass |
| Level filter includes KCPE and filters to KCPE | Pass |
| Preview modal opens for KCPE Mathematics 2023 | Pass |
| Preview shows Kenya and 50 questions | Pass |

Direct browser-context loader check after the fix:

```json
{
  "ok": true,
  "count": 2,
  "titles": [
    "V2 Test Exam - Fixture Set",
    "KCPE Mathematics 2023"
  ]
}
```

Production build also passed with the existing Vite chunk-size warnings.
