# PLE English 2024 Target JSON Structure

**Date:** April 7, 2026  
**Purpose:** Define the correct JSON structure for importing PLE English 2024

---

## 1. System Schema Requirements

Based on the schema review, the import JSON must follow this structure:

```json
{
  "question_number": 1,
  "text": "Full question text including instructions and context",
  "image_url": null,
  "parts": [
    {
      "order_index": 0,
      "text": "Part prompt (can be empty for single-part questions)",
      "answer": "Correct answer",
      "explanation": "Optional tutor explanation",
      "marks": 1,
      "answer_type": "text"
    }
  ]
}
```

**Key Rules:**

1. `question_number` - Integer, unique per exam
2. `text` - Full question content (instructions + context + prompt)
3. `parts[].text` - Part prompt (rendered by UI)
4. `parts[].answer_type` - Must be "text", "numeric", or "open-ended"
5. `parts[].order_index` - 0 for first part, 1 for second, etc.

---

## 2. Structure by Question Type

### Type A: Simple Fill-in-Blank (Q1-5)

```json
{
  "question_number": 1,
  "text": "In each of the questions 1 to 5, fill in the blank space with a suitable word.\n\nRose crossed the road as __________ as it was clear.",
  "image_url": null,
  "parts": [
    {
      "order_index": 0,
      "text": "",
      "answer": "soon",
      "explanation": "The expression 'as soon as' means immediately after.",
      "marks": 1,
      "answer_type": "text"
    }
  ]
}
```

**Notes:**

- Instruction included in question `text`
- Part `text` is empty to avoid duplication
- Single part per question

---

### Type B: Rewrite Sentence (Q31-50)

```json
{
  "question_number": 31,
  "text": "In each of the questions 31 to 50, rewrite the sentences as instructed in brackets.\n\nTurkeys are bigger than cocks. (Rewrite the sentence using: ... as ... as ...)",
  "image_url": null,
  "parts": [
    {
      "order_index": 0,
      "text": "",
      "answer": "Cocks are not as big as turkeys.",
      "explanation": "When two things are not equal, we use 'not as...as' structure.",
      "marks": 1,
      "answer_type": "text"
    }
  ]
}
```

**Notes:**

- General instruction + specific sentence + rewrite instruction in `text`
- Part `text` empty
- Single part per question

---

### Type C: Passage Comprehension (Q51)

```json
{
  "question_number": 51,
  "text": "Read the passage below and then answer, in full sentences, the questions that follow.\n\nLolo and Jemba were two great friends. They went to Mushanga Primary School. In this school, lunch was only for those whose parents had contributed towards their feeding.\n\nOne Friday afternoon, Jemba got so hungry that his stomach began making continuous long deep sounds...\n\n[Full passage continues...]\n\nThree weeks later, after Lolo and Jemba had got better, they returned to school. The whole school was so pleased to see them. The head teacher, however, warned all pupils against leaving school without permission. She also held a meeting with all parents to discuss the issue of school meals. Today, all pupils have lunch at school. It is not surprising that their academic performance has greatly improved.",
  "image_url": null,
  "parts": [
    {
      "order_index": 0,
      "text": "To which school did the two great friends go?",
      "answer": "The two friends went to Mushanga Primary School.",
      "explanation": "The passage directly states they went to Mushanga Primary School.",
      "marks": 1,
      "answer_type": "text"
    },
    {
      "order_index": 1,
      "text": "Why wasn't there lunch for Lolo and Jemba in this school?",
      "answer": "There was no lunch because parents had to contribute towards their children's feeding.",
      "explanation": "The school only provided lunch for pupils whose parents contributed.",
      "marks": 1,
      "answer_type": "text"
    }
    // ... parts (c) through (j)
  ]
}
```

**Notes:**

- Full passage in question `text`
- Each sub-question (a-j) as separate part
- Each part has its own `text` prompt
- 10 parts total

---

## 3. Sample Question Objects

### Sample 1: Q1 (Simple Fill-in-Blank)

```json
{
  "question_number": 1,
  "text": "In each of the questions 1 to 5, fill in the blank space with a suitable word.\n\nRose crossed the road as __________ as it was clear.",
  "image_url": null,
  "parts": [
    {
      "order_index": 0,
      "text": "",
      "answer": "soon",
      "acceptable_answers": ["immediately", "quickly"],
      "explanation": "The expression 'as soon as' means immediately after. 'Soon' is the most precise fit for this context.",
      "marks": 1,
      "answer_type": "text"
    }
  ]
}
```

---

### Sample 2: Q31 (Rewrite Sentence)

```json
{
  "question_number": 31,
  "text": "In each of the questions 31 to 50, rewrite the sentences as instructed in brackets.\n\nTurkeys are bigger than cocks. (Rewrite the sentence using: ... as ... as ...)",
  "image_url": null,
  "parts": [
    {
      "order_index": 0,
      "text": "",
      "answer": "Cocks are not as big as turkeys.",
      "acceptable_answers": ["A cock is not as big as a turkey."],
      "explanation": "When comparing two unequal things using 'as...as', we use the negative form 'not as...as' with the smaller item as the subject.",
      "marks": 1,
      "answer_type": "text"
    }
  ]
}
```

---

### Sample 3: Q51 (Passage Comprehension - First 3 Parts)

```json
{
  "question_number": 51,
  "text": "Read the passage below and then answer, in full sentences, the questions that follow.\n\nLolo and Jemba were two great friends. They went to Mushanga Primary School. In this school, lunch was only for those whose parents had contributed towards their feeding.\n\nOne Friday afternoon, Jemba got so hungry that his stomach began making continuous long deep sounds. He hadn't carried anything to eat while at school that day. Lolo heard the sounds that came from his friend's stomach and sympathized with him.\n\n\"Let's go to the trading centre and buy something to eat,\" he said with a smile. \"I have got some money.\"\n\n\"Wow!\" Jemba said. \"I'll give you a lift on my bicycle.\"\n\nUnlike Jemba's parents, the parents of Lolo, once in a while, at least gave their son some money. With this money, he could buy pancakes, buns and some juice to have as lunch. He often shared this so-called lunch with his best friend.\n\nWith Lolo sitting on the carrier, Jemba got on his bicycle and rode off. The speed at which he rode was very high. He was very excited. Besides, he wanted to get back to school in time for the afternoon lessons. It was a busy road and, as Jemba sped up, he kept ringing the bicycle bell. Unfortunately, he lost his balance and they both fell off the bicycle. Lolo suffered a leg injury while Jemba had a fractured hand.\n\nThey were lucky that some passers-by rushed them to a nearby clinic. They then rang their head teacher who immediately arrived at the clinic. She thanked the nurses for treating the boys. She then informed the boys' parents about the accident.\n\nThree weeks later, after Lolo and Jemba had got better, they returned to school. The whole school was so pleased to see them. The head teacher, however, warned all pupils against leaving school without permission. She also held a meeting with all parents to discuss the issue of school meals. Today, all pupils have lunch at school. It is not surprising that their academic performance has greatly improved.",
  "image_url": null,
  "parts": [
    {
      "order_index": 0,
      "text": "To which school did the two great friends go?",
      "answer": "The two friends went to Mushanga Primary School.",
      "acceptable_answers": ["They studied at Mushanga Primary School."],
      "explanation": "The answer is directly stated in the first paragraph of the passage.",
      "marks": 1,
      "answer_type": "text"
    },
    {
      "order_index": 1,
      "text": "Why wasn't there lunch for Lolo and Jemba in this school?",
      "answer": "There was no lunch because parents had to contribute towards their children's feeding.",
      "acceptable_answers": [
        "Lunch was not provided by the school; only pupils whose parents contributed could get lunch."
      ],
      "explanation": "The passage explains that lunch was only for those whose parents had contributed towards feeding.",
      "marks": 1,
      "answer_type": "text"
    },
    {
      "order_index": 2,
      "text": "What could Lolo do with the money that his parents sometimes gave him?",
      "answer": "Lolo could buy pancakes and buns and some juice for lunch.",
      "acceptable_answers": [
        "He could buy lunch with it.",
        "He could buy something to eat."
      ],
      "explanation": "The passage specifically mentions pancakes, buns, and juice as what Lolo bought.",
      "marks": 1,
      "answer_type": "text"
    }
    // ... parts (d) through (j) would follow
  ]
}
```

---

## 4. Recommended Rebuild Approach

### Step 1: Transform Existing JSON

Create a transformation script that:

1. Reads existing `ple-english-2024.insert-ready.json`
2. Transforms to system-compatible structure
3. Outputs new `ple-english-2024.system-ready.json`

### Step 2: Generate Section A First

- Transform Q1-50
- Test import with Q1-5
- If successful, import all Section A
- Verify in Firestore

### Step 3: Generate Section B

- Transform Q51-55
- Import Section B
- Verify passage/table/picture content renders correctly

### Step 4: Full Verification

- Test exam in practice mode
- Verify UI rendering
- Check answer checking works

---

## 5. Next Step Recommendation

**Generate Section A first** for testing, then proceed to full exam after approval.

**Reason:** Section A has simpler structure (single-part questions) and will validate the transformation approach before handling complex Section B questions.

---

**Files to Create:**

1. `functions/scripts/transformEnglish2024ForImport.js` - Transformation script
2. `docs/imports/ple-english-2024.system-ready.json` - Transformed JSON

**Status:** Ready for transformation and import.
