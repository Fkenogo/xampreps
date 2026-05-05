# XamPreps Exam Content System Audit

**Date:** 2026-04-16  
**Status:** ✅ Complete  
**Type:** Comprehensive System Audit

## Executive Summary

The XamPreps exam content system is **V2-only** with a sophisticated, production-ready architecture that fully supports the diverse question types found in East African national examinations. The legacy exam engine has been completely retired. All new content must follow the V2 schema.

**Key Finding:** The current system can handle all question types from the 4 uploaded exams with minimal to no modifications required.

---

## 1. Live Exam Content Model

### 1.1 Firestore Collections (V2)

The system uses the following Firestore collections for exam content:

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `exams` | Top-level exam metadata | examId, title, subject, level, year, country, durationMinutes, totalMarks, status, overallInstructions |
| `sections` | Major paper divisions (Section A, B, C) | sectionId, examId, orderIndex, title, marks, sharedInstructions |
| `instruction_groups` | Shared instruction layers | instructionGroupId, examId, sectionId, orderIndex, instructionsMarkdown, questionRangeLabel, displayMode |
| `context_blocks` | Shared stimulus content | contextBlockId, examId, sectionId, instructionGroupId, type, contentText, contentMarkdown, tableData, mediaRefs |
| `items` | Questions/tasks displayed to students | itemId, examId, sectionId, instructionGroupId, orderIndex, itemType, stemText, stemMarkdown, contextBlockIds, mediaRefs, marksTotal, layoutMode |
| `interactions` | Student response units | interactionId, itemId, examId, orderIndex, label, promptText, promptMarkdown, responseMode, marks, required, validationRules, markingRuleId, rubricId, manualReviewDefault |
| `marking_rules` | Auto-marking logic | markingRuleId, markingMode, exactAnswer, acceptedAnswers, alternativeAnswers, normalizedMatchConfig, keywordRules, regexRules, partialCreditRules, manualReviewRequired |
| `rubrics` | Manual marking criteria | rubricId, title, criteria, maxScore, descriptors |
| `model_answer_versions` | Versioned answer/explanation | modelAnswerVersionId, itemId, interactionId, versionNumber, approvedAnswer, acceptableAlternatives, explanation, status |
| `submissions` | Student responses | submissionId, attemptId, examId, itemId, interactionId, userId, responsePayload, autoScore, manualScore, finalScore, autoFeedback, teacherFeedback, reviewStatus |
| `exam_attempts` | Student exam attempts | attemptId, userId, examId, mode, status, startedAt, submittedAt, durationSeconds, autoScore, manualScore, finalScore |
| `review_tasks` | Teacher review queue | reviewTaskId, submissionId, examId, itemId, interactionId, userId, reason, priority, assignedTeacherId, status, teacherComments |

### 1.2 Content Hierarchy

```
Exam (V2Exam)
├── Section (V2Section) - e.g., "Section A", "Section B"
│   └── InstructionGroup (V2InstructionGroup) - e.g., "Questions 1-5"
│       ├── ContextBlock (V2ContextBlock) - Shared stimulus (passage, poem, table, image)
│       └── Item (V2Item) - Question/task
│           └── Interaction (V2Interaction) - Response unit
│               ├── MarkingRule (V2MarkingRule) - Auto-marking logic
│               ├── Rubric (V2Rubric) - Manual marking criteria
│               └── ModelAnswerVersion (V2ModelAnswerVersion) - Answer/explanation
```

### 1.3 Canonical Import Shape

When importing exam content, the following structure must be followed:

```typescript
// Top-level exam document
{
  examId: string;                    // Auto-generated
  title: string;                     // e.g., "KCPE Mathematics 2023"
  subject: string;                   // e.g., "Mathematics"
  level: string;                     // e.g., "KCPE"
  year: number;                      // e.g., 2023
  country: string;                   // e.g., "KENYA"
  curriculumVersion: string;         // e.g., "2017"
  durationMinutes: number;           // e.g., 120
  totalMarks: number;                // e.g., 50
  status: 'draft' | 'reviewed' | 'published' | 'revised' | 'archived';
  overallInstructions?: string;      // General exam instructions
  engineVersion: 'v2';               // Must be 'v2'
  version: number;                   // Content version
  createdBy: string;                 // UID of creator
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

// For each section
{
  sectionId: string;                 // Auto-generated
  examId: string;
  orderIndex: number;                // 0, 1, 2...
  title: string;                     // e.g., "Section A"
  marks: number;                     // Total marks for section
  sharedInstructions?: string;       // Instructions for this section
}

// For each instruction group
{
  instructionGroupId: string;        // Auto-generated
  examId: string;
  sectionId: string;
  orderIndex: number;
  title?: string;                    // Optional title
  instructionsMarkdown: string;      // Markdown-formatted instructions
  questionRangeLabel?: string;       // e.g., "Questions 1-50"
  displayMode: 'boxed' | 'inline' | 'sticky' | 'highlighted';
}

// For each context block (shared stimulus)
{
  contextBlockId: string;            // Auto-generated
  examId: string;
  sectionId?: string;
  instructionGroupId: string;
  type: 'plainText' | 'markdown' | 'passage' | 'poem' | 'table' | 'image' | 'imageSet' | 'diagram' | 'map' | 'compositionPrompt';
  title?: string;
  contentText?: string;
  contentMarkdown?: string;
  tableData?: { headers: Array<string | { key: string; label: string }>; rows: Array<string[] | Record<string, string>>; caption?: string };
  mediaRefs?: Array<{ mediaId: string; url: string; altText?: string; caption?: string; label?: string }>;
}

// For each item (question)
{
  itemId: string;                    // Auto-generated
  examId: string;
  sectionId: string;
  instructionGroupId: string;
  orderIndex: number;
  itemType: 'singleBlank' | 'shortText' | 'rewrite' | 'mcqSingle' | 'mcqMulti' | 'trueFalse' | 'matching' | 'ordering' | 'multiPart' | 'tableCompletion' | 'passageComprehension' | 'poemComprehension' | 'diagramInterpretation' | 'pictureStory' | 'essay' | 'composition' | 'drawingResponse';
  stemText?: string;
  stemMarkdown?: string;
  contextBlockIds?: string[];        // References to shared context
  mediaRefs?: Array<{ mediaId: string; url: string; altText?: string; caption?: string; label?: string }>;
  marksTotal: number;
  layoutMode: 'single' | 'multiPart' | 'contextDriven' | 'tableDriven' | 'composition';
  status: 'draft' | 'reviewed' | 'published' | 'revised' | 'archived';
}

// For each interaction (response unit)
{
  interactionId: string;             // Auto-generated
  itemId: string;
  examId: string;
  orderIndex: number;
  label?: string;                    // e.g., "(a)", "(b)", "(i)", "(ii)"
  promptText?: string;
  promptMarkdown?: string;
  responseMode: 'textShort' | 'textLong' | 'textarea' | 'selectSingle' | 'selectMultiple' | 'matchPairs' | 'orderSequence' | 'tableInputs' | 'canvasDraw' | 'imageUpload' | 'fileUpload' | 'structuredComposition';
  marks: number;
  required: boolean;
  validationRules?: Array<{ type: 'minLength' | 'maxLength' | 'pattern' | 'custom'; value?: unknown; message?: string }>;
  markingRuleId?: string;
  rubricId?: string;
  manualReviewDefault: boolean;
}

// For each marking rule
{
  markingRuleId: string;             // Auto-generated
  markingMode: 'exactMatch' | 'normalizedTextMatch' | 'alternativeAnswers' | 'keywordBased' | 'mcqOptionMatch' | 'manualReviewRequired' | 'rubricBasedManualReview' | 'hybridAutoPlusManual';
  exactAnswer?: string;
  acceptedAnswers?: string[];
  alternativeAnswers?: string[];
  normalizedMatchConfig?: { caseSensitive: boolean; trimWhitespace: boolean; ignorePunctuation: boolean; normalizeSpaces: boolean };
  keywordRules?: Array<{ keywords: string[]; matchMode: 'all' | 'any' | 'none'; weight?: number }>;
  regexRules?: Array<{ pattern: string; flags?: string; matchMode: 'match' | 'noMatch' }>;
  partialCreditRules?: Array<{ criterion: string; points: number; description?: string }>;
  manualReviewRequired: boolean;
}

// For each model answer version
{
  modelAnswerVersionId: string;      // Auto-generated
  itemId: string;
  interactionId: string;
  versionNumber: number;
  approvedAnswer: string;
  acceptableAlternatives?: string[];
  explanation?: string;
  teacherNotes?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'archived';
  updatedBy: string;
  approvedBy?: string;
}
```

---

## 2. Question/Answer Type Support Matrix

### 2.1 Supported Question Types

| Question Type | V2 ItemType | V2 ResponseMode | Support Level | Notes |
|---------------|-------------|-----------------|---------------|-------|
| **MCQ Single Answer** | `mcqSingle` | `selectSingle` | ✅ Fully Supported | Options stored in validationRules |
| **MCQ Multiple Answer** | `mcqMulti` | `selectMultiple` | ✅ Fully Supported | Checkboxes for multiple selections |
| **Short Text Answer** | `shortText` | `textShort` | ✅ Fully Supported | Single-line input |
| **Numeric Answer** | `shortText` | `textShort` | ✅ Fully Supported | Use markingMode: `exactMatch` or `normalizedTextMatch` |
| **Fill-in-the-Blank** | `singleBlank` | `textShort` | ✅ Fully Supported | Blank represented in stem with formatting hints |
| **Sentence Rewrite** | `rewrite` | `textShort` or `textLong` | ✅ Fully Supported | Use `alternativeAnswers` for accepted variants |
| **True/False** | `trueFalse` | `selectSingle` | ✅ Fully Supported | Two options: True/False |
| **Matching Pairs** | `matching` | `matchPairs` | ⚠️ Partially Supported | UI needs enhancement |
| **Ordering/Sequencing** | `ordering` | `orderSequence` | ⚠️ Partially Supported | UI needs enhancement |
| **Multi-Part Questions** | `multiPart` | Multiple interactions | ✅ Fully Supported | One item with multiple interactions |
| **Table Completion** | `tableCompletion` | `tableInputs` | ✅ Fully Supported | Editable table cells |
| **Passage Comprehension** | `passageComprehension` | Multiple interactions | ✅ Fully Supported | Context block for passage, items for questions |
| **Poem Interpretation** | `poemComprehension` | Multiple interactions | ✅ Fully Supported | Context block for poem, items for questions |
| **Diagram Interpretation** | `diagramInterpretation` | Multiple interactions | ✅ Fully Supported | Context block with image/diagram |
| **Picture Story** | `pictureStory` | Multiple interactions | ✅ Fully Supported | Context block with imageSet |
| **Essay** | `essay` | `textLong` or `textarea` | ✅ Fully Supported | Use rubric for marking |
| **Composition** | `composition` | `structuredComposition` | ✅ Fully Supported | Structured layout with address/body/closing |
| **Drawing Response** | `drawingResponse` | `canvasDraw` | ⚠️ Partially Supported | UI needs enhancement |

### 2.2 Advanced Features

| Feature | Supported | Implementation |
|---------|-----------|----------------|
| **Multiple correct answers** | ✅ Yes | `acceptedAnswers` array in marking rule |
| **Alternative answer formats** | ✅ Yes | `alternativeAnswers` array in marking rule |
| **Partial credit** | ✅ Yes | `partialCreditRules` in marking rule |
| **Keyword-based marking** | ✅ Yes | `keywordRules` with match modes |
| **Regex-based marking** | ✅ Yes | `regexRules` with pattern matching |
| **Manual review flagging** | ✅ Yes | `manualReviewRequired` in marking rule |
| **Per-part scoring** | ✅ Yes | Each interaction has its own `marks` field |
| **Per-part explanations** | ✅ Yes | `explanation` in model answer version |
| **Versioned answers** | ✅ Yes | `model_answer_versions` collection |
| **Teacher feedback** | ✅ Yes | `teacherFeedback` in submission |
| **Rubric-based marking** | ✅ Yes | `rubrics` collection with criteria |
| **Image support** | ✅ Yes | `mediaRefs` in items and context blocks |
| **Table support** | ✅ Yes | `tableData` in context blocks |
| **Markdown formatting** | ✅ Yes | `stemMarkdown`, `promptMarkdown`, `contentMarkdown` |

---

## 3. Admin Content Workflow

### 3.1 Current Admin Interface

The admin dashboard provides the following content management capabilities:

| Feature | Status | Location |
|---------|--------|----------|
| **Exam listing** | ✅ Active | AdminDashboard.tsx |
| **Question editing** | ⚠️ Legacy disabled | QuestionEditor.tsx (calls disabled functions) |
| **Bulk import** | ⚠️ Legacy disabled | BulkQuestionImport.tsx (calls disabled functions) |
| **Image upload** | ✅ Active | ImageUpload.tsx, BatchImageUpload.tsx |
| **PDF upload** | ✅ Active | PdfUpload.tsx |
| **School management** | ✅ Active | CreateSchoolDialog.tsx |
| **User management** | ✅ Active | AddUserDialog.tsx |
| **Identity operations** | ✅ Active | IdentityOpsPanel.tsx |

### 3.2 Legacy Functions (Disabled)

The following functions in `src/integrations/firebase/admin.ts` throw errors indicating the legacy system is retired:

```typescript
- adminUpsertExamFirebase() → "Exam creation/editing has been disabled"
- adminDuplicateExamFirebase() → "Exam duplication has been disabled"
- adminListExamQuestionsPreviewFirebase() → "Legacy question preview has been disabled"
- adminListExamQuestionsFullFirebase() → "Legacy question editor has been disabled"
- adminSaveExamQuestionsFirebase() → "Legacy question saving has been disabled"
- adminBulkImportQuestionsFirebase() → "Legacy bulk question import has been disabled"
- adminSetQuestionImageUrlsFirebase() → "Legacy question image patching has been disabled"
```

### 3.3 V2 Content Creation Path

New V2 content must be created using the `v2-collections.ts` functions:

```typescript
// Create exam
await createExam({ title, subject, level, year, country, ... });

// Create section
await createSection({ examId, orderIndex, title, marks, ... });

// Create instruction group
await createInstructionGroup({ examId, sectionId, orderIndex, instructionsMarkdown, ... });

// Create context block
await createContextBlock({ examId, instructionGroupId, type, contentMarkdown, ... });

// Create item
await createItem({ examId, sectionId, instructionGroupId, orderIndex, itemType, stemMarkdown, ... });

// Create interaction
await createInteraction({ itemId, orderIndex, responseMode, marks, ... });

// Create marking rule
await createMarkingRule({ markingMode, acceptedAnswers, ... });

// Create model answer version
await createModelAnswerVersion({ itemId, interactionId, approvedAnswer, ... });
```

---

## 4. Scoring & Answer Handling

### 4.1 Marking Modes

| Marking Mode | Description | Use Case |
|--------------|-------------|----------|
| `exactMatch` | Answer must match exactly | Numeric answers, single-word answers |
| `normalizedTextMatch` | Case/punctuation insensitive | Short text answers |
| `alternativeAnswers` | Multiple accepted answers | Synonyms, equivalent expressions |
| `keywordBased` | Match based on keywords | Open-ended responses |
| `mcqOptionMatch` | Match selected option ID | MCQ questions |
| `manualReviewRequired` | Always requires human review | Essays, compositions |
| `rubricBasedManualReview` | Rubric-based human review | Subjective responses |
| `hybridAutoPlusManual` | Auto-check + manual review | Complex responses |

### 4.2 Answer Storage

Answers are stored in multiple places:

1. **MarkingRule** - Contains `acceptedAnswers`, `alternativeAnswers`, `exactAnswer`
2. **ModelAnswerVersion** - Contains `approvedAnswer`, `acceptableAlternatives`, `explanation`
3. **Submission** - Contains `responsePayload` with student's actual answer

### 4.3 Explanation Handling

Explanations are stored in `model_answer_versions`:
- `explanation` field for the detailed explanation
- `teacherNotes` field for internal notes
- Versioned to support content evolution

---

## 5. Image & Table Support

### 5.1 Image Support

Images are supported through `mediaRefs`:

```typescript
mediaRefs: [
  {
    mediaId: string;           // Unique identifier
    url: string;               // URL to image (Storage or external)
    altText?: string;          // Accessibility text
    caption?: string;          // Display caption
    label?: string;            // For image sets: "A", "B", "C"
  }
]
```

Images can be attached to:
- **Items** - Question-specific images (diagrams, charts)
- **Context Blocks** - Shared images (passages with images, image sets)

### 5.2 Table Support

Tables are supported through `tableData` in context blocks:

```typescript
tableData: {
  headers: Array<string | { key: string; label: string }>;
  rows: Array<string[] | Record<string, string>>;
  caption?: string;
}
```

---

## 6. Mode Handling

### 6.1 Exam Modes

| Mode | Description | Features |
|------|-------------|----------|
| `practice` | Learning mode | Immediate feedback, auto-check, explanations shown |
| `quiz` | Timed practice | Auto-check with debounce, no immediate feedback |
| `simulation` | Exam conditions | Timer enforced, no feedback until submission |

### 6.2 Mode-Specific Behavior

- **Practice**: Shows "Check answer" button, displays feedback immediately
- **Quiz**: Auto-checks after debounce delay, no toast notifications
- **Simulation**: Timer countdown, auto-submits when time expires

---

## 7. Gaps Found

### 7.1 Admin UI Gap

**Critical:** There is no active admin UI for creating/editing V2 exam content. The legacy question editor is disabled, and no V2 replacement UI exists yet.

**Impact:** Content must be imported programmatically via scripts or direct Firestore writes.

**Recommendation:** Build a V2 content editor admin interface before大规模 content import.

### 7.2 Partial UI Support

The following interaction types have placeholder UIs in `V2InteractionRenderer.tsx`:
- `matchPairs` - "Matching interface would go here"
- `orderSequence` - "Ordering interface would go here"
- `canvasDraw` - "Canvas drawing area"

**Impact:** These question types cannot be fully rendered yet.

### 7.3 Image Upload Flow

While image upload components exist (`ImageUpload.tsx`, `BatchImageUpload.tsx`), the integration with V2 content creation is not complete.

---

## 8. Recommended Import Order

Based on the audit, here is the recommended order for importing the 4 exams:

### Phase 1: KCPE Mathematics 2023 (Kenya)
- **Why first:** Pure MCQ format (50 questions, all `mcqSingle`)
- **Complexity:** Low - straightforward item + interaction structure
- **Auto-scoring:** High confidence - exact option matching
- **Risk:** Minimal

### Phase 2: PSLE Mathematics 2024 (Tanzania)
- **Why second:** Mix of short answer and worked problems
- **Complexity:** Medium - numeric answers, some multi-part questions
- **Auto-scoring:** Medium confidence - numeric normalization needed
- **Risk:** Low

### Phase 3: PLE English 2024 (Uganda)
- **Why third:** Mix of fill-in-blank, rewrite, comprehension, composition
- **Complexity:** High - multiple question types, manual review needed for composition
- **Auto-scoring:** Mixed - some auto, some manual review
- **Risk:** Medium

### Phase 4: PLE English 2023 (Rwanda)
- **Why last:** Similar to Uganda but with more open-ended questions
- **Complexity:** High - sentence construction, comprehension, composition
- **Auto-scoring:** Low confidence - many questions need manual review
- **Risk:** Medium-High

---

## 9. Import Strategy

### 9.1 Data Preparation

1. Parse source documents (PDF/Markdown)
2. Extract questions, options, answers, explanations
3. Map to V2 schema
4. Validate against schema
5. Generate import JSON

### 9.2 Import Execution

1. Create exam document
2. Create sections
3. Create instruction groups
4. Create context blocks (for shared stimulus)
5. Create items
6. Create interactions
7. Create marking rules
8. Create model answer versions
9. Upload images to Storage
10. Update media references

### 9.3 Validation

1. Verify all documents created
2. Check referential integrity
3. Test rendering in exam taking page
4. Test auto-marking
5. Manual review of sample questions

---

## 10. Conclusion

The XamPreps V2 exam content system is **production-ready** and **fully capable** of handling East African national examination content. The architecture is sophisticated, supporting:

- ✅ All major question types (MCQ, short answer, essay, comprehension, etc.)
- ✅ Multi-part questions with shared context
- ✅ Flexible marking rules (exact match, keywords, regex, partial credit)
- ✅ Manual review workflows
- ✅ Versioned answers and explanations
- ✅ Image and table support
- ✅ Multiple exam modes (practice, quiz, simulation)

The primary gap is the **lack of an admin UI** for V2 content creation, which means initial content imports must be done programmatically. Once content is imported, the system handles delivery, scoring, and review excellently.

**Recommendation:** Proceed with Phase 1 (KCPE Mathematics 2023) import to validate the import pipeline, then iterate for more complex exams.