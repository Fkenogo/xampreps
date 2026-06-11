# Legacy Exam Engine Archive

## Overview

This document archives the legacy exam engine that preceded XamPreps V2. The legacy system is preserved for reference only and should **not** be extended or modified.

## Status: DEPRECATED

The legacy exam engine is **frozen** as of the V2 reset decision. No new features, patches, or exam imports should target this system.

## Legacy Architecture

### Data Model

The legacy system used a simple but structurally limited model:

```
exams (collection)
  └── questions (subcollection or flat collection)
        └── question_parts (subcollection or flat collection)
```

### Key Files

#### Frontend Types (`src/types/index.ts`)

```typescript
// LEGACY - DO NOT USE FOR NEW DEVELOPMENT
export interface Exam {
  id: string;
  title: string;
  subject: string;
  questions: Question[]; // Nested questions
  // ...
}

export interface Question {
  id: string;
  questionNumber: number;
  text: string;
  parts: QuestionPart[]; // Flat parts array
}

export interface QuestionPart {
  id: string;
  text: string;
  marks: number;
  answer: string;
}
```

**Problems with this model:**

- No support for grouped instructions
- No support for shared context blocks (passages, tables, images)
- No separation between item display and interaction input
- No teacher review workflow
- No answer versioning

#### Firebase Integration (`src/integrations/firebase/content.ts`)

```typescript
// LEGACY - DO NOT USE FOR NEW DEVELOPMENT
export interface FirebaseExam {
  id: string;
  question_count?: number;
  // Mixed camelCase/snake_case naming
}

export interface FirebaseQuestion {
  exam_id: string; // snake_case
  question_parts: FirebaseQuestionPart[];
  parts: FirebaseQuestionPart[]; // Duplicate fields
}
```

**Problems:**

- Inconsistent naming (camelCase vs snake_case)
- Duplicate field names
- No support for V2 concepts like instructionGroups, contextBlocks

#### Cloud Functions (`functions/index.js`)

Legacy functions include:

- `listExams` - Lists exams with dual naming support
- `getExamContent` - Fetches exam with questions and parts
- `submitExamAttempt` - Records exam attempt
- `listExamHistory` - Lists user's exam history

**Problems:**

- No auto-marking logic
- No teacher review queue
- No rubric support
- Simple score aggregation only

#### Import Scripts (`functions/scripts/`)

Legacy import scripts:

- `importExamPackage.js` - Generic import script
- `parseScienceGuide.js` - PLE Science 2024 parser
- `fixEnglish2024Structure.js` - Patch script for English 2024
- `patchPleEnglish2024Structure.js` - Another patch script
- `setMaths2015ImageUrls.js` - Image URL setter
- `setScience2024ImageUrls.js` - Image URL setter

**Problems:**

- Exam-specific hacks rather than generic solutions
- Patch scripts indicate structural issues
- No validation against a robust schema

#### Import Data (`docs/imports/`)

Legacy import JSON files:

- `ple-maths-2015.import.json`
- `ple-maths-2015.final.import.json`
- `ple-science-2024.final.import.json`
- `ple-english-2024.insert-ready.json`

**Problems:**

- Flat question/part structure
- No instruction groups
- No context blocks
- Mixed formatting

### Legacy Firestore Collections

| Collection         | Purpose                    | Status                      |
| ------------------ | -------------------------- | --------------------------- |
| `exams`            | Exam metadata              | DEPRECATED                  |
| `questions`        | Question content           | DEPRECATED                  |
| `question_parts`   | Question part content      | DEPRECATED                  |
| `exam_attempts`    | Student attempts           | DEPRECATED (being replaced) |
| `question_history` | Spaced repetition tracking | DEPRECATED                  |

### Known Issues That Led to V2

1. **No Instruction Groups**: Real East African papers have grouped instructions like "Questions 1-5: Fill in the blanks" - the legacy model had no way to represent this.

2. **No Shared Context**: Passages, tables, and images that apply to multiple questions had to be duplicated or awkwardly referenced.

3. **Duplication Problems**: The rendering layer often duplicated text between question stem and parts.

4. **No Teacher Workflow**: No support for manual marking, review queues, or rubric-based scoring.

5. **Static Answers**: No versioning for answers or explanations - mistakes would persist forever.

6. **Naming Inconsistency**: Mixed camelCase/snake_case throughout caused confusion and bugs.

7. **Limited Interaction Types**: Only text-based answers were well-supported; no support for matching, ordering, table completion, etc.

## Migration Path

The V2 system replaces this legacy architecture with:

| Legacy Concept  | V2 Replacement            |
| --------------- | ------------------------- |
| `exam`          | `exam` (enhanced)         |
| `question`      | `item` + `interaction(s)` |
| `question_part` | `interaction`             |
| (missing)       | `section`                 |
| (missing)       | `instructionGroup`        |
| (missing)       | `contextBlock`            |
| (missing)       | `markingRule`             |
| (missing)       | `rubric`                  |
| (missing)       | `modelAnswerVersion`      |
| (missing)       | `reviewTask`              |

## Reference Only

This archive exists so that:

1. We understand what problems V2 solves
2. We can reference old data if needed
3. We don't accidentally repeat the same mistakes

**Do not:**

- Add new features to the legacy system
- Import new exams using the legacy format
- Patch legacy rendering issues
- Use legacy types in new code
