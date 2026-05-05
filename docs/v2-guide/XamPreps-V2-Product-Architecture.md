# XamPreps V2 Product Architecture

## **1. Product vision**

XamPreps V2 is a dynamic exam-learning platform for East African exam systems, built to preserve the feel of real exam papers while adding modern learning, marking, and teacher feedback workflows.

It is not just:

- a PDF library
- a question bank
- a static answer key

It is:

- a paper-faithful practice platform
- a mixed auto/human marking system
- a teacher-in-the-loop improvement engine
- a content system that evolves over time

This direction is strongly supported by the research: East African papers are sectional, context-heavy, instruction-grouped, and often mix objective, structured, and long-form responses in one paper.

## **2. Core product goals**

The product must support:

### **Student goals**

- practice real exam papers in a way that resembles the paper
- switch between modes: practice, quiz, simulation
- receive instant feedback where possible
- receive teacher review where needed
- learn from explanations that improve over time

### **Teacher goals**

- review flagged student responses
- apply partial credit
- use rubrics
- leave comments and intervention notes
- improve model answers and explanations over time

### **Platform goals**

- support many exam styles without redesigning the schema per paper
- support mixed marking modes
- preserve sections, grouped instructions, and shared contexts
- allow content to evolve safely with version history

## **3. Design principles**

### **A. Paper fidelity first**

The student should feel the structure of the real paper:

- section titles
- subsection titles
- grouped instructions
- shared stimulus blocks
- marks and part structure
- formatting-sensitive prompts where possible

### **B. One flexible engine**

Do not create a different schema for each paper.

Use one flexible content engine that supports different item and interaction types.

### **C. Rendering is separate from marking**

What the student sees and how the system marks it are related, but not the same thing.

This matters because a single displayed context block may drive many marked interactions. The research explicitly supports separating the “stimulus” from the “item/interaction.”

### **D. Teacher workflow is core**

Teachers are part of the system from day 1, not a future enhancement.

### **E. Content is versioned**

Answers and explanations can improve over time through review and approval.

## **4. Product modules**

### **Module 1 — Exam Content Engine**

Responsible for:

- exam metadata
- sections
- instruction groups
- context blocks
- items
- interactions
- model answers

### **Module 2 — Student Delivery Engine**

Responsible for:

- practice mode
- quiz mode
- simulation mode
- navigation
- answer capture
- progress tracking

### **Module 3 — Marking Engine**

Responsible for:

- exact auto-marking
- normalized auto-marking
- keyword-based grading
- hybrid routing
- manual review triggers

The research repeatedly shows the need for auto/hybrid/manual coexistence.

### **Module 4 — Teacher Review Engine**

Responsible for:

- review queue
- rubric scoring
- comments
- intervention notes
- partial credit
- approval of content updates

### **Module 5 — Content Evolution Engine**

Responsible for:

- answer revisions
- explanation revisions
- approval workflow
- model answer version history

## **5. Product object model**

### **Exam**

Top-level paper container.

### **Section**

Major division of the paper.

### **Instruction Group**

Shared instruction layer for a range of items.

This is one of the most important additions because real papers often apply one instruction to several questions.

### **Context Block**

Reusable or shared stimulus:

- passage
- poem
- table
- image
- image set
- diagram
- map
- composition prompt

### **Item**

The displayed unit in the exam flow.

An item may be:

- a single-response question
- a grouped multi-part block
- a passage comprehension block
- a composition prompt
- a table completion block

### **Interaction**

The actual student response unit.

An item may have one or many interactions.

### **Marking Rule**

The logic for evaluating one interaction.

### **Rubric**

The criteria for manual or hybrid marking.

### **Submission**

The student’s saved response.

### **Review Task**

A teacher-facing review queue entry.

### **Model Answer Version**

The approved answer/explanation version attached to an interaction or item.

## **6. Supported exam scenarios**

The architecture must support at minimum:

### **Closed-response**

- MCQ single
- MCQ multi
- true/false
- matching
- ordering
- fill-in blank

### **Structured response**

- short answer
- rewrite / transformation
- table completion
- multi-part structured questions

### **Context-heavy**

- passage comprehension
- poem comprehension
- diagram interpretation
- image/picture interpretation
- map interpretation
- graph/table/data interpretation

### **Long-form**

- composition
- essay
- functional writing
- explanation-based responses

### **Special**

- drawing upload
- mixed interaction items
- grouped marks
- formatting-sensitive tasks

These scenarios are directly supported by the research set.

## **7. Student modes**

### **Practice mode**

- immediate checking where possible
- hints/explanations available
- feedback-rich

### **Quiz mode**

- compact one-by-one interaction
- fast repetition
- low-friction practice

### **Simulation mode**

- paper-like timing
- reduced help
- full-paper flow
- delayed reveal where appropriate

## **8. Marking model**

### **Auto-marking**

For:

- exact answers
- MCQ
- true/false
- normalized short text
- accepted alternatives

### **Hybrid marking**

For:

- comprehension
- short open-ended answers
- picture/table interpretation
- scenario/application questions

### **Manual/rubric marking**

For:

- compositions
- essays
- letters
- drawing/image responses
- long-form science/humanities answers

This mixed mode is one of the clearest research findings and aligns with your chosen hybrid strategy.

## **9. Teacher workflow**

Teacher flow should be:

1. student submits answer
2. system auto-marks what it can
3. manual or uncertain responses generate review tasks
4. teacher reviews and scores
5. teacher comments and notes saved
6. teacher may propose answer/explanation correction
7. approved updates become a new model answer version

### **Teacher capabilities**

- score manually
- apply partial credit
- use rubrics
- comment on responses
- use feedback templates
- escalate problematic content
- propose answer updates

The research explicitly supports comments, partial credit, queues, rubrics, and intervention notes.

## **10. Rendering rules**

The display layer must render in this order:

1. Section
2. Instruction Group
3. Context Block
4. Item stem
5. Interaction prompts
6. Response input area

### **Rules**

- shared context must render once
- grouped instructions must render once
- item stem must not be duplicated inside each interaction
- formatting-sensitive prompts must retain visible structure where possible

### **Formatting support required**

- line breaks
- markdown
- tables
- blanks
- parentheses
- bullets
- bold
- italics

Underline should be supported later as either renderer support or structured emphasis metadata.

## **11. Content lifecycle**

Each content item should move through states:

- draft
- reviewed
- published
- revised
- archived

Each answer/explanation revision should be:

- attributable
- versioned
- approved before publish

## **12. Non-goals for V2 initial implementation**

To keep scope controlled, V2 initial implementation should not try to do all future ideas at once.

Not day 1:

- peer/community answer editing
- complex collaborative annotations
- rich canvas grading UI
- full offline sync
- native mobile app

These can come later.

## **13. Implementation approach**

The architecture should use:

- Firestore for data storage
- Cloud Functions for validation, marking, routing, and version control
- front-end renderer driven by item type + interaction type

This is the right fit because your content model is flexible, event-driven, and teacher-review-heavy