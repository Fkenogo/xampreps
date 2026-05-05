# XamPreps V2 Import Contract

**Date:** 2026-04-16  
**Status:** ✅ Complete  
**Purpose:** Exact field shape, required values, nesting, and write order for V2 exam import

---

## Overview

This document provides the exact import contract for the XamPreps V2 exam system. It documents the real field requirements, validation rules, and write order based on the live codebase analysis.

**Key Finding:** The V2 system requires strict adherence to field naming, type requirements, and write order. All Date fields are automatically converted to Firestore Timestamps.

---

## Collection Write Order

**CRITICAL:** Documents must be created in this exact order:

1. **Exam** (creates examId)
2. **Section** (requires examId)
3. **InstructionGroup** (requires examId + sectionId)
4. **ContextBlock** (requires examId + optional sectionId + optional instructionGroupId)
5. **Item** (requires examId + sectionId + optional instructionGroupId)
6. **Interaction** (requires itemId + examId)
7. **MarkingRule** (optional, referenced by interaction)
8. **Rubric** (optional, referenced by interaction)
9. **ModelAnswerVersion** (requires itemId + interactionId)

---

## Field Requirements Summary

| Entity | Required Fields | Optional Fields | Auto-Generated |
|--------|----------------|-----------------|----------------|
| Exam | title, subject, level, year, country, curriculumVersion, durationMinutes, totalMarks, status, version, createdBy | overallInstructions, sourceFiles | examId, createdAt, updatedAt |
| Section | examId, orderIndex, title, marks | sharedInstructions | sectionId, createdAt, updatedAt |
| InstructionGroup | examId, sectionId, orderIndex, instructionsMarkdown, displayMode | title, questionRangeLabel | instructionGroupId, createdAt, updatedAt |
| ContextBlock | examId, type | sectionId, instructionGroupId, title, contentText, contentMarkdown, tableData, mediaRefs, layoutHint, sourceReference | contextBlockId, createdAt, updatedAt |
| Item | examId, sectionId, orderIndex, itemType, marksTotal, layoutMode, status | instructionGroupId, stemText, stemMarkdown, contextBlockIds, mediaRefs, sourceReference, sourceFormattingHints | itemId, createdAt, updatedAt |
| Interaction | itemId, examId, orderIndex, responseMode, marks, required, manualReviewDefault | parentInteractionId, label, promptText, promptMarkdown, validationRules, markingRuleId, rubricId | interactionId, createdAt, updatedAt |
| MarkingRule | markingMode, manualReviewRequired | exactAnswer, acceptedAnswers, alternativeAnswers, normalizedMatchConfig, normalizationProfile, keywordRules, regexRules, partialCreditRules, notes | markingRuleId, createdAt, updatedAt |
| Rubric | title, criteria, maxScore, descriptors | feedbackTemplateIds | rubricId, createdAt, updatedAt |
| ModelAnswerVersion | itemId, interactionId, versionNumber, approvedAnswer, status, updatedBy | acceptableAlternatives, explanation, teacherNotes, changeReason, approvedBy | modelAnswerVersionId, createdAt |

---

## Detailed Field Specifications

### 1. Exam Entity

**Collection:** `exams`

**Required Fields:**
- `examId`: string (auto-generated)
- `title`: string (e.g., "KCPE Mathematics 2023")
- `subject`: string (e.g., "Mathematics")
- `level`: string (must be from `V2EducationLevel` enum)
- `year`: number (e.g., 2023)
- `country`: string (must be from `SupportedCountryCode` enum)
- `curriculumVersion`: string (e.g., "2017")
- `durationMinutes`: number (e.g., 120)
- `totalMarks`: number (e.g., 50)
- `status`: string (must be from `V2ExamStatus` enum)
- `version`: number (e.g., 1)
- `createdBy`: string (user UID)
- `createdAt`: Date (auto-set)
- `updatedAt`: Date (auto-set)

**Optional Fields:**
- `overallInstructions`: string
- `sourceFiles`: array of `{name, url, type, uploadedAt}`

**Enum Values:**
- `V2ExamStatus`: 'draft' | 'reviewed' | 'published' | 'revised' | 'archived'
- `V2EducationLevel`: 'PLE' | 'UCE' | 'UACE' | 'KCPE' | 'KPSEA' | 'KJSEA' | 'KCSE' | 'PSLE' | 'CSEE' | 'ACSEE' | 'O_LEVEL' | 'A_LEVEL' | 'CEP' | 'CYCLE_FONDAMENTAL' | 'EXAMEN_ETAT'
- `SupportedCountryCode`: 'UGANDA' | 'KENYA' | 'TANZANIA' | 'RWANDA' | 'BURUNDI'

### 2. Section Entity

**Collection:** `sections`

**Required Fields:**
- `sectionId`: string (auto-generated)
- `examId`: string (must reference existing exam)
- `orderIndex`: number (0, 1, 2...)
- `title`: string (e.g., "Section A")
- `marks`: number (total marks for section)
- `createdAt`: Date (auto-set)
- `updatedAt`: Date (auto-set)

**Optional Fields:**
- `sharedInstructions`: string

### 3. InstructionGroup Entity

**Collection:** `instruction_groups`

**Required Fields:**
- `instructionGroupId`: string (auto-generated)
- `examId`: string (must reference existing exam)
- `sectionId`: string (must reference existing section)
- `orderIndex`: number (0, 1, 2...)
- `instructionsMarkdown`: string (markdown-formatted instructions)
- `displayMode`: string (must be from `V2InstructionDisplayMode` enum)
- `createdAt`: Date (auto-set)
- `updatedAt`: Date (auto-set)

**Optional Fields:**
- `title`: string
- `questionRangeLabel`: string (e.g., "Questions 1-5")

**Enum Values:**
- `V2InstructionDisplayMode`: 'boxed' | 'inline' | 'sticky' | 'highlighted'

### 4. ContextBlock Entity

**Collection:** `context_blocks`

**Required Fields:**
- `contextBlockId`: string (auto-generated)
- `examId`: string (must reference existing exam)
- `type`: string (must be from `V2ContextBlockType` enum)
- `createdAt`: Date (auto-set)
- `updatedAt`: Date (auto-set)

**Optional Fields:**
- `sectionId`: string (must reference existing section)
- `instructionGroupId`: string (must reference existing instruction group)
- `title`: string
- `contentText`: string
- `contentMarkdown`: string
- `tableData`: object with `{headers, rows, caption}`
- `mediaRefs`: array of media references
- `layoutHint`: string
- `sourceReference`: string

**Enum Values:**
- `V2ContextBlockType`: 'plainText' | 'markdown' | 'passage' | 'poem' | 'table' | 'image' | 'imageSet' | 'diagram' | 'map' | 'compositionPrompt'

### 5. Item Entity

**Collection:** `items`

**Required Fields:**
- `itemId`: string (auto-generated)
- `examId`: string (must reference existing exam)
- `sectionId`: string (must reference existing section)
- `orderIndex`: number (0, 1, 2...)
- `itemType`: string (must be from `V2ItemType` enum)
- `marksTotal`: number
- `layoutMode`: string (must be from `V2ItemLayoutMode` enum)
- `status`: string (must be from `V2ExamStatus` enum)
- `createdAt`: Date (auto-set)
- `updatedAt`: Date (auto-set)

**Optional Fields:**
- `instructionGroupId`: string (must reference existing instruction group)
- `stemText`: string
- `stemMarkdown`: string
- `contextBlockIds`: array of strings (must reference existing context blocks)
- `mediaRefs`: array of media references
- `sourceReference`: string
- `sourceFormattingHints`: array of formatting hints

**Enum Values:**
- `V2ItemType`: 'singleBlank' | 'shortText' | 'rewrite' | 'mcqSingle' | 'mcqMulti' | 'trueFalse' | 'matching' | 'ordering' | 'multiPart' | 'tableCompletion' | 'passageComprehension' | 'poemComprehension' | 'diagramInterpretation' | 'pictureStory' | 'essay' | 'composition' | 'drawingResponse'
- `V2ItemLayoutMode`: 'single' | 'multiPart' | 'contextDriven' | 'tableDriven' | 'composition'

### 6. Interaction Entity

**Collection:** `interactions`

**Required Fields:**
- `interactionId`: string (auto-generated)
- `itemId`: string (must reference existing item)
- `examId`: string (must reference existing exam)
- `orderIndex`: number (0, 1, 2...)
- `responseMode`: string (must be from `V2ResponseMode` enum)
- `marks`: number
- `required`: boolean
- `manualReviewDefault`: boolean
- `createdAt`: Date (auto-set)
- `updatedAt`: Date (auto-set)

**Optional Fields:**
- `parentInteractionId`: string (must reference existing interaction)
- `label`: string (e.g., "(a)", "(b)")
- `promptText`: string
- `promptMarkdown`: string
- `validationRules`: array of validation rules
- `markingRuleId`: string (must reference existing marking rule)
- `rubricId`: string (must reference existing rubric)

**Enum Values:**
- `V2ResponseMode`: 'textShort' | 'textLong' | 'textarea' | 'selectSingle' | 'selectMultiple' | 'matchPairs' | 'orderSequence' | 'tableInputs' | 'canvasDraw' | 'imageUpload' | 'fileUpload' | 'structuredComposition'

### 7. MarkingRule Entity

**Collection:** `marking_rules`

**Required Fields:**
- `markingRuleId`: string (auto-generated)
- `markingMode`: string (must be from `V2MarkingMode` enum)
- `manualReviewRequired`: boolean
- `createdAt`: Date (auto-set)
- `updatedAt`: Date (auto-set)

**Optional Fields:**
- `exactAnswer`: string
- `acceptedAnswers`: array of strings
- `alternativeAnswers`: array of strings
- `normalizedMatchConfig`: object with `{caseSensitive, trimWhitespace, ignorePunctuation, normalizeSpaces}`
- `normalizationProfile`: object with `{caseSensitive, trimWhitespace, ignorePunctuation, normalizeSpaces, normalizeNumeric, allowUnitOmission, unitTokens}`
- `keywordRules`: array of keyword rules
- `regexRules`: array of regex rules
- `partialCreditRules`: array of partial credit rules
- `notes`: string

**Enum Values:**
- `V2MarkingMode`: 'exactMatch' | 'normalizedTextMatch' | 'alternativeAnswers' | 'keywordBased' | 'mcqOptionMatch' | 'manualReviewRequired' | 'rubricBasedManualReview' | 'hybridAutoPlusManual'

### 8. Rubric Entity

**Collection:** `rubrics`

**Required Fields:**
- `rubricId`: string (auto-generated)
- `title`: string
- `criteria`: array of criteria objects
- `maxScore`: number
- `descriptors`: array of descriptor objects
- `createdAt`: Date (auto-set)
- `updatedAt`: Date (auto-set)

**Optional Fields:**
- `feedbackTemplateIds`: array of strings

**Criteria Object:**
```typescript
{
  name: string,
  description: string,
  maxPoints: number,
  weight?: number
}
```

**Descriptor Object:**
```typescript
{
  level: number,
  label?: string,
  description: string
}
```

### 9. ModelAnswerVersion Entity

**Collection:** `model_answer_versions`

**Required Fields:**
- `modelAnswerVersionId`: string (auto-generated)
- `itemId`: string (must reference existing item)
- `interactionId`: string (must reference existing interaction)
- `versionNumber`: number
- `approvedAnswer`: string
- `status`: string (must be from `V2ModelAnswerStatus` enum)
- `updatedBy`: string (user UID)
- `createdAt`: Date (auto-set)

**Optional Fields:**
- `acceptableAlternatives`: array of strings
- `explanation`: string
- `teacherNotes`: string
- `changeReason`: string
- `approvedBy`: string (user UID)

**Enum Values:**
- `V2ModelAnswerStatus`: 'draft' | 'pending_approval' | 'approved' | 'archived'

---

## Date Field Handling

**IMPORTANT:** All Date fields are automatically converted to Firestore Timestamps by the `serializeDates()` function:

- `createdAt` - Set to current date on creation
- `updatedAt` - Set to current date on creation and update
- `publishedAt` - Optional, set when exam is published
- `reviewedAt` - Optional, set when review is completed
- `resolvedAt` - Optional, set when review task is resolved
- `uploadedAt` - Optional, set when source file is uploaded

**Do NOT include these fields in your import JSON** - they are auto-generated.

---

## Media Reference Format

Media references must follow this exact structure:

```typescript
{
  mediaId: string,           // Unique identifier
  url: string,               // Full URL to image/file
  altText?: string,          // Accessibility text
  caption?: string,          // Display caption
  label?: string             // For image sets: "A", "B", "C"
}
```

---

## Validation Rules Format

Validation rules must follow this exact structure:

```typescript
{
  type: 'minLength' | 'maxLength' | 'pattern' | 'custom',
  value?: unknown,           // Depends on type
  message?: string           // Custom error message
}
```

---

## Write Order Dependencies

**CRITICAL:** The system enforces strict referential integrity. All foreign keys must reference existing documents:

1. **Exam** → No dependencies
2. **Section** → Depends on Exam
3. **InstructionGroup** → Depends on Exam + Section
4. **ContextBlock** → Depends on Exam (optional Section + InstructionGroup)
5. **Item** → Depends on Exam + Section (optional InstructionGroup)
6. **Interaction** → Depends on Item + Exam
7. **MarkingRule** → No dependencies (standalone)
8. **Rubric** → No dependencies (standalone)
9. **ModelAnswerVersion** → Depends on Item + Interaction

**Failure to follow this order will result in broken references.**

---

## Required vs Optional Field Strategy

### Always Include:
- All required fields listed above
- `orderIndex` for proper sequencing
- `status` for content lifecycle management
- `marks` for scoring

### Include When Applicable:
- `instructionGroupId` when items belong to instruction groups
- `contextBlockIds` when items reference shared context
- `markingRuleId` when auto-marking is needed
- `rubricId` when manual marking is needed
- `mediaRefs` when images are required

### Never Include:
- Auto-generated IDs (`examId`, `sectionId`, etc.)
- Date fields (`createdAt`, `updatedAt`, etc.)
- Fields not defined in the schema

---

## Error Handling

The system will reject imports with:
- Missing required fields
- Invalid enum values
- Broken foreign key references
- Incorrect field types
- Missing write order dependencies

**Recommendation:** Validate JSON against this contract before import.

---

## Next Steps

1. Use this contract to generate import JSON
2. Follow the exact write order
3. Validate all foreign key references
4. Test with the minimal sample provided in `v2-import-minimal-sample.json`
5. Scale up to full exam imports

This contract represents the exact requirements of the live XamPreps V2 system.