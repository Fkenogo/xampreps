# XamPreps V2 Rendering & Interaction Rules

## **1. Purpose of this document**

This defines exactly:

- how exam content is displayed
- how different question types behave
- how inputs are rendered
- how marking connects to UI
- what rules prevent duplication and broken layouts

If this is followed strictly:

👉 you will stop “fixing exams one by one”

---

# **2. Core rendering philosophy**

## **Rule 1 — Render like the paper, not like the database**

The UI must follow this hierarchy:

```
SECTION
  → Instruction Group
      → Context Block (optional)
          → Item
              → Interaction(s)
```

NOT:

- question → parts → render everything blindly

---

## **Rule 2 — No duplication between layers**

This is where things broke before.

### **NEVER allow:**

- item.stemText repeated inside interaction.prompt
- context text repeated inside items
- instructions repeated per item

### **Instead:**

- each layer has a **single responsibility**

---

## **Rule 3 — Display order is strict**

Render in this exact order:

### **1. Section**

- Title: “Section A”
- Marks (optional)

### **2. Instruction Group**

- Full instruction text
- Display once
- Sticky or visually anchored

### **3. Context Block (if exists)**

- Passage / poem / table / images
- Render ONCE
- Shared by all items below

### **4. Item (question)**

- Main question text
- May include blanks or structure

### **5. Interaction(s)**

- Input fields
- Sub-parts
- Options

---

# **3. Rendering rules per component**

## **3.1 Section**

### **Display:**

- Title (large)
- Optional: marks summary

### **Behavior:**

- collapsible (optional future)
- navigation anchor

---

## **3.2 Instruction Group**

### **Display:**

- full instruction text
- clearly separated (boxed or highlighted)

### **Example:**

> In questions 1 to 5, fill in the blank space…
> 

### **Rules:**

- appears once per group
- applies to multiple items
- NOT stored inside items

---

## **3.3 Context Block**

### **Types supported:**

| **Type** | **Rendering** |
| --- | --- |
| passage | paragraph block |
| poem | line-preserved text |
| table | structured table |
| image | single image |
| imageSet | multiple images (A–F) |
| diagram | annotated image |
| map | image + optional legend |
| compositionPrompt | formatted instruction block |

---

### **Rules:**

- render ONCE per group
- must support:
    - line breaks
    - paragraphs
    - markdown
    - tables
- images must be:
    - zoomable
    - clear on mobile

---

### **Special handling:**

### **Passage**

- readable width
- paragraph spacing
- optional highlight later

### **Poem**

- preserve line breaks EXACTLY

### **Table**

- use real table rendering (not plain text)

### **Image set**

- label images (A, B, C…)
- grid layout

---

## **3.4 Item (question)**

### **Display:**

- main question text only

### **Examples:**

### **Fill-in**

Rose crossed the road as ______ as it was clear.

### **Rewrite**

Turkeys are bigger than cocks. (Rewrite using…)

---

### **Rules:**

- item.stemText is the ONLY visible question text
- do NOT duplicate in interactions
- formatting must be preserved:
    - brackets ( )
    - blanks ______
    - punctuation
    - spacing

---

## **3.5 Interaction layer**

This is the most important part.

Each interaction = one answer input.

---

# **4. Interaction types and rendering**

## **4.1 textShort**

### **Use for:**

- fill in the blank
- one-word answers

### **UI:**

- small input field

### **Rules:**

- inline or below question
- auto-trim spaces
- case normalization optional

---

## **4.2 textLong / textarea**

### **Use for:**

- explanations
- short paragraphs

### **UI:**

- expandable textarea

---

## **4.3 selectSingle (MCQ)**

### **UI:**

- radio buttons

### **Rules:**

- one selection only
- options labeled A, B, C, D

---

## **4.4 selectMultiple**

### **UI:**

- checkboxes

---

## **4.5 matchPairs**

### **UI:**

- drag-and-drop OR dropdown pairing

---

## **4.6 orderSequence**

### **UI:**

- drag to reorder

---

## **4.7 tableInputs**

### **Use for:**

- table completion questions

### **UI:**

- editable table cells

---

## **4.8 imageUpload**

### **Use for:**

- drawing answers
- diagrams

### **UI:**

- upload button
- preview

---

## **4.9 canvasDraw**

### **Use for:**

- sketching answers directly

---

## **4.10 structuredComposition**

### **Use for:**

- letters
- essays
- reports

### **UI:**

- guided layout:
    - address block
    - body
    - closing

---

# **5. Multi-part questions**

## **Rule:**

Multi-part = one item, many interactions.

### **Example (Q51):**

- Item = passage comprehension
- Interactions:
    - (a)
    - (b)
    - (c)
    - …

### **Rendering:**

```
Item stem
Context block (passage)

(a) [input]
(b) [input]
(c) [input]
```

NOT:

- separate items per part

---

# **6. Marking visibility rules**

## **Practice mode**

- show answer immediately (optional toggle)
- show explanation
- show acceptable answers

## **Quiz mode**

- show after submission

## **Simulation mode**

- hide until end

---

# **7. Feedback rendering**

## **Auto feedback**

- correct / incorrect
- correct answer
- explanation

## **Teacher feedback**

- comments
- score adjustments
- rubric breakdown

---

# **8. Preventing past errors (critical rules)**

These rules directly fix your previous issues.

## **Rule A — No duplicated text**

- interaction.prompt must NOT repeat item.stemText

## **Rule B — No missing instructions**

- instructions must live in instructionGroup
- not inside items

## **Rule C — Context must not be flattened**

- passages/tables/images must NOT be merged into question text

## **Rule D — Structure must not be lost**

- do not flatten multi-part into separate questions

## **Rule E — Formatting must be preserved**

- blanks
- brackets
- punctuation
- spacing

---

# **9. Layout modes (important)**

Each item can define layout behavior:

### **layoutMode options:**

- single
- multiPart
- contextDriven
- tableDriven
- composition

This helps UI decide rendering without hacks.

---

# **10. Mobile-first rules**

Must support:

- vertical stacking
- readable text width
- scrollable context
- sticky instructions (optional)
- large tap targets

---

# **11. Performance rules**

- load by section or group
- lazy load context-heavy blocks
- cache context blocks
- avoid re-rendering large passages

---

# **12. What this fixes immediately**

This rendering system solves:

- duplication issues
- missing instructions
- broken Section A logic
- passage/table rendering problems
- incorrect grouping of questions
- UI confusion between question vs part

---