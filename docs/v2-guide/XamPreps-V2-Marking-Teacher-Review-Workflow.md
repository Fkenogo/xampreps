# XamPreps V2 Marking + Teacher Review Workflow

## **1. Purpose**

Define how:

- answers are evaluated
- scores are assigned
- teachers review and adjust
- content improves over time

This must support:

- auto marking (fast)
- teacher marking (accurate)
- hybrid marking (real-world use)

---

# **2. Core marking model**

Every response goes through **3 layers**:

```
Student Answer
    ↓
Auto Evaluation
    ↓
Teacher Review (optional but important)
    ↓
Final Score + Feedback
```

---

# **3. Answer evaluation types**

Each interaction defines how it is marked.

---

## **3.1 Exact match**

### **Use:**

- MCQs
- single-word answers (strict)

### **Logic:**

```
studentAnswer === correctAnswer
```

---

## **3.2 Normalized match**

### **Use:**

- text answers with variations

### **Logic:**

- lowercase
- trim spaces
- remove punctuation (optional)

```
normalize(studentAnswer) === normalize(correctAnswer)
```

---

## **3.3 Acceptable answers list**

### **Use:**

- English answers with variations

### **Logic:**

```
acceptableAnswers.includes(normalizedAnswer)
```

---

## **3.4 Keyword-based (semi-flexible)**

### **Use:**

- comprehension answers

### **Logic:**

- check presence of key ideas

Example:

- expected: “They went to Mushanga Primary School”
- keywords:
    - Mushanga
    - Primary School

---

## **3.5 Manual review required**

### **Use:**

- compositions
- long answers
- drawings

### **Behavior:**

- system does NOT auto-score
- flagged for teacher

---

## **3.6 Partial scoring**

### **Use:**

- multi-step answers
- multi-keyword answers

Example:

- 2 marks → 1 mark per correct idea

---

# **4. Scoring structure**

Each interaction stores:

```
{
  maxScore: 2,
  autoScore: 1,
  teacherScore: null,
  finalScore: 1,
  markingMode: "auto" | "hybrid" | "manual"
}
```

---

## **Final score rule:**

```
finalScore = teacherScore ?? autoScore
```

---

# **5. Feedback layers**

Each answer produces feedback:

---

## **5.1 Auto feedback**

- correct / incorrect
- correct answer
- explanation

---

## **5.2 AI feedback (optional later)**

- “You missed this idea…”
- “Your sentence is incomplete…”

---

## **5.3 Teacher feedback**

- comments
- corrections
- guidance

---

# **6. Teacher workflow**

This is critical to your vision.

---

## **Step 1 — Review queue**

Teachers see:

```
Submissions needing review:
- compositions
- low-confidence answers
- flagged responses
```

---

## **Step 2 — Review interface**

Teacher sees:

- question
- context (passage, etc.)
- student answer
- expected answer
- explanation

---

## **Step 3 — Actions**

Teacher can:

- adjust score
- add comment
- mark as correct/incorrect
- highlight missing points

---

## **Step 4 — Submit review**

System updates:

- teacherScore
- teacherFeedback
- reviewedBy
- reviewedAt

---

# **7. Content improvement loop (very important)**

This is where your system becomes **alive**.

---

## **Problem today:**

Answers are static → mistakes stay forever

---

## **New model:**

Every answer collects feedback:

```
{
  flaggedAnswers: [],
  teacherCorrections: [],
  studentConfusionRate: 0.42
}
```

---

## **Triggers for improvement:**

### **1. High error rate**

→ question may be unclear

### **2. Many acceptable variations**

→ expand acceptable_answers

### **3. Teacher corrections**

→ update official answer

---

## **Admin workflow:**

- review flagged questions
- approve updated answers
- version update

---

# **8. Confidence scoring**

Each auto-evaluated answer gets:

```
confidenceScore: 0.0 → 1.0
```

---

## **Use:**

- low confidence → send to teacher
- high confidence → auto accept

---

# **9. Submission model**

Each attempt stored as:

```
exam_attempts/{attemptId}
  userId
  examId
  mode
  startedAt
  submittedAt
  totalScore
  maxScore
  status
```

---

## **Answers:**

```
responses/{responseId}
  attemptId
  itemId
  interactionId
  studentAnswer
  autoScore
  teacherScore
  finalScore
  feedback
```

---

# **10. Modes behavior**

## **Practice mode**

- instant marking
- show explanation
- show correct answer

---

## **Quiz mode**

- mark after submission
- limited feedback

---

## **Simulation mode**

- no feedback until end
- full exam experience

---

# **11. Composition**

Special handling:

---

## **Input:**

- long text

---

## **Auto:**

- optional grammar hints (later)

---

## **Teacher:**

- full marking
- rubric-based scoring

---

## **Rubric example:**

```
{
  content: 10,
  grammar: 5,
  structure: 5
}
```

---

# **12. Anti-cheating**

- disable copy/paste (optional)
- timer enforcement
- randomization (MCQs)

---

# **13. What this fixes**

This solves:

- rigid answer problems
- wrong answers staying forever
- inability to handle essays
- lack of teacher involvement
- lack of learning loop

---