# PLE Mathematics 2015 Import Package - Handover Report

**Date:** 2026-04-06  
**Exam:** UNEB PLE Mathematics 2015  
**Source:** Official past paper PDF + companion answers/explanations

---

## Exam Metadata (Create First)

Create this document in Firestore before importing questions:

```
Collection: exams
Document ID: ple-maths-2015

Fields:
- title: "PLE Mathematics 2015"
- subject: "Mathematics"
- level: "PLE"
- year: 2015
- type: "Past Paper"
- difficulty: "Medium"
- timeLimit: 150
- time_limit: 150
- isFree: true
- is_free: true
- description: "Uganda National Examinations Board (UNEB) PLE Mathematics 2015"
- questionCount: 32
- question_count: 32
```

---

## Import Statistics

| Metric                   | Value                              |
| ------------------------ | ---------------------------------- |
| Total questions          | 32                                 |
| Total parts              | 44                                 |
| Section A (20 questions) | 20 parts (2 marks each = 40 marks) |
| Section B (12 questions) | 24 parts (60 marks)                |
| Total marks              | 100                                |
| Questions with images    | 10                                 |
| Questions without images | 22                                 |

### Answer Type Distribution

| Type       | Count | Percentage |
| ---------- | ----- | ---------- |
| numeric    | 36    | 82%        |
| text       | 6     | 14%        |
| open-ended | 2     | 4%         |

---

## Image Questions (Upload First)

Upload these 10 images to Firebase Storage before importing:

| Q#  | Filename                  | Path                                     |
| --- | ------------------------- | ---------------------------------------- |
| 5   | `q05-numberline.png`      | `ple/maths/2015/q05-numberline.png`      |
| 9   | `q09-symmetry.png`        | `ple/maths/2015/q09-symmetry.png`        |
| 15  | `q15-angle.png`           | `ple/maths/2015/q15-angle.png`           |
| 16  | `q16-venn.png`            | `ple/maths/2015/q16-venn.png`            |
| 21  | `q21-venn.png`            | `ple/maths/2015/q21-venn.png`            |
| 24  | `q24-cylinders.png`       | `ple/maths/2015/q24-cylinders.png`       |
| 26  | `q26-parallel-lines.png`  | `ple/maths/2015/q26-parallel-lines.png`  |
| 29  | `q29-composite-shape.png` | `ple/maths/2015/q29-composite-shape.png` |

See `docs/imports/ple-maths-2015-image-manifest.md` for details.

---

## Content QA Summary

### Verified Correct

- All 32 questions have accurate answers matching the official marking scheme
- Explanations are clear and age-appropriate for PLE students
- Mark allocations match the original paper

### Answer Format Adjustments Made

1. **Q7:** Answer stored as `7/3` (the system handles fraction equivalence with `2⅓`)
2. **Q8:** Answer stored as `7:15pm` (system handles time format variations)
3. **Q14:** Answer stored as `10100` (binary, system handles the subscript notation)
4. **Q27b:** Answer stored as `4 hours 30 minutes` (text format for time duration)

### Content Risks Flagged

1. **Q9:** Answer is `2` (number of symmetry lines) - the question asks to "show" lines, but we store the count for auto-grading
2. **Q21a:** Venn diagram completion is stored as text description - requires manual grading or `open-ended` type
3. **Q32a/b:** Drawing tasks stored as `open-ended` - cannot be auto-graded
4. **Q23:** Currency table not included in question text (would need image) - table is in the explanation instead

---

## Import Steps (For Kenogo)

### Step 1: Create Exam Metadata

1. Go to `/dashboard/admin`
2. Click "Create Exam" or use the exam editor
3. Fill in the metadata fields as shown above
4. Save to create `ple-maths-2015`

### Step 2: Upload Images

1. Extract diagrams from the PDF
2. Upload each to Firebase Storage using the paths in the Image Manifest
3. If using different URLs, update the JSON import file

### Step 3: Import Questions

1. Go to `/dashboard/admin`
2. Find "PLE Mathematics 2015" in the exam list
3. Click "Edit" or "Manage Questions"
4. Click "Bulk Import"
5. Copy the contents of `docs/imports/ple-maths-2015.import.json`
6. Paste into the JSON tab
7. Click "Preview Import" to verify
8. Click "Import" to complete

### Step 4: Verify

1. Go to `/exam/ple-maths-2015?mode=practice`
2. Check that all 32 questions render correctly
3. Verify images display for questions 5, 9, 15, 16, 21, 24, 26, 29
4. Test answer checking with a few sample answers

---

## Files Delivered

1. **`docs/imports/ple-maths-2015.import.json`** - Complete JSON import file (32 questions, 44 parts)
2. **`docs/imports/ple-maths-2015-image-manifest.md`** - Image extraction and upload guide
3. **`docs/handover/2026-04-06-ple-maths-2015-import-package.md`** - This handover report

---

## Notes for Future Exams

This import package can serve as a template for future exam imports:

- Follow the same JSON structure
- Use `numeric` for math answers, `text` for expressions, `open-ended` for drawings
- Keep explanations concise but educational
- Always upload images before importing questions
- Test the import with a small batch first
