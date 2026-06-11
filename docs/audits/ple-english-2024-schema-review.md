# PLE English 2024 Schema Review

**Date:** April 7, 2026  
**Purpose:** Document the actual system schema used by XamPreps for exam imports

---

## 1. System Architecture Overview

### Data Flow

```
JSON Import File → Import Script → Firestore Collections
```

### Firestore Collections Used

1. **exams** - Exam metadata
2. **questions** - Question documents
3. **question_parts** - Individual question parts/sub-questions

---

## 2. Actual System Schema (From Code Analysis)

### Exam Document Schema

**Collection:** `exams`  
**Document ID:** Custom ID (e.g., `ple-english-2024`)

**Fields (from importExamPackage.js lines 207-226):**

```javascript
{
  title: string,                    // Required
  subject: string,                  // Required
  level: string,                    // Required (e.g., "PLE")
  year: number,                     // Required (e.g., 2024)
  type: string,                     // Optional, default "Past Paper"
  difficulty: string,               // Optional, default "Medium"
  timeLimit: number,                // Optional, default 135 (minutes)
  time_limit: number,               // Duplicate field (camelCase + snake_case)
  isFree: boolean,                  // Optional, default true
  is_free: boolean,                 // Duplicate field
  description: string | null,       // Optional
  topic: null,                      // Always null
  explanationPdfUrl: null,          // Always null
  explanation_pdf_url: null,        // Always null
  questionCount: number,            // Auto-calculated
  question_count: number,           // Duplicate field
  createdAt: string (ISO),          // Auto-generated
  updatedAt: string (ISO)           // Auto-generated
}
```

**Required Fields:** `id`, `title`, `subject`, `level`, `year`

---

### Question Document Schema

**Collection:** `questions`  
**Document ID:** Auto-generated

**Fields (from importExamPackage.js lines 287-299):**

```javascript
{
  examId: string,                   // Required - Exam ID reference
  exam_id: string,                  // Duplicate field
  questionNumber: number,           // Required - Question number (1-55)
  question_number: number,          // Duplicate field
  text: string,                     // Required - Full question text
  imageUrl: string | null,          // Optional - Image URL
  image_url: string | null,         // Duplicate field
  tableData: null,                  // Always null (not used)
  table_data: null,                 // Always null
  createdAt: string (ISO),          // Auto-generated
  updatedAt: string (ISO)           // Auto-generated
}
```

**Key Finding:** The `text` field contains the FULL question text, including:

- Instructions
- Shared context (passages, tables, etc.)
- The actual question prompt

**UI Rendering (from ExamTakingPage.tsx):**

- Line 840: `<MarkdownRenderer content={currentQuestion?.text || ''} />`
- The entire `text` field is rendered as the question content

---

### Question Part Schema

**Collection:** `question_parts`  
**Document ID:** Auto-generated

**Fields (from importExamPackage.js lines 335-354):**

```javascript
{
  questionId: string,               // Required - Reference to question
  question_id: string,              // Duplicate field
  orderIndex: number,               // Required - 0 for 'a', 1 for 'b', etc.
  order_index: number,              // Duplicate field
  text: string,                     // Required - Part prompt/question
  answer: string,                   // Required - Correct answer
  explanation: string | null,       // Optional - Tutor explanation
  marks: number,                    // Required - Marks for this part
  answerType: string,               // Required - Answer type
  answer_type: string,              // Duplicate field
  acceptableAnswers: string[],      // Optional - Array of acceptable answers
  acceptable_answers: string[],     // Duplicate field
  createdAt: string (ISO),          // Auto-generated
  updatedAt: string (ISO)           // Auto-generated
}
```

**Answer Types Used:**

- `"text"` - Text input (most common)
- `"numeric"` - Numeric input
- `"open-ended"` - Open-ended text

**UI Rendering (from ExamTakingPage.tsx):**

- Line 864: `<p className="font-medium mb-2">{part.text}</p>`
- Each part's `text` field is rendered as the part prompt

---

## 3. Import JSON Structure

### File Format

The import JSON can be either:

1. **Array format:** `[{question1}, {question2}, ...]`
2. **Object format:** `{ exam: {...}, questions: [...] }`

### Question Object Structure (Input JSON)

**Supported field names (with fallbacks):**

```javascript
{
  // Question number (required)
  questionNumber: number,    // Preferred
  question_number: number,   // Fallback

  // Question text (required)
  questionText: string,      // Preferred
  text: string,              // Fallback

  // Image (optional)
  imageUrl: string,          // Preferred
  image_url: string,         // Fallback

  // Parts array (required)
  parts: [
    {
      // Part text (required)
      prompt: string,        // Preferred
      text: string,          // Fallback

      // Answer (required)
      answer: string,

      // Explanation (optional)
      explanation: string,

      // Marks (required)
      marks: number,

      // Answer type (required)
      answerType: string,    // Preferred
      answer_type: string,   // Fallback

      // Acceptable answers (optional)
      acceptable_answers: string[],

      // Part label (optional)
      partLabel: string      // Used to determine order_index
    }
  ]
}
```

---

## 4. Real-World Example (From ple-science-2024)

### Simple Question (Q1)

```json
{
  "question_number": 1,
  "text": "Name any one type of latrine.",
  "image_url": null,
  "parts": [
    {
      "order_index": 0,
      "text": "Name any one type of latrine.",
      "answer": "Pit latrine",
      "explanation": "A pit latrine is one common type of toilet...",
      "marks": 1,
      "answer_type": "text"
    }
  ]
}
```

### Table Question (Q45)

```json
{
  "question_number": 45,
  "text": "The table below shows some of the steps followed in the cleaning of clothes...\n\n| Step | Purpose |\n|------|---------|\n| _____ | Separating clothes... |\n| Soaking | _____ |\n| _____ | Removing dirty soapy water... |\n| Ironing | _____ |",
  "image_url": null,
  "parts": [
    {
      "order_index": 0,
      "text": "What is the purpose of soaking clothes?",
      "answer": "Loosens dirt / makes washing easier",
      "explanation": "Soaking helps soften stains...",
      "marks": 1,
      "answer_type": "text"
    }
    // ... more parts
  ]
}
```

---

## 5. Key Findings

### ✅ What Works

1. **Simple questions:** `text` in question, `text` in part (can be same)
2. **Table questions:** Table markdown in question `text`, individual questions in parts
3. **Multiple parts:** Each part has its own `text` prompt
4. **Duplicate fields:** System supports both camelCase and snake_case

### ⚠️ Important Notes

1. **No `instruction` field** in the actual schema - instructions must be in `text`
2. **No `sharedContext` field** - shared context must be in question `text`
3. **Part `text` is rendered** - it's not ignored even if empty
4. **Markdown support** - question `text` supports markdown (tables, etc.)

### ❌ What Doesn't Exist

1. No separate `instruction` field at question level
2. No `sharedContext` object for passages/tables
3. No `tableData` field (it's always null)
4. No special handling for different question types

---

## 6. UI Rendering Behavior

### Question Display (ExamTakingPage.tsx)

```typescript
// Line 840: Render question text
<MarkdownRenderer content={currentQuestion?.text || ''} />

// Line 864: Render part text
<p className="font-medium mb-2">{part.text}</p>
```

**Implication:** Both question text and part text are displayed separately.

### Answer Checking

- Uses `part.answer` as the correct answer
- Supports `acceptableAnswers` array for alternatives
- Normalizes text for comparison (case-insensitive, removes punctuation)

---

## 7. Required Fields Summary

| Field                        | Required | Notes                      |
| ---------------------------- | -------- | -------------------------- |
| `questionNumber`             | ✅ Yes   | Must be unique per exam    |
| `text`                       | ✅ Yes   | Full question content      |
| `parts`                      | ✅ Yes   | Array of part objects      |
| `parts[].text`               | ✅ Yes   | Part prompt                |
| `parts[].answer`             | ✅ Yes   | Correct answer             |
| `parts[].marks`              | ✅ Yes   | Marks for this part        |
| `parts[].answerType`         | ✅ Yes   | Must be valid type         |
| `parts[].explanation`        | ❌ No    | Optional tutor explanation |
| `parts[].acceptable_answers` | ❌ No    | Optional alternatives      |
| `image_url`                  | ❌ No    | Optional image             |

---

## 8. Recommendations for PLE English 2024

Based on the actual system schema:

### For Section A (Q1-50)

- **Question text:** Full sentence with blank/instruction
- **Parts:** Single part with empty or minimal prompt
- **Reason:** UI renders both, so avoid duplication

### For Section B (Q51-55)

- **Question text:** Include full passage/poem/table/prompt
- **Parts:** Each sub-question (a-j) as separate part
- **Reason:** Shared context in question text, individual questions in parts

### Structure Pattern

```json
{
  "question_number": 1,
  "text": "Rose crossed the road as __________ as it was clear.",
  "image_url": null,
  "parts": [
    {
      "order_index": 0,
      "text": "", // Empty to avoid duplication
      "answer": "soon",
      "explanation": "...",
      "marks": 1,
      "answer_type": "text"
    }
  ]
}
```

---

**Next Step:** Proceed to Phase 2 - Content Audit
