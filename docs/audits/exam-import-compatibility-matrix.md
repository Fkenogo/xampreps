# Exam Import Compatibility Matrix

**Date:** 2026-04-16  
**Purpose:** Assess compatibility of 4 real East African exams with XamPreps V2 system

---

## Overview

This matrix evaluates how well each of the 4 uploaded real exams fits the current V2 exam engine, identifying which parts fit directly, which need careful mapping, and which may require manual review workflows.

---

## 1. KCPE Mathematics 2023 (Kenya)

**Exam Authority:** KNEC (Kenya National Examinations Council)  
**Level:** KCPE (Primary)  
**Year:** 2023  
**Total Questions:** 50  
**Format:** Pure MCQ (4 options each)  
**Duration:** Not specified (typically 2 hours)

### Question Structure Analysis

| Question Range | Type | Format | V2 Mapping | Fit |
|----------------|------|--------|------------|-----|
| Q1-50 | MCQ | Single correct answer (A, B, C, D) | `itemType: mcqSingle`, `responseMode: selectSingle` | ✅ Direct |

### Sample Questions

| Q# | Content | Options | Answer | Notes |
|----|---------|---------|--------|-------|
| 1 | Place value / number writing | A. 3048257, B. 3408257, C. 3480257, D. 3084257 | A | Straightforward MCQ |
| 6 | Geometry (trapezium area) with diagram | A. 16cm, B. 18cm, C. 24cm, D. 39cm | C | Requires image reference |
| 31 | Geometry (semicircle with triangle) with diagram | A. 775.25, B. 481.25, C. 294.00, D. 187.25 | D | Requires image reference |
| 40 | Parallel lines with transversal diagram | A-D angle relationships | B | Requires image reference |

### Compatibility Assessment

| Aspect | Status | Details |
|--------|--------|---------|
| **Question Type** | ✅ Fully Compatible | All 50 questions are `mcqSingle` |
| **Image Support** | ✅ Compatible | Diagrams can be stored as `mediaRefs` |
| **Answer Key** | ✅ Compatible | Single correct option per question |
| **Marking** | ✅ Fully Auto | `markingMode: mcqOptionMatch` |
| **Structure** | ✅ Simple | No sections, no shared context |
| **Risk Level** | 🟢 Minimal | Straightforward import |

### Import Strategy

```json
{
  "exam": {
    "title": "KCPE Mathematics 2023",
    "subject": "Mathematics",
    "level": "KCPE",
    "year": 2023,
    "country": "KENYA",
    "examAuthority": "KNEC",
    "type": "Past Paper",
    "durationMinutes": 120,
    "totalMarks": 50
  },
  "structure": {
    "sections": 1,
    "instructionGroups": 1,
    "items": 50,
    "interactions": 50
  }
}
```

### Import Risk: 🟢 **LOW**
- All questions are uniform MCQ format
- No complex mapping required
- High confidence in auto-scoring

---

## 2. PSLE Mathematics 2024 (Tanzania)

**Exam Authority:** NECTA (National Examinations Council of Tanzania)  
**Level:** PSLE (Primary)  
**Year:** 2024  
**Total Questions:** 8 main questions with sub-parts  
**Format:** Structured response (worked solutions)  
**Duration:** 2 hours

### Question Structure Analysis

| Section | Question | Sub-parts | Type | V2 Mapping | Fit |
|---------|----------|-----------|------|------------|-----|
| A | Q1 | (a)-(j) | Mixed computation | `itemType: multiPart`, multiple `textShort` interactions | ✅ Direct |
| A | Q2 | (a)-(f) | Word problems, fractions | `itemType: multiPart`, `textShort`/`textLong` | ✅ Direct |
| A | Q3 | (a)-(c) | Sequences | `itemType: multiPart`, `textShort` | ✅ Direct |
| A | Q4 | (a)-(c) | Time, profit calculation | `itemType: multiPart`, mixed | ✅ Direct |
| B | Q5 | (a)-(c) | Unit conversion, speed, volume | `itemType: multiPart`, `textShort` | ✅ Direct |
| B | Q6 | (a)-(c) | Algebra, equations | `itemType: multiPart`, `textShort` | ✅ Direct |
| C | Q7 | (a)-(b) | Bar chart interpretation | `itemType: diagramInterpretation`, context block for chart | ✅ Direct |
| C | Q8 | (a)-(c) | Geometry (triangle, square, circle, trapezium) | `itemType: multiPart`, `textShort` | ✅ Direct |

### Sample Questions

| Q# | Part | Content | Expected Answer | Marks | Notes |
|----|------|---------|-----------------|-------|-------|
| 1a | - | 66 + 21 = | 87 | - | Simple computation |
| 1e | - | 4/7 + 2/7 = | 6/7 | - | Fraction addition |
| 2c | - | Total from selling goats (600,000) and rabbits (300,000) | 900,000 shillings | - | Word problem |
| 4c | - | Profit difference calculation | 1,072,000 shillings | - | Multi-step problem |
| 7a | - | Bar chart: total money from soft drink sales | Calculate from chart | - | Requires chart image |
| 8b | - | Area difference: square (10cm) vs circle (r=14cm) | 516 cm² | - | Multi-shape problem |

### Compatibility Assessment

| Aspect | Status | Details |
|--------|--------|---------|
| **Question Type** | ✅ Compatible | Numeric/short answer, multi-part |
| **Image Support** | ✅ Compatible | Bar chart in Q7 |
| **Answer Key** | ✅ Compatible | Numeric answers with tolerance |
| **Marking** | ⚠️ Needs Config | Numeric normalization, partial credit possible |
| **Structure** | ✅ Compatible | Sections A, B, C with sub-parts |
| **Risk Level** | 🟡 Low-Medium | Numeric answer handling needs care |

### Import Strategy

```json
{
  "exam": {
    "title": "PSLE Mathematics 2024",
    "subject": "Mathematics",
    "level": "PSLE",
    "year": 2024,
    "country": "TANZANIA",
    "examAuthority": "NECTA",
    "type": "Past Paper",
    "durationMinutes": 120,
    "totalMarks": 50
  },
  "structure": {
    "sections": 3,
    "instructionGroups": 3,
    "items": 8,
    "interactions": "~35"
  },
  "markingConfig": {
    "numericNormalization": true,
    "allowUnitOmission": true,
    "partialCredit": true
  }
}
```

### Import Risk: 🟡 **LOW-MEDIUM**
- Numeric answers need normalization configuration
- Some questions have multiple valid answer formats
- Diagram interpretation (Q7) needs image handling

---

## 3. PLE English 2024 (Uganda)

**Exam Authority:** UNEB (Uganda National Examinations Board)  
**Level:** PLE (Primary)  
**Year:** 2024  
**Total Questions:** 55 (Section A: 50, Section B: 5)  
**Format:** Mixed (fill-in-blank, rewrite, comprehension, composition)  
**Duration:** 2 hours 15 minutes

### Question Structure Analysis

| Section | Question Range | Type | Format | V2 Mapping | Fit |
|---------|----------------|------|--------|------------|-----|
| A | 1-5 | Fill-in-blank | Single word | `itemType: singleBlank`, `responseMode: textShort` | ✅ Direct |
| A | 6-15 | Word form | Correct form of given word | `itemType: singleBlank`, `responseMode: textShort` | ✅ Direct |
| A | 16-17 | Abbreviation | Write short forms in full | `itemType: shortText`, `responseMode: textShort` | ✅ Direct |
| A | 18-19 | Alphabetical order | Arrange words | `itemType: ordering`, `responseMode: orderSequence` | ⚠️ Partial |
| A | 20-21 | Opposites | Rewrite with opposite word | `itemType: rewrite`, `responseMode: textShort` | ✅ Direct |
| A | 22-23 | Sentence rearrangement | Form correct sentences | `itemType: ordering`, `responseMode: orderSequence` | ⚠️ Partial |
| A | 24-25 | Plurals | Give plural form | `itemType: shortText`, `responseMode: textShort` | ✅ Direct |
| A | 26-28 | One word for phrase | Rewrite giving one word | `itemType: shortText`, `responseMode: textShort` | ✅ Direct |
| A | 29-30 | Word usage | Use words in sentences | `itemType: shortText`, `responseMode: textLong` | ⚠️ Manual Review |
| A | 31-50 | Sentence transformation | Rewrite as instructed | `itemType: rewrite`, `responseMode: textShort`/`textLong` | ✅ Direct |
| B | 51 | Comprehension | Read passage, answer questions | `itemType: passageComprehension`, context block + items | ✅ Direct |
| B | 52 | Poem interpretation | Read poem, answer questions | `itemType: poemComprehension`, context block + items | ✅ Direct |
| B | 53 | Table interpretation | Study record, answer questions | `itemType: tableCompletion`, context block + items | ✅ Direct |
| B | 54 | Picture story | Study pictures, write sentences | `itemType: pictureStory`, context block + items | ✅ Direct |
| B | 55 | Composition | Write a letter | `itemType: composition`, `responseMode: structuredComposition` | ⚠️ Manual Review |

### Compatibility Assessment

| Aspect | Status | Details |
|--------|--------|---------|
| **Question Type** | ✅ Mostly Compatible | Mix of formats, some need manual review |
| **Image Support** | ✅ Compatible | Picture story (Q54) needs imageSet |
| **Answer Key** | ⚠️ Mixed | Some objective, many subjective |
| **Marking** | ⚠️ Mixed | Auto for objective, manual for subjective |
| **Structure** | ✅ Compatible | Clear Section A and B division |
| **Risk Level** | 🟡 Medium | Composition and sentence creation need review |

### Import Strategy

```json
{
  "exam": {
    "title": "PLE English 2024",
    "subject": "English",
    "level": "PLE",
    "year": 2024,
    "country": "UGANDA",
    "examAuthority": "UNEB",
    "type": "Past Paper",
    "durationMinutes": 135,
    "totalMarks": 100
  },
  "structure": {
    "sections": 2,
    "instructionGroups": "~10",
    "items": 55,
    "interactions": "~75"
  },
  "markingConfig": {
    "autoMarkable": "Q1-53",
    "manualReview": "Q29-30, Q54-55",
    "rubricRequired": "Q55"
  }
}
```

### Import Risk: 🟡 **MEDIUM**
- Mix of objective and subjective questions
- Composition requires rubric-based marking
- Sentence creation (Q29-30) needs manual review
- Ordering questions need UI enhancement

---

## 4. PLE English 2023 (Rwanda)

**Exam Authority:** NESA (National Examination and School Inspection Authority)  
**Level:** PLE (Primary)  
**Year:** 2023  
**Total Questions:** 15 main questions with sub-parts  
**Format:** Mixed (comprehension, vocabulary, language use, composition)  
**Duration:** 2 hours

### Question Structure Analysis

| Section | Question | Sub-parts | Type | V2 Mapping | Fit |
|---------|----------|-----------|------|------------|-----|
| A | 1 | (a)-(g) | Reading comprehension | `itemType: passageComprehension`, context block + interactions | ✅ Direct |
| A | 2 | - | Summary writing | `itemType: shortText`, `responseMode: textLong` | ⚠️ Manual Review |
| A | 3 | (a)-(e) | Sentence making | `itemType: shortText`, `responseMode: textLong` | ⚠️ Manual Review |
| A | 4 | (a)-(f) | Fill-in-blanks (weather forecast) | `itemType: singleBlank`, `responseMode: textShort` | ✅ Direct |
| A | 5 | (a)-(g) | One word for phrase | `itemType: shortText`, `responseMode: textShort` | ✅ Direct |
| A | 6 | (a)-(g) | Complete sentences (occupations) | `itemType: singleBlank`, `responseMode: textShort`/`selectSingle` | ✅ Direct |
| B | 7 | - | Rearrange jumbled sentences | `itemType: ordering`, `responseMode: orderSequence` | ⚠️ Partial |
| B | 8 | (a)-(d) | Fill-in with time words | `itemType: singleBlank`, `responseMode: textShort` | ✅ Direct |
| B | 9 | (a)-(h) | Family relationship terms | `itemType: singleBlank`, `responseMode: textShort` | ✅ Direct |
| B | 10 | (a)-(f) | Prepositions | `itemType: singleBlank`, `responseMode: textShort` | ✅ Direct |
| B | 11 | (a)-(d) | One word for phrase | `itemType: shortText`, `responseMode: textShort` | ✅ Direct |
| B | 12 | (a)-(j) | Sentence transformation | `itemType: rewrite`, `responseMode: textShort`/`textLong` | ✅ Direct |
| B | 13 | (a)-(d) | Opposite words | `itemType: rewrite`, `responseMode: textShort` | ✅ Direct |
| B | 14 | (a)-(d) | Choose correct word | `itemType: shortText`, `responseMode: selectSingle` | ✅ Direct |
| C | 15 | (a) or (b) | Composition (letter or essay) | `itemType: composition`, `responseMode: structuredComposition` | ⚠️ Manual Review |

### Compatibility Assessment

| Aspect | Status | Details |
|--------|--------|---------|
| **Question Type** | ✅ Mostly Compatible | Similar to Uganda PLE |
| **Image Support** | ✅ Not Required | No images in this paper |
| **Answer Key** | ⚠️ Mixed | Many open-ended questions |
| **Marking** | ⚠️ Mixed | Significant manual review needed |
| **Structure** | ✅ Compatible | Clear Section A, B, C division |
| **Risk Level** | 🟡 Medium-High | More open-ended than Uganda |

### Import Strategy

```json
{
  "exam": {
    "title": "PLE English 2023",
    "subject": "English",
    "level": "PLE",
    "year": 2023,
    "country": "RWANDA",
    "examAuthority": "NESA",
    "type": "Past Paper",
    "durationMinutes": 120,
    "totalMarks": 100
  },
  "structure": {
    "sections": 3,
    "instructionGroups": "~8",
    "items": 15,
    "interactions": "~55"
  },
  "markingConfig": {
    "autoMarkable": "Q4, Q5, Q6, Q8, Q9, Q10, Q11, Q13, Q14",
    "manualReview": "Q1, Q2, Q3, Q7, Q12, Q15",
    "rubricRequired": "Q15"
  }
}
```

### Import Risk: 🟡 **MEDIUM-HIGH**
- Significant portion requires manual review
- Sentence construction questions are open-ended
- Composition requires rubric-based marking
- Summary writing is subjective

---

## Summary Comparison

| Exam | Country | Questions | Primary Format | Auto-Markable | Manual Review | Risk Level |
|------|---------|-----------|----------------|---------------|---------------|------------|
| **KCPE Maths 2023** | Kenya | 50 | MCQ | 100% | 0% | 🟢 Low |
| **PSLE Maths 2024** | Tanzania | 8 (35 parts) | Numeric | ~90% | ~10% | 🟡 Low-Medium |
| **PLE English 2024** | Uganda | 55 | Mixed | ~75% | ~25% | 🟡 Medium |
| **PLE English 2023** | Rwanda | 15 (55 parts) | Mixed | ~60% | ~40% | 🟡 Medium-High |

---

## Recommended Import Order

### Phase 1: KCPE Mathematics 2023 (Kenya) 🟢
**Rationale:**
- Pure MCQ format - simplest to import
- 100% auto-markable
- No complex structures
- Validates the import pipeline

### Phase 2: PSLE Mathematics 2024 (Tanzania) 🟡
**Rationale:**
- Numeric answers with clear marking rules
- Multi-part structure tests the V2 hierarchy
- Tests numeric normalization configuration
- Low manual review requirement

### Phase 3: PLE English 2024 (Uganda) 🟡
**Rationale:**
- Tests comprehension, poem, table, picture story formats
- Introduces manual review workflow
- Tests composition with rubric
- Good middle-ground complexity

### Phase 4: PLE English 2023 (Rwanda) 🟡
**Rationale:**
- Highest manual review requirement
- Tests open-ended question handling
- Validates teacher review workflow
- Most complex import

---

## Technical Requirements for Import

### Required Infrastructure

1. **Firestore Access** - Direct write access to V2 collections
2. **Storage Bucket** - For exam images (KCPE diagrams, Uganda picture story)
3. **Import Script** - Node.js script using `v2-collections.ts` functions
4. **Validation Tool** - Script to verify referential integrity

### Pre-Import Checklist

- [ ] All source documents parsed and structured
- [ ] Answer keys extracted and validated
- [ ] Images uploaded to Storage (if applicable)
- [ ] V2 import JSON generated and validated
- [ ] Marking rules defined for all interactions
- [ ] Model answer versions prepared
- [ ] Test import in development environment
- [ ] Referential integrity verified

### Post-Import Validation

- [ ] Exam renders correctly in exam taking page
- [ ] All questions display properly
- [ ] Images load correctly (if applicable)
- [ ] Auto-marking works for objective questions
- [ ] Manual review queue populated for subjective questions
- [ ] Student can complete and submit exam
- [ ] Results page shows correct scores

---

## Conclusion

All 4 exams are **compatible** with the XamPreps V2 system, with varying levels of complexity:

- **KCPE Mathematics** is the safest starting point (pure MCQ)
- **PSLE Mathematics** introduces numeric answer handling
- **PLE English (both)** test the full range of V2 capabilities including manual review

The recommended phased approach minimizes risk while building confidence in the import pipeline.