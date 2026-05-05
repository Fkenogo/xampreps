# XamPreps V2 Firestore Indexes

This document lists the Firestore composite indexes required by the V2 exam engine queries that are active in the current codebase.

**Note:** Collection names use production naming (no `v2_` prefix).

## Required Indexes

### sections

| Fields                             | Purpose                           |
| ---------------------------------- | --------------------------------- |
| `examId` (ASC), `orderIndex` (ASC) | Get sections for an exam in order |

### instruction_groups

| Fields                                | Purpose                              |
| ------------------------------------- | ------------------------------------ |
| `examId` (ASC), `orderIndex` (ASC)    | Get all instruction groups for an exam in order |
| `sectionId` (ASC), `orderIndex` (ASC) | Get instruction groups for a section |

### context_blocks

| Fields                            | Purpose                                     |
| --------------------------------- | ------------------------------------------- |
| `instructionGroupId` (ASC)        | Get context blocks for an instruction group |

### items

| Fields                                         | Purpose                            |
| ---------------------------------------------- | ---------------------------------- |
| `instructionGroupId` (ASC), `orderIndex` (ASC) | Get items for an instruction group |
| `examId` (ASC), `orderIndex` (ASC)             | Get all items for an exam          |

### interactions

| Fields                             | Purpose                            |
| ---------------------------------- | ---------------------------------- |
| `itemId` (ASC), `orderIndex` (ASC) | Get interactions for an item       |

### model_answer_versions

| Fields                                        | Purpose                                   |
| --------------------------------------------- | ----------------------------------------- |
| `interactionId` (ASC), `versionNumber` (DESC) | Get latest answer version for interaction |

### exam_attempts

| Fields                                               | Purpose                               |
| ---------------------------------------------------- | ------------------------------------- |
| `userId` (ASC), `completedAt` (DESC)                 | Get user's attempt history            |
| `userId` (ASC), `examId` (ASC), `completedAt` (DESC) | Get user's attempts for specific exam |

### submissions

| Fields                               | Purpose                                      |
| ------------------------------------ | -------------------------------------------- |
| `examId` (ASC), `reviewStatus` (ASC) | Get submissions for an exam by review status |

### review_tasks

| Fields                                    | Purpose                             |
| ----------------------------------------- | ----------------------------------- |
| `assignedTeacherId` (ASC), `status` (ASC) | Get teacher's assigned review tasks |
| `examId` (ASC), `priority` (DESC)         | Get review tasks for an exam        |

### feedback_templates

| Fields                            | Purpose                         |
| --------------------------------- | ------------------------------- |
| `active` (ASC), `subject` (ASC)   | Get active templates by subject |

## Index Creation JSON

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "sections",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "examId", "order": "ASCENDING" },
        { "fieldPath": "orderIndex", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "instruction_groups",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "examId", "order": "ASCENDING" },
        { "fieldPath": "orderIndex", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "instruction_groups",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sectionId", "order": "ASCENDING" },
        { "fieldPath": "orderIndex", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "context_blocks",
      "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "instructionGroupId", "order": "ASCENDING" }]
    },
    {
      "collectionGroup": "items",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "instructionGroupId", "order": "ASCENDING" },
        { "fieldPath": "orderIndex", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "items",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "examId", "order": "ASCENDING" },
        { "fieldPath": "orderIndex", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "interactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "itemId", "order": "ASCENDING" },
        { "fieldPath": "orderIndex", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "model_answer_versions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "interactionId", "order": "ASCENDING" },
        { "fieldPath": "versionNumber", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "exam_attempts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "completedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "exam_attempts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "examId", "order": "ASCENDING" },
        { "fieldPath": "completedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "submissions",
      "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "attemptId", "order": "ASCENDING" }]
    },
    {
      "collectionGroup": "submissions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "examId", "order": "ASCENDING" },
        { "fieldPath": "reviewStatus", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "review_tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "assignedTeacherId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "review_tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "examId", "order": "ASCENDING" },
        { "fieldPath": "priority", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "feedback_templates",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "active", "order": "ASCENDING" },
        { "fieldPath": "subject", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Single-Field Indexes (Automatic)

Firestore automatically creates single-field indexes for all fields. The following queries will work without composite indexes:

- Get document by ID
- Query by a single field with equality
- Query by a single field with range operators

## Notes

1. Indexes should be created before deploying to production
2. Monitor index usage in Firebase Console
3. Remove unused indexes to reduce costs
4. Consider query patterns when adding new features
