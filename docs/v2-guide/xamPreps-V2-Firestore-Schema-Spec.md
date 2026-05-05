# xamPreps V2 Firestore Schema Spec

## **1. Schema strategy**

Use Firestore top-level collections with explicit references, not one giant nested document.

Why:

- easier querying across exams
- easier teacher queues
- cleaner updates and versioning
- less duplication
- better Cloud Function workflows

Also, drop the current dual camelCase/snake_case duplication. The audit already flagged that as a major structural problem. Use **one naming style only**. I recommend **camelCase** throughout.

## **2. Naming standard**

Use:

- camelCase only
- Firestore Timestamp for dates, not mixed ISO strings
- explicit reference IDs instead of embedding everything

## **3. Top-level collections**

### **exams**

Stores exam-level metadata.

**Document ID**

- examId string, stable slug-like ID

**Fields**

- title
- subject
- level
- year
- country
- curriculumVersion
- durationMinutes
- totalMarks
- status
- overallInstructions
- sourceFiles
- version
- createdAt
- updatedAt
- publishedAt
- createdBy
- updatedBy

---

### **sections**

One document per major section.

**Document ID**

- generated or deterministic

**Fields**

- examId
- orderIndex
- title
- marks
- sharedInstructions
- createdAt
- updatedAt

---

### **instructionGroups**

Shared instruction layer for a cluster of items.

**Fields**

- examId
- sectionId
- orderIndex
- title
- instructionsMarkdown
- questionRangeLabel
- displayMode
- createdAt
- updatedAt

**Examples**

- Questions 1–5
- Questions 31–50
- Read the passage below...

---

### **contextBlocks**

Shared stimulus content.

**Fields**

- examId
- sectionId
- instructionGroupId
- type
- title
- contentText
- contentMarkdown
- tableData
- mediaRefs
- layoutHint
- sourceReference
- createdAt
- updatedAt

**Allowed type values**

- plainText
- markdown
- passage
- poem
- table
- image
- imageSet
- diagram
- map
- compositionPrompt

This directly reflects the research’s “shared context/stimulus” model.

---

### **items**

The displayed exam units.

**Fields**

- examId
- sectionId
- instructionGroupId
- orderIndex
- itemType
- stemText
- stemMarkdown
- contextBlockIds
- mediaRefs
- marksTotal
- layoutMode
- sourceReference
- sourceFormattingHints
- status
- createdAt
- updatedAt

**Allowed itemType values**

- singleBlank
- shortText
- rewrite
- mcqSingle
- mcqMulti
- trueFalse
- matching
- ordering
- multiPart
- tableCompletion
- passageComprehension
- poemComprehension
- diagramInterpretation
- pictureStory
- essay
- composition
- drawingResponse

---

### **interactions**

One document per student response unit.

**Fields**

- itemId
- examId
- parentInteractionId
- orderIndex
- label
- promptText
- promptMarkdown
- responseMode
- marks
- required
- validationRules
- markingRuleId
- rubricId
- manualReviewDefault
- createdAt
- updatedAt

**Allowed responseMode values**

- textShort
- textLong
- textarea
- selectSingle
- selectMultiple
- matchPairs
- orderSequence
- tableInputs
- canvasDraw
- imageUpload
- fileUpload
- structuredComposition

The research points clearly to this separation between question wrapper and response mode.

---

### **markingRules**

Stores the marking logic for one interaction.

**Fields**

- markingMode
- exactAnswer
- alternativeAnswers
- normalizedMatchConfig
- keywordRules
- regexRules
- partialCreditRules
- manualReviewRequired
- notes
- createdAt
- updatedAt

**Allowed markingMode values**

- exactMatch
- normalizedTextMatch
- alternativeAnswers
- keywordBased
- mcqOptionMatch
- manualReviewRequired
- rubricBasedManualReview
- hybridAutoPlusManual

---

### **rubrics**

Rubric definitions for manual/hybrid marking.

**Fields**

- title
- criteria
- maxScore
- descriptors
- feedbackTemplateIds
- createdAt
- updatedAt

**Example criteria**

- content relevance
- structure
- grammar
- vocabulary
- creativity

Rubrics are especially important for compositions, summaries, functional writing, and long-form answers.

---

### **modelAnswerVersions**

Versioned answer/explanation layer.

**Fields**

- itemId
- interactionId
- versionNumber
- approvedAnswer
- acceptableAlternatives
- explanation
- teacherNotes
- status
- changeReason
- updatedBy
- approvedBy
- createdAt

This collection is the core of the evolving-content model.

---

### **examAttempts**

One document per student attempt.

**Fields**

- userId
- examId
- mode
- status
- startedAt
- submittedAt
- completedAt
- durationSeconds
- autoScore
- manualScore
- finalScore
- performanceSummary
- createdAt
- updatedAt

**Allowed mode**

- practice
- quiz
- simulation

---

### **submissions**

One document per interaction response.

**Fields**

- attemptId
- examId
- itemId
- interactionId
- userId
- responsePayload
- autoScore
- manualScore
- finalScore
- autoFeedback
- teacherFeedback
- reviewStatus
- reviewedBy
- submittedAt
- reviewedAt
- createdAt
- updatedAt

**responsePayload examples**

- selected option IDs
- text answer
- table cell answers
- uploaded file URL
- drawing/image ref

---

### **reviewTasks**

Teacher queue.

**Fields**

- submissionId
- examId
- itemId
- interactionId
- userId
- reason
- priority
- assignedTeacherId
- status
- teacherComments
- interventionNotes
- rubricScores
- createdAt
- updatedAt
- resolvedAt

This directly supports the “needs human review” workflow recommended in the research.

---

### **feedbackTemplates**

Reusable teacher comments.

**Fields**

- title
- text
- subject
- level
- active
- createdBy
- createdAt
- updatedAt

---

## **4. Relationship rules**

### **Exam → Sections**

One exam has many sections.

### **Section → Instruction Groups**

One section has many instruction groups.

### **Instruction Group → Context Blocks**

One instruction group may have zero or many context blocks.

### **Instruction Group → Items**

One instruction group has many items.

### **Item → Interactions**

One item has one or many interactions.

### **Interaction → Marking Rule**

One interaction has one marking rule.

### **Interaction → Rubric**

Optional, when manual or hybrid marking is needed.

### **Interaction → Model Answer Versions**

One interaction may have many model answer versions.

### **Exam Attempt → Submissions**

One attempt has many submissions.

### **Submission → Review Task**

Optional, only if review is needed.

---

## **5. Content examples by type**

### **Simple fill-in question**

- one item
- one interaction
- no context block
- normalized or exact marking rule

### **Passage comprehension**

- one context block for passage
- one item wrapping the passage question set
- many interactions, one per sub-question

### **Table completion**

- one context block with tableData
- one item
- multiple interactions, possibly one per missing cell

### **Composition**

- one item
- one interaction with structuredComposition or textarea
- rubric + manual review
- optional model answer version

### **Drawing answer**

- one item
- one interaction with imageUpload or canvasDraw
- manual review rule

These directly reflect the scenario set in the research.

---

## **6. Firestore indexing priorities**

At minimum, plan composite indexes for:

### **items**

- examId + orderIndex
- sectionId + orderIndex
- instructionGroupId + orderIndex

### **interactions**

- itemId + orderIndex

### **examAttempts**

- userId + completedAt desc
- userId + examId + completedAt desc

### **submissions**

- attemptId + interactionId
- userId + reviewStatus + submittedAt desc
- examId + reviewStatus + submittedAt desc

### **reviewTasks**

- status + priority + createdAt
- assignedTeacherId + status + createdAt
- examId + status + createdAt

This also responds to the current audit concern that indexes are missing.

---

## **7. Cloud Functions ownership**

These collections should not be freely written from the client.

### **Client-safe direct writes**

Only limited submission drafts if needed.

### **Cloud Functions should own**

- publishing exams
- creating model answer versions
- auto-marking
- score aggregation
- creating review tasks
- teacher approval workflow
- rubric score finalization

This keeps logic centralized and safer.

---

## **8. Legacy migration note**

The old schema:

- exams
- questions
- question_parts

should be treated as legacy content.

Migration later can map:

- question → item
- question_part → interaction
- repeated wrappers → instructionGroup / contextBlock

But do not force that migration now.

---

## **9. Explicit decisions locked in this spec**

- Firestore only for storage, with Cloud Functions heavy logic
- camelCase only
- grouped instructions are first-class
- context blocks are first-class
- items and interactions are separate
- teacher review is first-class
- answers/explanations are versioned
- old schema is legacy, not the future target