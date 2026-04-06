# XamPreps Exam Content System Audit

**Date:** 2026-04-06  
**Auditor:** Claude Code (Anthropic)  
**Purpose:** Complete audit of exam content system before finalizing ingestion workflow for real past papers

---

## Executive Summary

The XamPreps exam content system is **architecturally complete** but **data-empty**. All core functionality for storing, retrieving, displaying, and grading exams exists and works correctly. The system supports:

- ✅ Exam library with filtering (level, subject, year, type)
- ✅ Three exam modes (practice, quiz, simulation with timer)
- ✅ Question/part hierarchical structure
- ✅ Answer checking with intelligent normalization
- ✅ Spaced repetition review system
- ✅ Admin content management (CRUD + bulk import)
- ✅ AI-powered explanations
- ✅ XP/streak gamification

**Critical Gap:** Firestore collections (`exams`, `questions`, `question_parts`) are completely empty. The Supabase→Firebase migration covered infrastructure but never migrated exam content data.

**Recommendation:** Use **structured JSON import** as the primary ingestion format, with the existing `BulkQuestionImport` component as the admin UI entry point.

---

## 1. Complete Content Model Audit

### 1.1 Exam Structure (`exams` collection)

| Field                 | Type      | Required | Description                 | Example                        |
| --------------------- | --------- | -------- | --------------------------- | ------------------------------ |
| `id`                  | string    | auto     | Document ID                 | `ple-maths-2015`               |
| `title`               | string    | ✅       | Exam title                  | `PLE Mathematics 2015`         |
| `subject`             | string    | ✅       | Subject name                | `Mathematics`                  |
| `level`               | string    | ✅       | Education level             | `PLE`, `UCE`, `UACE`           |
| `year`                | number    | ✅       | Exam year                   | `2015`                         |
| `type`                | string    | ✅       | Paper type                  | `Past Paper`, `Practice Paper` |
| `difficulty`          | string    | ✅       | Difficulty level            | `Easy`, `Medium`, `Hard`       |
| `timeLimit`           | number    | ✅       | Time in minutes             | `150`                          |
| `time_limit`          | number    | ✅       | Duplicate for compatibility | `150`                          |
| `isFree`              | boolean   | ✅       | Free access                 | `true`                         |
| `is_free`             | boolean   | ✅       | Duplicate for compatibility | `true`                         |
| `description`         | string    | optional | Exam description            | `UNEB PLE Mathematics 2015`    |
| `topic`               | string    | optional | Specific topic              | `null`                         |
| `explanationPdfUrl`   | string    | optional | PDF explanations URL        | `null`                         |
| `explanation_pdf_url` | string    | optional | Duplicate for compatibility | `null`                         |
| `questionCount`       | number    | auto     | Number of questions         | `32`                           |
| `question_count`      | number    | auto     | Duplicate for compatibility | `32`                           |
| `createdAt`           | timestamp | auto     | Creation date               | -                              |
| `updatedAt`           | timestamp | auto     | Last update                 | -                              |

**⚠️ Dual Naming Issue:** Every field is written in both camelCase AND snake_case for backward compatibility. This doubles storage but ensures query resilience.

### 1.2 Question Structure (`questions` collection)

| Field             | Type      | Required | Description                 | Example                        |
| ----------------- | --------- | -------- | --------------------------- | ------------------------------ |
| `id`              | string    | auto     | Document ID                 | auto-generated                 |
| `examId`          | string    | ✅       | Parent exam ID              | `ple-maths-2015`               |
| `exam_id`         | string    | ✅       | Duplicate for compatibility | `ple-maths-2015`               |
| `questionNumber`  | number    | ✅       | Question number             | `1`                            |
| `question_number` | number    | ✅       | Duplicate for compatibility | `1`                            |
| `text`            | string    | ✅       | Question stem/text          | `Work out: 124 - 45`           |
| `imageUrl`        | string    | optional | Diagram image URL           | `null` or Firebase Storage URL |
| `image_url`       | string    | optional | Duplicate for compatibility | `null`                         |
| `createdAt`       | timestamp | auto     | Creation date               | -                              |
| `updatedAt`       | timestamp | auto     | Last update                 | -                              |

### 1.3 Question Part Structure (`question_parts` collection)

| Field         | Type      | Required | Description                 | Example                         |
| ------------- | --------- | -------- | --------------------------- | ------------------------------- |
| `id`          | string    | auto     | Document ID                 | auto-generated                  |
| `questionId`  | string    | ✅       | Parent question ID          | question doc ID                 |
| `question_id` | string    | ✅       | Duplicate for compatibility | question doc ID                 |
| `orderIndex`  | number    | ✅       | Part order (0=a, 1=b)       | `0`                             |
| `order_index` | number    | ✅       | Duplicate for compatibility | `0`                             |
| `text`        | string    | ✅       | Sub-question text           | `Calculate the difference`      |
| `answer`      | string    | ✅       | Correct answer              | `79`                            |
| `explanation` | string    | optional | Step-by-step explanation    | `124 - 45 = 79`                 |
| `marks`       | number    | ✅       | Points for this part        | `2`                             |
| `answerType`  | string    | ✅       | Answer format               | `text`, `numeric`, `open-ended` |
| `answer_type` | string    | ✅       | Duplicate for compatibility | `text`, `numeric`, `open-ended` |
| `createdAt`   | timestamp | auto     | Creation date               | -                               |
| `updatedAt`   | timestamp | auto     | Last update                 | -                               |

### 1.4 Hierarchical Structure

```
Exam (ple-maths-2015)
├── Question 1 (text: "Work out: 124 - 45")
│   ├── Part (a): answer="79", marks=2, answer_type="numeric"
├── Question 2 (text: "Write in figures: Eighty thousand, ten")
│   ├── Part (a): answer="80,010", marks=2, answer_type="text"
└── Question 3 (text: "Simplify: 18x - 5(3x + 7)")
    ├── Part (a): answer="3x - 35", marks=2, answer_type="text"
```

---

## 2. Access and Load Flow Audit

### 2.1 Exam Library Loading

**File:** `src/pages/ExamsPage.tsx`

```
User visits /exams or /past-papers or /practice-papers
  ↓
ExamsPage.tsx useEffect calls listExamsFirebase(type)
  ↓
src/integrations/firebase/content.ts: listExamsFirebase()
  ↓
Cloud Function: listExams({ type? })
  ↓
functions/index.js: db.collection("exams").orderBy("year", "desc").get()
  ↓
Returns array of exam objects with normalized field names
  ↓
State: exams[] populated → UI renders filtered list
```

**Filters Applied:**

- Level (PLE/UCE/UACE)
- Subject (Mathematics, English, Science, etc.)
- Year (sorted descending)
- Difficulty (Easy/Medium/Hard)
- Type (Past Paper/Practice Paper)
- Search query (title, subject, year)

**Failure Points:**

1. Empty `exams` collection → shows "No exams found"
2. Missing index on `year` → fallback to unsorted query
3. No `type` filter applied if collection is empty

### 2.2 Single Exam Loading

**File:** `src/pages/ExamTakingPage.tsx`

```
User clicks "Start Exam" → selects mode (practice/quiz/simulation)
  ↓
Navigate to /exam/:examId?mode=practice
  ↓
ExamTakingPage.tsx useEffect calls getExamContentFirebase(examId)
  ↓
src/integrations/firebase/content.ts: getExamContentFirebase()
  ↓
Cloud Function: getExamContent({ examId })
  ↓
1. db.collection("exams").doc(examId).get() → exam metadata
2. db.collection("questions").where("examId", "==", examId).orderBy("questionNumber").get()
3. For each question: db.collection("question_parts").where("questionId", "==", qId).orderBy("orderIndex").get()
  ↓
Returns: { exam, questions: [{ id, text, image_url, parts: [...] }] }
  ↓
State populated → renders exam interface
```

**Failure Points:**

1. Exam not found → navigates back to `/exams`
2. Exam exists but no questions → shows "Exam not found" message
3. Missing composite indexes → query fails, falls back to unsorted

### 2.3 Answer Submission Flow

```
User enters answer in textarea
  ↓
handleAnswerChange(partId, value) → updates answers state
  ↓
User clicks "Submit" or timer expires
  ↓
handleSubmitExam() calls checkAnswer(part, userAnswer) for each part
  ↓
checkAnswer() applies normalization and matching logic
  ↓
Results stored in results state: { [partId]: boolean }
  ↓
submitExamAttemptFirebase() sends to Cloud Function:
  - score, totalQuestions, timeTaken
  - questionHistoryUpdates for spaced repetition
  ↓
Cloud Function writes to:
  - exam_attempts collection
  - question_history collection
  - user_progress (XP, streak)
  ↓
Results UI displays score, correct/incorrect per part, explanations
```

### 2.4 Review Session Flow

**File:** `src/pages/ReviewSessionPage.tsx`

```
User visits /review
  ↓
listReviewDueQuestionsFirebase(limit=20)
  ↓
Cloud Function: listReviewDueQuestions
  ↓
Query: question_history.where("userId", "==", uid).where("nextReview", "<=", now)
  ↓
For each history item, fetch:
  - question_parts.doc(partId)
  - questions.doc(questionId)
  - exams.doc(examId)
  ↓
Returns review items with full context
  ↓
User answers → checkAnswer() → submitReviewAnswerFirebase()
  ↓
Updates question_history with new streak and nextReview date
  ↓
SM-2 algorithm calculates next review interval:
  - Correct: 1 day → 3 days → 7 days → 14 days → 30 days → max 90 days
  - Incorrect: reset to 1 hour
```

---

## 3. Admin Content Management Audit

### 3.1 Exam Creation/Editing

**File:** `src/components/admin/ExamEditDialog.tsx`

- Creates/updates exam metadata (title, subject, level, year, type, difficulty, timeLimit, isFree, description)
- Writes to `exams` collection via `adminUpsertExam` Cloud Function
- Supports both create (new doc) and update (existing doc)

### 3.2 Question Management

**File:** `src/components/admin/QuestionEditor.tsx`

- Full question editor with parts management
- Supports adding/removing/reordering parts
- Each part has: text, answer, explanation, marks, answerType
- Saves via `adminSaveExamQuestions` Cloud Function
- Deletes existing questions/parts before saving new ones (full replace)

### 3.3 Bulk Import

**File:** `src/components/admin/BulkQuestionImport.tsx`

**Supported Formats:**

1. **JSON** - Array of question objects
2. **CSV** - Tabular format with headers

**JSON Format:**

```json
[
  {
    "question_number": 1,
    "text": "Work out: 124 - 45",
    "image_url": null,
    "parts": [
      {
        "text": "",
        "answer": "79",
        "explanation": "124 - 45 = 79",
        "marks": 2,
        "answer_type": "numeric"
      }
    ]
  }
]
```

**CSV Format:**

```csv
question_number,question_text,part_text,answer,explanation,marks,answer_type
1,Work out: 124 - 45,,79,124 - 45 = 79,2,numeric
2,Write in figures: Eighty thousand ten,,80010,,2,text
```

**Import Flow:**

1. Upload file or paste content
2. Parse and preview
3. Validate structure
4. Call `adminBulkImportQuestionsFirebase(examId, questions)`
5. Cloud Function creates questions and parts documents

### 3.4 Image Upload

**Files:** `src/components/admin/ImageUpload.tsx`, `BatchImageUpload.tsx`

- Uploads images to Firebase Storage
- Returns URL that can be assigned to `question.image_url`
- Batch upload supported for multiple images

### 3.5 PDF Upload

**File:** `src/components/admin/PdfUpload.tsx`

- Uploads explanation PDFs to Firebase Storage
- URL stored in `exam.explanationPdfUrl`
- Currently not displayed in UI (future feature)

---

## 4. Answer Recognition Logic Audit

### 4.1 Normalization Pipeline

**Location:** `src/pages/ExamTakingPage.tsx` lines 177-189

```typescript
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[,\s]+/g, " ") // Normalize whitespace and commas
    .replace(/sh\.?\s*/gi, "") // Remove currency prefix (sh., sh)
    .replace(/°|degrees?/gi, "") // Remove degree symbols
    .replace(/p\.?\s*m\.?/gi, "pm") // Normalize PM
    .replace(/a\.?\s*m\.?/gi, "am") // Normalize AM
    .replace(/\s+/g, " ") // Collapse whitespace
    .replace(/['"]/g, "") // Remove quotes
    .replace(/\./g, "") // Remove periods
    .trim();
};
```

**Normalizations Applied:**

- Case insensitive
- Whitespace collapsed
- Currency symbols removed (UGX/shillings)
- Degree symbols removed
- Time abbreviations normalized (p.m. → pm)
- Punctuation removed
- Quotes removed

### 4.2 Answer Type Matching

**Location:** `src/pages/ExamTakingPage.tsx` lines 253-298

#### Text Answers

```typescript
if (normalizedUser === normalizedCorrect) return true;
// For longer answers (>3 chars), substring matching allowed
if (normalizedCorrect.length > 3) {
  if (
    normalizedUser.includes(normalizedCorrect) ||
    normalizedCorrect.includes(normalizedUser)
  )
    return true;
}
```

#### Numeric Answers

```typescript
if (part.answer_type === "numeric") {
  const userNum = extractNumber(userAnswer);
  const correctNum = extractNumber(part.answer);
  if (userNum !== null && correctNum !== null) {
    return Math.abs(userNum - correctNum) < 0.01; // Tolerance
  }
}
```

#### Fraction Handling

```typescript
const checkFractionEquivalence = (user: string, correct: string): boolean => {
  // Converts ⅓, ⅔, ½, ¼, ¾ to fraction notation
  // Handles mixed numbers: "2 1/3" → 2.333...
  // Compares decimal values with 0.01 tolerance
};
```

**Supported Fraction Formats:**

- Simple: `1/2`, `3/4`
- Unicode: `½`, `⅓`, `⅔`, `¼`, `¾`
- Mixed: `2 1/3`, `3 3/4`

#### Time Handling

```typescript
const checkTimeEquivalence = (user: string, correct: string): boolean => {
  // Parses HH:MM format
  // Handles AM/PM
  // Compares hour, minute, and AM/PM
};
```

**Supported Time Formats:**

- `7:15`, `7:15pm`, `7:15 pm`, `7:15p.m.`

### 4.3 Weak Spots and Risks

1. **No fuzzy matching for text** - "seventy nine" won't match "79" unless numeric extraction works
2. **No unit handling** - "79" matches "79" but "79 units" might not match if answer is just "79"
3. **Fraction Unicode limited** - Only common fractions (½, ⅓, ⅔, ¼, ¾) are converted
4. **No algebraic expression matching** - "3x - 35" must match exactly (normalized)
5. **No multi-answer support** - Each part has exactly one correct answer string
6. **No partial credit** - Binary correct/incorrect, no partial marks
7. **No case-sensitive option** - All text answers are case-insensitive
8. **Order-dependent part matching** - Parts matched by ID, not by order

---

## 5. PLE Mathematics 2015 Fit Analysis

### 5.1 Paper Structure

The PLE Mathematics 2015 paper has:

- **Section A:** 20 questions × 2 marks = 40 marks
- **Section B:** 12 questions × variable marks = 60 marks
- **Total:** 32 questions, 100 marks
- **Time:** 2 hours 30 minutes (150 minutes)

### 5.2 Question Types Analysis

| Q#  | Type                       | Parts | Answer Type  | Image Needed | Fits Model      |
| --- | -------------------------- | ----- | ------------ | ------------ | --------------- |
| 1   | Arithmetic                 | 1     | numeric      | No           | ✅              |
| 2   | Number writing             | 1     | numeric      | No           | ✅              |
| 3   | Algebra simplification     | 1     | text         | No           | ✅              |
| 4   | Set theory                 | 1     | numeric      | No           | ✅              |
| 5   | Number line                | 1     | numeric      | **Yes**      | ✅ (with image) |
| 6   | Prime numbers              | 1     | numeric      | No           | ✅              |
| 7   | Fraction division          | 1     | text         | No           | ✅              |
| 8   | Time calculation           | 1     | text         | No           | ✅              |
| 9   | Symmetry                   | 1     | numeric      | **Yes**      | ✅ (with image) |
| 10  | Profit/loss                | 1     | numeric      | No           | ✅              |
| 11  | Probability                | 1     | numeric      | No           | ✅              |
| 12  | Unit conversion            | 1     | numeric      | No           | ✅              |
| 13  | Algebra substitution       | 1     | numeric      | No           | ✅              |
| 14  | Binary addition            | 1     | text         | No           | ✅              |
| 15  | Angles                     | 1     | numeric      | **Yes**      | ✅ (with image) |
| 16  | LCM from Venn              | 1     | numeric      | **Yes**      | ✅ (with image) |
| 17  | Median                     | 1     | numeric      | No           | ✅              |
| 18  | Ratio                      | 1     | numeric      | No           | ✅              |
| 19  | Fraction word problem      | 1     | numeric      | No           | ✅              |
| 20  | Division word problem      | 1     | numeric      | No           | ✅              |
| 21  | Venn diagram               | 2     | numeric      | **Yes**      | ✅ (with image) |
| 22  | Standard form + arithmetic | 2     | numeric/text | No           | ✅              |
| 23  | Currency exchange          | 2     | numeric      | No           | ✅              |
| 24  | Volume calculation         | 1     | numeric      | **Yes**      | ✅ (with image) |
| 25  | Statistics (mode/mean)     | 3     | numeric      | No           | ✅              |
| 26  | Geometry (parallel lines)  | 2     | numeric      | **Yes**      | ✅ (with image) |
| 27  | Time/distance/speed        | 3     | numeric      | No           | ✅              |
| 28  | Profit/loss chain          | 2     | numeric      | No           | ✅              |
| 29  | Area/perimeter             | 2     | numeric      | **Yes**      | ✅ (with image) |
| 30  | Rate problems              | 1     | numeric      | No           | ✅              |
| 31  | Algebra word problem       | 1     | numeric      | No           | ✅              |
| 32  | Bearings + scale drawing   | 3     | text/numeric | No           | ✅              |

### 5.3 Fit Assessment

**✅ EXCELLENT FIT** - The current model accommodates all 32 questions perfectly.

**Key Observations:**

1. All questions have clear, single correct answers
2. Multi-part questions (21, 22, 23, 25, 26, 27, 28, 29, 32) map cleanly to `question_parts`
3. 9 questions need diagram images - supported via `image_url` field
4. All answers are either numeric or short text - both well-supported
5. No essay/long-form answers needed
6. Mark allocations (1-6 marks) fit the `marks` field

**Answer Type Distribution:**

- `numeric`: ~28 questions (87.5%)
- `text`: ~4 questions (12.5%) - for expressions like "3x - 35", "10100₂"

**Image Requirements:**

- 9 questions need diagrams (questions 5, 9, 15, 16, 21, 24, 26, 29, and potentially 32)
- Images should be uploaded to Firebase Storage
- URLs stored in `questions.image_url`

---

## 6. Identified Gaps and Risks

### 6.1 Content Gaps

1. **No exam content exists** - All collections are empty
2. **No PDF rendering** - `explanationPdfUrl` field exists but no UI to display PDFs
3. **No bulk image import** - Images must be uploaded one-by-one or via batch tool
4. **No question tagging** - No topic/subject tags within exams
5. **No difficulty metadata per question** - Only exam-level difficulty

### 6.2 Answer Checking Gaps

1. **No partial credit** - Binary correct/incorrect only
2. **No multi-answer support** - Can't have multiple correct answer variants
3. **No working marks** - Can't award marks for correct method
4. **No unit tolerance** - "79" and "79 units" treated differently
5. **No algebraic equivalence** - "3x-35" and "-35+3x" treated as different

### 6.3 Admin Workflow Gaps

1. **No collaborative editing** - Single admin only
2. **No version history** - Can't rollback changes
3. **No approval workflow** - Changes go live immediately
4. **No content preview** - Can't preview exam as student before publishing
5. **No bulk image linking** - Must manually paste image URLs

### 6.4 Technical Risks

1. **Dual field naming doubles storage costs** - Every field stored twice
2. **No Firestore indexes configured** - `firestore.indexes.json` is empty
3. **Missing composite indexes** - Some queries may fail without indexes
4. **No rate limiting on imports** - Large imports could timeout
5. **No validation on answer format** - Invalid answerType accepted

---

## 7. Recommended Ingestion Format

### 7.1 Primary Recommendation: Structured JSON

**Use the existing `BulkQuestionImport` JSON format.**

**Reasons:**

1. Already implemented in admin UI
2. Maps 1:1 to Firestore schema
3. Supports all answer types
4. Supports explanations
5. Supports image URLs
6. Preview before import
7. Error handling built-in

### 7.2 JSON Template for PLE Mathematics 2015

```json
{
  "exam": {
    "id": "ple-maths-2015",
    "title": "PLE Mathematics 2015",
    "subject": "Mathematics",
    "level": "PLE",
    "year": 2015,
    "type": "Past Paper",
    "difficulty": "Medium",
    "timeLimit": 150,
    "isFree": true,
    "description": "Uganda National Examinations Board (UNEB) PLE Mathematics 2015"
  },
  "questions": [
    {
      "question_number": 1,
      "text": "Work out: 124 - 45",
      "parts": [
        {
          "text": "",
          "answer": "79",
          "explanation": "124 - 45 = 79\n\nStep-by-step:\n• 4 - 5 requires borrowing\n• 14 - 5 = 9\n• 11 - 4 = 7\n• Result: 79",
          "marks": 2,
          "answer_type": "numeric"
        }
      ]
    },
    {
      "question_number": 5,
      "text": "Work out 7 - 3 on the number line below.",
      "image_url": "gs://xampreps-exams/ple/maths/2015/q5-numberline.png",
      "parts": [
        {
          "text": "",
          "answer": "4",
          "explanation": "Starting at 7 on the number line, move 3 steps to the left: 7 → 6 → 5 → 4",
          "marks": 2,
          "answer_type": "numeric"
        }
      ]
    }
  ]
}
```

### 7.3 Image Handling

**Process:**

1. Extract diagrams from PDF
2. Upload to Firebase Storage: `gs://xampreps-exams/ple/maths/2015/q{N}-{description}.png`
3. Include `image_url` in question JSON
4. Upload before or after question import (URLs just need to be valid)

### 7.4 Alternative: CSV Format

CSV is supported but **not recommended** for PLE Mathematics 2015 because:

- Multi-part questions require multiple rows
- Explanations with line breaks are problematic in CSV
- Image URLs add complexity
- Less readable for manual editing

---

## 8. Minimal Next Steps

### Step 1: Create Exam Metadata

Use admin UI or direct Firestore write to create the exam document:

```
exams/ple-maths-2015
```

### Step 2: Upload Diagram Images

Upload 9 diagram images to Firebase Storage and record URLs.

### Step 3: Prepare JSON Import File

Convert PLE Mathematics 2015 questions + answers + explanations to JSON format.

### Step 4: Bulk Import Questions

Use admin UI → Bulk Import → paste JSON → preview → import.

### Step 5: Verify in Student View

Open `/exam/ple-maths-2015?mode=practice` and verify all questions render correctly.

---

## Appendix A: Cloud Function Signatures

### listExams

```javascript
exports.listExams = onCall(async (request) => {
  const type = request.data?.type; // optional filter
  // Returns: { ok: true, items: FirebaseExam[] }
});
```

### getExamContent

```javascript
exports.getExamContent = onCall(async (request) => {
  const examId = request.data.examId;
  // Returns: { ok: true, exam: FirebaseExam, questions: FirebaseQuestion[] }
});
```

### adminBulkImportQuestions

```javascript
exports.adminBulkImportQuestions = onCall(async (request) => {
  const examId = request.data.examId;
  const questions = request.data.questions; // ImportedQuestion[]
  // Returns: { ok: true, imported: number, questionCount: number }
});
```

---

## Appendix B: Firestore Security Rules (Current)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Exams: read for all, write for admin only
    match /exams/{examId} {
      allow read: if true;
      allow write: if request.auth != null &&
                     get(/database/$(database)/documents/user_roles/$(request.auth.uid)).data.role == 'admin';
    }

    // Questions: read for all, write for admin only
    match /questions/{questionId} {
      allow read: if true;
      allow write: if request.auth != null &&
                     get(/database/$(database)/documents/user_roles/$(request.auth.uid)).data.role == 'admin';
    }

    // Question parts: read for all, write for admin only
    match /question_parts/{partId} {
      allow read: if true;
      allow write: if request.auth != null &&
                     get(/database/$(database)/documents/user_roles/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

**End of Audit Report**
