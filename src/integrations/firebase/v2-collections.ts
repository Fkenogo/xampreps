/**
 * XamPreps V2 Firestore Collection Access Layer
 * 
 * Provides type-safe access to all V2 Firestore collections.
 * Uses camelCase naming consistently throughout.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { getFirebaseDb } from './client';

/** Get the Firestore instance - cached to avoid repeated initialization */
const getDb = () => getFirebaseDb();
import type {
  V2Exam,
  V2Section,
  V2InstructionGroup,
  V2ContextBlock,
  V2Item,
  V2Interaction,
  V2MarkingRule,
  V2Rubric,
  V2ModelAnswerVersion,
  V2ExamAttempt,
  V2Submission,
  V2ReviewTask,
  V2FeedbackTemplate,
} from '@/types/v2';

// ============================================================================
// COLLECTION NAMES - Single source of truth
// ============================================================================

/**
 * Production collection names for the exam engine.
 * 
 * Note: These replace the legacy collections (exams, questions, question_parts).
 * The legacy collections remain for backward compatibility during transition
 * but should not be used for new content.
 */
export const EXAM_COLLECTIONS = {
  exams: 'exams',           // Replaces legacy exams (new schema)
  sections: 'sections',     // New collection
  instructionGroups: 'instruction_groups',  // New collection
  contextBlocks: 'context_blocks',          // New collection
  items: 'items',           // Replaces legacy questions (new schema)
  interactions: 'interactions',             // Replaces legacy question_parts
  markingRules: 'marking_rules',            // New collection
  rubrics: 'rubrics',                       // New collection
  modelAnswerVersions: 'model_answer_versions',  // New collection
  examAttempts: 'exam_attempts',  // Replaces legacy exam_attempts (new schema)
  submissions: 'submissions',   // New collection (replaces scattered response storage)
  reviewTasks: 'review_tasks',  // New collection
  feedbackTemplates: 'feedback_templates',  // New collection
} as const;

// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

/** Convert Date to Firestore Timestamp */
function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/** Convert Firestore Timestamp to Date */
function fromDate(timestamp: Timestamp): Date {
  return timestamp.toDate();
}

/** Serialize any Date fields to Timestamps for Firestore */
function serializeDates<T extends { createdAt?: Date; updatedAt?: Date; startedAt?: Date; submittedAt?: Date; completedAt?: Date; publishedAt?: Date; reviewedAt?: Date; resolvedAt?: Date; uploadedAt?: Date }>(
  obj: T
): Omit<T, 'createdAt' | 'updatedAt' | 'startedAt' | 'submittedAt' | 'completedAt' | 'publishedAt' | 'reviewedAt' | 'resolvedAt' | 'uploadedAt'> & {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  startedAt?: Timestamp;
  submittedAt?: Timestamp;
  completedAt?: Timestamp;
  publishedAt?: Timestamp;
  reviewedAt?: Timestamp;
  resolvedAt?: Timestamp;
  uploadedAt?: Timestamp;
} {
  const result = { ...obj };
  const dateFields = ['createdAt', 'updatedAt', 'startedAt', 'submittedAt', 'completedAt', 'publishedAt', 'reviewedAt', 'resolvedAt', 'uploadedAt'] as const;
  
  for (const field of dateFields) {
    if (obj[field] instanceof Date) {
      (result as any)[field] = toTimestamp(obj[field] as Date);
    }
  }
  
  return result as any;
}

/** Deserialize Firestore Timestamps back to Dates */
function deserializeDates<T>(data: DocumentData): T {
  const result = { ...data };
  const dateFields = ['createdAt', 'updatedAt', 'startedAt', 'submittedAt', 'completedAt', 'publishedAt', 'reviewedAt', 'resolvedAt', 'uploadedAt'];
  
  for (const field of dateFields) {
    if (result[field] instanceof Timestamp) {
      result[field] = fromDate(result[field]);
    }
  }
  
  return result as T;
}

function serializeConceptGroupsForFirestore(conceptGroups: unknown) {
  if (!Array.isArray(conceptGroups)) return conceptGroups;
  return Object.fromEntries(conceptGroups.map((group, index) => [String(index), group]));
}

function deserializeConceptGroupsFromFirestore(conceptGroups: unknown): unknown {
  if (!conceptGroups || Array.isArray(conceptGroups) || typeof conceptGroups !== 'object') {
    return conceptGroups;
  }

  return Object.keys(conceptGroups as Record<string, unknown>)
    .sort((left, right) => Number(left) - Number(right))
    .map((key) => (conceptGroups as Record<string, unknown>)[key])
    .filter(Array.isArray);
}

// ============================================================================
// EXAMS COLLECTION
// ============================================================================

export const examsCollection = collection(getDb(), EXAM_COLLECTIONS.exams);

export async function getExam(examId: string): Promise<V2Exam | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.exams, examId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return deserializeDates<V2Exam>({ examId: docSnap.id, ...docSnap.data() });
}

export async function listExamsBySubject(subject: string): Promise<V2Exam[]> {
  const q = query(examsCollection, where('subject', '==', subject), where('status', '==', 'published'), orderBy('year', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2Exam>({ examId: doc.id, ...doc.data() }));
}

export async function createExam(exam: Omit<V2Exam, 'examId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.exams);
  const data = serializeDates(exam);
  await setDoc(docRef, { ...data, examId: docRef.id });
  return docRef.id;
}

export async function updateExam(examId: string, updates: Partial<V2Exam>): Promise<void> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.exams, examId);
  const data = serializeDates(updates as any);
  await updateDoc(docRef, { ...data, updatedAt: toTimestamp(new Date()) });
}

export async function deleteExam(examId: string): Promise<void> {
  await deleteDoc(doc(getDb(), EXAM_COLLECTIONS.exams, examId));
}

// ============================================================================
// SECTIONS COLLECTION
// ============================================================================

export const sectionsCollection = collection(getDb(), EXAM_COLLECTIONS.sections);

export async function getSection(sectionId: string): Promise<V2Section | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.sections, sectionId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return deserializeDates<V2Section>({ sectionId: docSnap.id, ...docSnap.data() });
}

export async function getSectionsByExam(examId: string): Promise<V2Section[]> {
  const q = query(sectionsCollection, where('examId', '==', examId), orderBy('orderIndex'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2Section>({ sectionId: doc.id, ...doc.data() }));
}

export async function createSection(section: Omit<V2Section, 'sectionId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.sections);
  await setDoc(docRef, { ...section, sectionId: docRef.id, ...serializeDates({ createdAt: new Date(), updatedAt: new Date() } as any) });
  return docRef.id;
}

// ============================================================================
// INSTRUCTION GROUPS COLLECTION
// ============================================================================

export const instructionGroupsCollection = collection(getDb(), EXAM_COLLECTIONS.instructionGroups);

export async function getInstructionGroup(instructionGroupId: string): Promise<V2InstructionGroup | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.instructionGroups, instructionGroupId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return deserializeDates<V2InstructionGroup>({ instructionGroupId: docSnap.id, ...docSnap.data() });
}

export async function getInstructionGroupsBySection(sectionId: string): Promise<V2InstructionGroup[]> {
  const q = query(instructionGroupsCollection, where('sectionId', '==', sectionId), orderBy('orderIndex'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2InstructionGroup>({ instructionGroupId: doc.id, ...doc.data() }));
}

export async function createInstructionGroup(group: Omit<V2InstructionGroup, 'instructionGroupId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.instructionGroups);
  await setDoc(docRef, { ...group, instructionGroupId: docRef.id, ...serializeDates({ createdAt: new Date(), updatedAt: new Date() } as any) });
  return docRef.id;
}

// ============================================================================
// CONTEXT BLOCKS COLLECTION
// ============================================================================

export const contextBlocksCollection = collection(getDb(), EXAM_COLLECTIONS.contextBlocks);

export async function getContextBlock(contextBlockId: string): Promise<V2ContextBlock | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.contextBlocks, contextBlockId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return deserializeDates<V2ContextBlock>({ contextBlockId: docSnap.id, ...docSnap.data() });
}

export async function getContextBlocksByInstructionGroup(instructionGroupId: string): Promise<V2ContextBlock[]> {
  const q = query(contextBlocksCollection, where('instructionGroupId', '==', instructionGroupId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2ContextBlock>({ contextBlockId: doc.id, ...doc.data() }));
}

export async function createContextBlock(block: Omit<V2ContextBlock, 'contextBlockId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.contextBlocks);
  await setDoc(docRef, { ...block, contextBlockId: docRef.id, ...serializeDates({ createdAt: new Date(), updatedAt: new Date() } as any) });
  return docRef.id;
}

// ============================================================================
// ITEMS COLLECTION
// ============================================================================

export const itemsCollection = collection(getDb(), EXAM_COLLECTIONS.items);

export async function getItem(itemId: string): Promise<V2Item | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.items, itemId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return deserializeDates<V2Item>({ itemId: docSnap.id, ...docSnap.data() });
}

export async function getItemsByInstructionGroup(instructionGroupId: string): Promise<V2Item[]> {
  const q = query(itemsCollection, where('instructionGroupId', '==', instructionGroupId), orderBy('orderIndex'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2Item>({ itemId: doc.id, ...doc.data() }));
}

export async function getItemsByExam(examId: string): Promise<V2Item[]> {
  const q = query(itemsCollection, where('examId', '==', examId), orderBy('orderIndex'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2Item>({ itemId: doc.id, ...doc.data() }));
}

export async function createItem(item: Omit<V2Item, 'itemId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.items);
  await setDoc(docRef, { ...item, itemId: docRef.id, ...serializeDates({ createdAt: new Date(), updatedAt: new Date() } as any) });
  return docRef.id;
}

// ============================================================================
// INTERACTIONS COLLECTION
// ============================================================================

export const interactionsCollection = collection(getDb(), EXAM_COLLECTIONS.interactions);

export async function getInteraction(interactionId: string): Promise<V2Interaction | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.interactions, interactionId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return deserializeDates<V2Interaction>({ interactionId: docSnap.id, ...docSnap.data() });
}

export async function getInteractionsByItem(itemId: string): Promise<V2Interaction[]> {
  const q = query(interactionsCollection, where('itemId', '==', itemId), orderBy('orderIndex'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2Interaction>({ interactionId: doc.id, ...doc.data() }));
}

export async function createInteraction(interaction: Omit<V2Interaction, 'interactionId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.interactions);
  await setDoc(docRef, { ...interaction, interactionId: docRef.id, ...serializeDates({ createdAt: new Date(), updatedAt: new Date() } as any) });
  return docRef.id;
}

// ============================================================================
// MARKING RULES COLLECTION
// ============================================================================

export const markingRulesCollection = collection(getDb(), EXAM_COLLECTIONS.markingRules);

export async function getMarkingRule(markingRuleId: string): Promise<V2MarkingRule | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.markingRules, markingRuleId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return deserializeDates<V2MarkingRule>({
    markingRuleId: docSnap.id,
    ...data,
    conceptGroups: deserializeConceptGroupsFromFirestore(data.conceptGroups),
  });
}

export async function createMarkingRule(rule: Omit<V2MarkingRule, 'markingRuleId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.markingRules);
  const data = {
    ...rule,
    conceptGroups: serializeConceptGroupsForFirestore(rule.conceptGroups),
  };
  await setDoc(docRef, { ...data, markingRuleId: docRef.id, ...serializeDates({ createdAt: new Date(), updatedAt: new Date() } as any) });
  return docRef.id;
}

// ============================================================================
// RUBRICS COLLECTION
// ============================================================================

export const rubricsCollection = collection(getDb(), EXAM_COLLECTIONS.rubrics);

export async function getRubric(rubricId: string): Promise<V2Rubric | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.rubrics, rubricId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return deserializeDates<V2Rubric>({ rubricId: docSnap.id, ...docSnap.data() });
}

export async function createRubric(rubric: Omit<V2Rubric, 'rubricId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.rubrics);
  await setDoc(docRef, { ...rubric, rubricId: docRef.id, ...serializeDates({ createdAt: new Date(), updatedAt: new Date() } as any) });
  return docRef.id;
}

// ============================================================================
// MODEL ANSWER VERSIONS COLLECTION
// ============================================================================

export const modelAnswerVersionsCollection = collection(getDb(), EXAM_COLLECTIONS.modelAnswerVersions);

export async function getModelAnswerVersion(modelAnswerVersionId: string): Promise<V2ModelAnswerVersion | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.modelAnswerVersions, modelAnswerVersionId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return deserializeDates<V2ModelAnswerVersion>({ modelAnswerVersionId: docSnap.id, ...docSnap.data() });
}

export async function getModelAnswerVersionsByInteraction(interactionId: string): Promise<V2ModelAnswerVersion[]> {
  const q = query(modelAnswerVersionsCollection, where('interactionId', '==', interactionId), orderBy('versionNumber', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2ModelAnswerVersion>({ modelAnswerVersionId: doc.id, ...doc.data() }));
}

export async function createModelAnswerVersion(version: Omit<V2ModelAnswerVersion, 'modelAnswerVersionId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.modelAnswerVersions);
  await setDoc(docRef, { ...version, modelAnswerVersionId: docRef.id, createdAt: toTimestamp(new Date()) });
  return docRef.id;
}

// ============================================================================
// EXAM ATTEMPTS COLLECTION
// ============================================================================

export const examAttemptsCollection = collection(getDb(), EXAM_COLLECTIONS.examAttempts);

export async function getExamAttempt(attemptId: string): Promise<V2ExamAttempt | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.examAttempts, attemptId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return deserializeDates<V2ExamAttempt>({ attemptId: docSnap.id, ...docSnap.data() });
}

export async function getExamAttemptsByUser(userId: string): Promise<V2ExamAttempt[]> {
  const q = query(examAttemptsCollection, where('userId', '==', userId), orderBy('completedAt', 'desc'), limit(100));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2ExamAttempt>({ attemptId: doc.id, ...doc.data() }));
}

export async function createExamAttempt(attempt: Omit<V2ExamAttempt, 'attemptId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.examAttempts);
  await setDoc(docRef, { ...attempt, attemptId: docRef.id, ...serializeDates({ createdAt: new Date(), updatedAt: new Date() } as any) });
  return docRef.id;
}

export async function updateExamAttempt(attemptId: string, updates: Partial<V2ExamAttempt>): Promise<void> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.examAttempts, attemptId);
  const data = serializeDates(updates as any);
  await updateDoc(docRef, { ...data, updatedAt: toTimestamp(new Date()) });
}

// ============================================================================
// SUBMISSIONS COLLECTION
// ============================================================================

export const submissionsCollection = collection(getDb(), EXAM_COLLECTIONS.submissions);

export async function getSubmission(submissionId: string): Promise<V2Submission | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.submissions, submissionId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return deserializeDates<V2Submission>({ submissionId: docSnap.id, ...docSnap.data() });
}

export async function getSubmissionsByAttempt(attemptId: string): Promise<V2Submission[]> {
  const q = query(submissionsCollection, where('attemptId', '==', attemptId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2Submission>({ submissionId: doc.id, ...doc.data() }));
}

export async function getSubmissionsForReview(examId: string): Promise<V2Submission[]> {
  const q = query(
    submissionsCollection,
    where('examId', '==', examId),
    where('reviewStatus', 'in', ['pending', 'teacherReview'])
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2Submission>({ submissionId: doc.id, ...doc.data() }));
}

export async function createSubmission(submission: Omit<V2Submission, 'submissionId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.submissions);
  await setDoc(docRef, { ...submission, submissionId: docRef.id, ...serializeDates({ createdAt: new Date(), updatedAt: new Date() } as any) });
  return docRef.id;
}

export async function updateSubmission(submissionId: string, updates: Partial<V2Submission>): Promise<void> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.submissions, submissionId);
  const data = serializeDates(updates as any);
  await updateDoc(docRef, { ...data, updatedAt: toTimestamp(new Date()) });
}

// ============================================================================
// REVIEW TASKS COLLECTION
// ============================================================================

export const reviewTasksCollection = collection(getDb(), EXAM_COLLECTIONS.reviewTasks);

export async function getReviewTask(reviewTaskId: string): Promise<V2ReviewTask | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.reviewTasks, reviewTaskId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return deserializeDates<V2ReviewTask>({ reviewTaskId: docSnap.id, ...docSnap.data() });
}

export async function getReviewTasksByTeacher(teacherId: string): Promise<V2ReviewTask[]> {
  const q = query(
    reviewTasksCollection,
    where('assignedTeacherId', '==', teacherId),
    where('status', 'in', ['pending', 'assigned', 'inProgress'])
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2ReviewTask>({ reviewTaskId: doc.id, ...doc.data() }));
}

export async function getReviewTasksByExam(examId: string): Promise<V2ReviewTask[]> {
  const q = query(reviewTasksCollection, where('examId', '==', examId), orderBy('priority', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2ReviewTask>({ reviewTaskId: doc.id, ...doc.data() }));
}

export async function createReviewTask(task: Omit<V2ReviewTask, 'reviewTaskId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.reviewTasks);
  await setDoc(docRef, { ...task, reviewTaskId: docRef.id, ...serializeDates({ createdAt: new Date(), updatedAt: new Date() } as any) });
  return docRef.id;
}

export async function updateReviewTask(reviewTaskId: string, updates: Partial<V2ReviewTask>): Promise<void> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.reviewTasks, reviewTaskId);
  const data = serializeDates(updates as any);
  await updateDoc(docRef, { ...data, updatedAt: toTimestamp(new Date()) });
}

// ============================================================================
// FEEDBACK TEMPLATES COLLECTION
// ============================================================================

export const feedbackTemplatesCollection = collection(getDb(), EXAM_COLLECTIONS.feedbackTemplates);

export async function getFeedbackTemplate(feedbackTemplateId: string): Promise<V2FeedbackTemplate | null> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.feedbackTemplates, feedbackTemplateId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return deserializeDates<V2FeedbackTemplate>({ feedbackTemplateId: docSnap.id, ...docSnap.data() });
}

export async function getActiveFeedbackTemplates(subject?: string, level?: string): Promise<V2FeedbackTemplate[]> {
  let q = query(feedbackTemplatesCollection, where('active', '==', true));
  if (subject) q = query(feedbackTemplatesCollection, where('active', '==', true), where('subject', '==', subject));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => deserializeDates<V2FeedbackTemplate>({ feedbackTemplateId: doc.id, ...doc.data() }));
}

export async function createFeedbackTemplate(template: Omit<V2FeedbackTemplate, 'feedbackTemplateId'>): Promise<string> {
  const docRef = doc(getDb(), EXAM_COLLECTIONS.feedbackTemplates);
  await setDoc(docRef, { ...template, feedbackTemplateId: docRef.id, ...serializeDates({ createdAt: new Date(), updatedAt: new Date() } as any) });
  return docRef.id;
}
