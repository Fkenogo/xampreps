# XamPreps V2 Migration Strategy

## **1. Migration decision**

XamPreps V2 will use a **clean reset migration strategy**.

This means:

- stop using the current exam content schema
- stop patching existing exam imports
- introduce the new V2 schema cleanly
- reinsert exams from scratch into the new structure
- treat the old system as legacy reference only

This is the safer route because the current model is structurally limited for East African papers: grouped instructions, shared contexts, mixed interaction types, and hybrid marking are core needs, not edge cases.

---

## **2. Why clean reset is the right choice**

A gradual migration would only make sense if:

- you had many live students already using the system
- you had a large catalog of already-clean exams
- the current model was structurally close to the target model

That is not the case here.

Your current exam engine still has major structural limits:

- no first-class instruction groups
- no first-class shared context blocks
- no clean separation between item display and interaction input
- no native teacher review workflow
- no answer/explanation versioning
- old imports already showed duplication and rendering problems

So attempting to “migrate in place” would just prolong the patching cycle.

---

## **3. Migration goals**

The migration must achieve five things:

### **Goal 1 — replace the old exam content model**

Replace:

- questions
- question_parts

with the new V2 model:

- sections
- instructionGroups
- contextBlocks
- items
- interactions
- markingRules
- rubrics
- modelAnswerVersions

### **Goal 2 — preserve architectural clarity**

Do not keep dual logic unless absolutely necessary.

### **Goal 3 — avoid exam-by-exam hacks**

New exams must be inserted through a single V2 import pathway.

### **Goal 4 — support teacher review from day 1**

The new content system must already support review tasks, rubric scoring, and evolving answers.

### **Goal 5 — make future inserts predictable**

Once V2 is live, adding a new paper should be content work, not system debugging.

---

## **4. Migration scope**

## **What will be reset**

The old exam engine content structures:

- exams content shape if tied to old assumptions
- questions
- question_parts
- old import scripts built only for the legacy format
- old renderer logic that depends on question/part duplication

## **What should remain**

Anything not directly tied to the legacy exam content model, such as:

- auth/users
- subscriptions/payments
- dashboards not tied to old exam schema
- analytics unrelated to old content storage
- non-exam product modules

## **What may be archived for reference**

Instead of deleting everything blindly, archive old exam-content logic and data references for traceability:

- old import JSON files
- old exam insertion scripts
- old renderer components
- old schema notes
- optionally old collections exported to a backup

---

## **5. Migration phases**

## **Phase 0 — freeze**

Before implementation:

- stop all exam imports
- stop all exam patches
- stop all exam UI tweaks
- treat exams as frozen until V2 is ready

This is already your decision.

---

## **Phase 1 — archive legacy exam system**

Archive the legacy exam system for reference.

### **Archive items**

- old import scripts
- old verification scripts tied to legacy shape
- old exam JSONs
- old content audit files
- legacy renderer assumptions

### **Data backup**

Before deletion or deprecation:

- export old exam-related Firestore data
- save as backup for reference only

This is not for reuse. It is only for safety and comparison.

---

## **Phase 2 — introduce V2 schema**

Create the new Firestore collections:

- exams
- sections
- instructionGroups
- contextBlocks
- items
- interactions
- markingRules
- rubrics
- modelAnswerVersions
- examAttempts
- submissions
- reviewTasks
- feedbackTemplates

At this phase:

- no exam content should be inserted yet
- only schema, security, and function logic should be set up

---

## **Phase 3 — implement V2 rendering engine**

Build the UI against the new structure.

### **The renderer must support:**

- section rendering
- grouped instruction rendering
- context block rendering
- item rendering
- interaction rendering
- mixed display/marking modes

This phase should include developer test fixtures, not live paper imports yet.

---

## **Phase 4 — implement V2 marking + review engine**

Build Cloud Functions and review flows for:

- auto scoring
- hybrid routing
- manual review queue
- rubric scoring
- model answer version updates

This should be done before real exam imports, so papers are inserted into a complete product, not a half-built shell.

---

## **Phase 5 — seed one reference exam**

Only after the system is ready:

- choose one exam as the first reference insertion
- use the new V2 schema
- validate end-to-end

Because PLE English 2024 exposed the weaknesses of the old system, it is a strong candidate as the first reference paper after V2 is ready.

But do not insert any exam until Phases 2–4 are complete.

---

## **Phase 6 — validate and refine**

For the first inserted exam:

- validate rendering
- validate marking
- validate teacher review flow
- validate explanation display
- validate answer versioning hooks

Fix product-level issues here, not exam-specific workarounds.

---

## **Phase 7 — reimport exam catalog**

Once the reference exam works:

- reinsert the other papers using the same V2 pipeline
- no custom one-off hacks
- one schema, one renderer, one import flow

---

## **6. Legacy handling strategy**

## **Recommended approach**

Do **not** run old and new exam systems in active parallel mode for long.

Instead:

- mark the old content system as legacy
- keep code/history in archive
- switch active exam delivery to V2 only

### **Why**

Parallel systems create:

- duplicate maintenance
- confusing bug sources
- mixed content logic
- delayed cleanup

Since you chose a clean reset, keep it clean.

---

## **7. Data migration policy**

This is important.

## **We are not migrating legacy exam content into V2 automatically.**

We are **rebuilding and reinserting** papers into V2.

That means:

- no auto-transforming broken JSON into new schema blindly
- no mass conversion of old Firestore docs into V2 docs
- each paper should be prepared intentionally in the V2 structure

This is slower up front, but much safer.

---

## **8. Cloud Functions migration responsibilities**

Cloud Functions should handle:

- schema validation on import
- exam publication workflow
- score calculation
- review-task creation
- teacher approval of content changes
- model-answer version creation

Cloud Functions should **not** try to “guess” legacy structures during migration.

This is a reset, not a compatibility maze.

---

## **9. Security and permissions during migration**

While V2 is being built:

### **Lock down content writes**

Only admin/editor workflows should write:

- exam structure
- items
- marking rules
- model answer versions

### **Teacher permissions**

Teachers can:

- review submissions
- apply scores
- comment
- propose content changes

Teachers should not directly overwrite published answer content without approval.

### **Student permissions**

Students can:

- read published exam content
- submit responses
- view feedback based on mode and permissions

---

## **10. Risks and controls**

## **Risk 1 — rebuilding too early from one exam**

Control:

- finish architecture and renderer first
- do not return to paper insertion until product is ready

## **Risk 2 — drifting back into legacy assumptions**

Control:

- implementation prompt must explicitly forbid using old question/question_parts mental model as the V2 target

## **Risk 3 — mixing legacy and V2 code**

Control:

- archive legacy code clearly
- create separate V2 modules/components/functions

## **Risk 4 — reintroducing exam-specific hacks**

Control:

- every new paper must fit V2 structure
- if a paper does not fit, improve V2 generically, not with one-off hacks

---

## **11. Success criteria for migration**

Migration is complete when:

### **Architecture**

- V2 Firestore schema exists
- V2 Cloud Functions exist
- V2 renderer exists
- V2 marking/review flows exist

### **Product behavior**

- one full reference exam runs cleanly in all required modes
- grouped instructions render correctly
- context blocks render correctly
- interactions do not duplicate item stems
- teacher review queue works
- model answer versioning works

### **Team workflow**

- exam insertion becomes a content-prep task
- not a product-debugging task

That is the true finish line.

---

## **12. Implementation order summary**

This is the exact order I recommend:

1. archive legacy exam system
2. create V2 schema
3. create V2 renderer
4. create V2 marking engine
5. create V2 teacher review workflow
6. test with internal fixtures
7. insert one reference exam
8. validate full lifecycle
9. reinsert remaining exams

---

## **13. Final migration stance**

This is not a patch cycle.

This is a product reset.

From this point:

- no exam uploads
- no exam JSON generation
- no insert logic
    
    until the V2 architecture and implementation are approved.
    

---