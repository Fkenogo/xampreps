# XamPreps V2 Test Fixtures

This document describes the internal test fixtures created to validate the V2 exam engine. These are NOT real exams - they are minimal content structures designed to test specific functionality.

## Fixture 1: Simple Fill-in Item

**Purpose:** Test exact match marking with single blank

**Structure:**

```json
{
  "exam": {
    "examId": "fixture-simple-fill",
    "title": "V2 Test: Simple Fill-in",
    "subject": "English",
    "level": "PLE",
    "year": 2024,
    "status": "draft"
  },
  "sections": [
    {
      "title": "Section A",
      "orderIndex": 0
    }
  ],
  "instructionGroups": [
    {
      "instructionsMarkdown": "Fill in the blank with the correct word.",
      "displayMode": "boxed",
      "orderIndex": 0
    }
  ],
  "items": [
    {
      "itemType": "singleBlank",
      "stemText": "The cat sat on the ______.",
      "marksTotal": 1,
      "layoutMode": "single"
    }
  ],
  "interactions": [
    {
      "responseMode": "textShort",
      "marks": 1,
      "required": true
    }
  ],
  "markingRules": [
    {
      "markingMode": "exactMatch",
      "exactAnswer": "mat"
    }
  ]
}
```

**Tests:**

- ✅ Rendering: Single blank displays correctly
- ✅ Submission: Text input captures answer
- ✅ Auto-marking: Exact match works
- ✅ Feedback: Shows correct/incorrect

## Fixture 2: Rewrite Item

**Purpose:** Test normalized text matching with alternatives

**Structure:**

```json
{
  "exam": {
    "examId": "fixture-rewrite",
    "title": "V2 Test: Rewrite",
    "subject": "English",
    "level": "PLE",
    "year": 2024,
    "status": "draft"
  },
  "items": [
    {
      "itemType": "rewrite",
      "stemText": "Rewrite the sentence using 'bigger than'.",
      "stemMarkdown": "Rewrite the sentence using *bigger than*.\n\nOriginal: The elephant is large.",
      "marksTotal": 2,
      "layoutMode": "single"
    }
  ],
  "interactions": [
    {
      "responseMode": "textarea",
      "marks": 2,
      "required": true
    }
  ],
  "markingRules": [
    {
      "markingMode": "alternativeAnswers",
      "alternativeAnswers": [
        "The elephant is bigger than the mouse.",
        "The elephant is bigger than a mouse.",
        "elephant is bigger than mouse"
      ]
    }
  ]
}
```

**Tests:**

- ✅ Rendering: Markdown formatting preserved
- ✅ Submission: Textarea captures longer answer
- ✅ Auto-marking: Alternative answers accepted
- ✅ Normalization: Minor variations handled

## Fixture 3: Passage Comprehension Block

**Purpose:** Test shared context with multiple interactions

**Structure:**

```json
{
  "exam": {
    "examId": "fixture-passage",
    "title": "V2 Test: Passage Comprehension",
    "subject": "English",
    "level": "PLE",
    "year": 2024,
    "status": "draft"
  },
  "instructionGroups": [
    {
      "instructionsMarkdown": "Read the passage below and answer questions 1-3.",
      "displayMode": "sticky"
    }
  ],
  "contextBlocks": [
    {
      "type": "passage",
      "title": "The Market Day",
      "contentMarkdown": "Every Saturday, Sarah went to the market with her mother. They bought fresh vegetables, fruits, and sometimes meat. Sarah loved the colorful displays and the busy atmosphere. Her favorite part was buying mangoes from Mama Grace, who always gave her an extra one for free."
    }
  ],
  "items": [
    {
      "itemType": "passageComprehension",
      "stemText": "Answer the following questions about the passage.",
      "contextBlockIds": ["context-1"],
      "marksTotal": 6,
      "layoutMode": "multiPart"
    }
  ],
  "interactions": [
    {
      "label": "(a)",
      "promptText": "Where did Sarah go every Saturday?",
      "responseMode": "textShort",
      "marks": 2
    },
    {
      "label": "(b)",
      "promptText": "What was Sarah's favorite part?",
      "responseMode": "textShort",
      "marks": 2
    },
    {
      "label": "(c)",
      "promptText": "Why did Mama Grace give Sarah an extra mango?",
      "responseMode": "textShort",
      "marks": 2
    }
  ],
  "markingRules": [
    {
      "markingMode": "keywordBased",
      "keywordRules": [
        {
          "keywords": ["market"],
          "matchMode": "any"
        }
      ]
    },
    {
      "markingMode": "keywordBased",
      "keywordRules": [
        {
          "keywords": ["mangoes", "Mama Grace", "extra"],
          "matchMode": "any"
        }
      ]
    },
    {
      "markingMode": "manualReviewRequired"
    }
  ]
}
```

**Tests:**

- ✅ Rendering: Context block renders ONCE before items
- ✅ Multi-part: Multiple interactions under one item
- ✅ Labels: (a), (b), (c) display correctly
- ✅ Mixed marking: Some auto, some manual review
- ✅ Review tasks: Created for manual items

## Fixture 4: Table-Based Block

**Purpose:** Test table context with cell completion

**Structure:**

```json
{
  "exam": {
    "examId": "fixture-table",
    "title": "V2 Test: Table Completion",
    "subject": "Science",
    "level": "PLE",
    "year": 2024,
    "status": "draft"
  },
  "contextBlocks": [
    {
      "type": "table",
      "title": "Animal Classification",
      "tableData": {
        "headers": ["Animal", "Class", "Feeding"],
        "rows": [
          ["Cow", "Mammal", "Herbivore"],
          ["Lion", "______", "Carnivore"],
          ["Tilapia", "Fish", "______"]
        ]
      }
    }
  ],
  "items": [
    {
      "itemType": "tableCompletion",
      "stemText": "Complete the table by filling in the missing information.",
      "contextBlockIds": ["context-1"],
      "marksTotal": 2,
      "layoutMode": "tableDriven"
    }
  ],
  "interactions": [
    {
      "label": "(i)",
      "promptText": "Class of Lion",
      "responseMode": "textShort",
      "marks": 1
    },
    {
      "label": "(ii)",
      "promptText": "Feeding of Tilapia",
      "responseMode": "textShort",
      "marks": 1
    }
  ]
}
```

**Tests:**

- ✅ Rendering: Table renders correctly
- ✅ Context: Table shared across interactions
- ✅ Cell completion: Individual interactions for missing cells

## Fixture 5: Composition/Manual Review Block

**Purpose:** Test manual marking workflow with rubrics

**Structure:**

```json
{
  "exam": {
    "examId": "fixture-composition",
    "title": "V2 Test: Composition",
    "subject": "English",
    "level": "PLE",
    "year": 2024,
    "status": "draft"
  },
  "instructionGroups": [
    {
      "instructionsMarkdown": "Write a composition of about 150 words on ONE of the following topics.",
      "displayMode": "highlighted"
    }
  ],
  "contextBlocks": [
    {
      "type": "compositionPrompt",
      "title": "Composition Options",
      "contentMarkdown": "**Option 1:** Write a story that ends with: '...and that is how I learned to be honest.'\n\n**Option 2:** Write a letter to your headteacher explaining why the school should have longer holidays."
    }
  ],
  "items": [
    {
      "itemType": "composition",
      "stemText": "Choose ONE topic and write your composition.",
      "marksTotal": 20,
      "layoutMode": "composition"
    }
  ],
  "interactions": [
    {
      "responseMode": "structuredComposition",
      "marks": 20,
      "required": true
    }
  ],
  "rubrics": [
    {
      "title": "Composition Rubric",
      "criteria": [
        {
          "name": "Content",
          "description": "Relevance and development of ideas",
          "maxPoints": 8
        },
        {
          "name": "Organization",
          "description": "Structure and coherence",
          "maxPoints": 6
        },
        {
          "name": "Language",
          "description": "Grammar, vocabulary, spelling",
          "maxPoints": 6
        }
      ],
      "maxScore": 20
    }
  ]
}
```

**Tests:**

- ✅ Rendering: Composition prompt displays correctly
- ✅ Input: Structured composition with sections
- ✅ Manual review: Always requires teacher review
- ✅ Rubric: Teacher can score by criteria
- ✅ Review queue: Appears in teacher queue
- ✅ Score aggregation: Combines rubric scores

## End-to-End Flows Tested

### Flow 1: Student takes exam in Practice Mode

1. Student loads exam
2. Renders sections, instructions, context, items, interactions
3. Student submits answers
4. Auto-marking runs immediately
5. Feedback displayed
6. Score recorded

### Flow 2: Student takes exam in Simulation Mode

1. Student loads exam with timer
2. Submits all answers at end
3. Auto-marking runs
4. Manual review items flagged
5. Score pending until review complete

### Flow 3: Teacher Review Workflow

1. Teacher views review queue
2. Selects submission to review
3. Views student answer + context
4. Applies score/rubric
5. Adds comments
6. Submits review
7. Final score calculated

### Flow 4: Model Answer Versioning

1. Content editor creates new answer version
2. Version marked as pending_approval
3. Admin reviews and approves
4. New version becomes active
5. Students see updated answer

## Remaining Test Needs

Before first real exam import:

1. **Performance testing** - Large exams with 50+ items
2. **Mobile rendering** - Test on small screens
3. **Image rendering** - Context blocks with images
4. **Concurrent submissions** - Multiple students simultaneously
5. **Score aggregation accuracy** - Complex marking scenarios

## Conclusion

These fixtures validate the core V2 architecture. They are NOT for production use - they are development tools to ensure the system works correctly before real exam content is introduced.
