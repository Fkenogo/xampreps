import { Timestamp, collection, getDoc, getDocs, query, where, orderBy, doc } from 'firebase/firestore';
import { getFirebaseDb } from '@/integrations/firebase/client';
import {
  getExam,
  EXAM_COLLECTIONS,
} from '@/integrations/firebase/v2-collections';
import { normalizeCountryAndLevel } from '@/lib/education-system';
import type {
  V2ContextBlock,
  V2Exam,
  V2InstructionGroup,
  V2Interaction,
  V2MarkingRule,
  V2ModelAnswerVersion,
  V2Rubric,
  V2Section,
  V2Item,
} from '@/types/v2';

export interface FirebaseExam {
  id: string;
  title: string;
  subject: string;
  level: string;
  country: string;
  stage?: string | null;
  year: number;
  time_limit: number;
  difficulty: string;
  /** 'Past Paper' = official national exam paper; 'Practice Paper' = mock/institution paper */
  type: string;
  is_free: boolean;
  question_count: number;
  explanation_pdf_url?: string | null;
  description?: string | null;
  status?: string;
  curriculumVersion?: string;
  /** Source attribution for Practice Papers (school, institution, or publisher name) */
  source?: string | null;
  /**
   * Type of source for Practice Papers — e.g. 'school', 'publisher', 'institution'.
   * Optional; only present on Practice Papers that have explicit source metadata.
   */
  sourceType?: string | null;
  /**
   * Issuing authority for Past Papers — e.g. 'UNEB', 'KNEC', 'NECTA'.
   * Optional; only present when the Firestore document carries this field.
   */
  examAuthority?: string | null;
}

export interface LoadedV2ExamData {
  exam: V2Exam | null;
  sections: V2Section[];
  instructionGroups: Map<string, V2InstructionGroup[]>;
  contextBlocks: Map<string, V2ContextBlock[]>;
  items: Map<string, V2Item[]>;
  interactions: Map<string, V2Interaction[]>;
  markingRules: Map<string, V2MarkingRule>;
  rubrics: Map<string, V2Rubric>;
  modelAnswers: Map<string, V2ModelAnswerVersion[]>;
}

const db = getFirebaseDb();
const MODEL_ANSWER_BATCH_SIZE = 30;

function fromTimestamp(timestamp: Timestamp): Date {
  return timestamp.toDate();
}

function deserializeDates<T>(data: Record<string, unknown>): T {
  const result = { ...data };
  const dateFields = ['createdAt', 'updatedAt', 'startedAt', 'submittedAt', 'completedAt', 'publishedAt', 'reviewedAt', 'resolvedAt', 'uploadedAt'];

  for (const field of dateFields) {
    if (result[field] instanceof Timestamp) {
      result[field] = fromTimestamp(result[field] as Timestamp);
    }
  }

  return result as T;
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

function sortByOrderIndex<T extends { orderIndex: number }>(items: T[]) {
  return [...items].sort((a, b) => a.orderIndex - b.orderIndex);
}

function groupByKey<T>(items: T[], getKey: (item: T) => string | undefined): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }

  return grouped;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

interface RawExamFields {
  /** Raw type from Firestore document — 'Past Paper' | 'Practice Paper' | undefined */
  type?: string;
  /** Source attribution for Practice Papers */
  source?: string | null;
  /** Type of source — 'school' | 'publisher' | 'institution' | etc. */
  sourceType?: string | null;
  /** Exam authority for Past Papers — e.g. 'UNEB', 'KNEC', 'NECTA' */
  examAuthority?: string | null;
  /** Difficulty stored on the Firestore doc, overrides the hardcoded default */
  difficulty?: string | null;
  /** Free/premium flag stored on the Firestore doc */
  is_free?: boolean | null;
}

function firstPositiveNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
}

function toExamSummary(exam: V2Exam, questionCount: number, raw: RawExamFields = {}): FirebaseExam {
  const normalizedEducation = normalizeCountryAndLevel({
    country: exam.country,
    level: exam.level,
  });

  // Normalise the type value from Firestore. Default to 'Past Paper' only when
  // the field is absent — do not override an explicit 'Practice Paper' value.
  const resolvedType = raw.type === 'Practice Paper' ? 'Practice Paper' : 'Past Paper';

  return {
    id: exam.examId,
    title: exam.title,
    subject: exam.subject,
    level: normalizedEducation.levelCode ?? exam.level,
    country: normalizedEducation.countryCode ?? exam.country ?? 'UGANDA',
    stage: normalizedEducation.stage,
    year: exam.year,
    time_limit: exam.durationMinutes,
    // Use stored difficulty if present; fall back to 'Medium' for legacy docs
    difficulty: raw.difficulty || 'Medium',
    type: resolvedType,
    // Use stored is_free flag if present; fall back to true for legacy docs
    is_free: raw.is_free ?? true,
    question_count: questionCount,
    explanation_pdf_url: null,
    description: exam.overallInstructions || null,
    status: exam.status,
    curriculumVersion: exam.curriculumVersion,
    source: raw.source ?? null,
    sourceType: raw.sourceType ?? null,
    examAuthority: raw.examAuthority ?? null,
  };
}

async function getQuestionCount(examId: string, fallback?: number): Promise<number> {
  if (typeof fallback === 'number') {
    return fallback;
  }

  try {
    const snapshot = await getDocs(query(collection(db, 'items'), where('examId', '==', examId)));
    return snapshot.size;
  } catch (error) {
    console.warn('[listExamsFirebase] Unable to count exam items; using 0 for browse summary', {
      examId,
      error,
    });
    return 0;
  }
}

export async function listExamsFirebase(_type?: string) {
  const snapshot = await getDocs(collection(db, 'exams'));
  const exams = await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      try {
        const data = docSnap.data();
        if (data.engineVersion !== 'v2') {
          return null;
        }
        if (data.status && data.status !== 'published') {
          return null;
        }

        const exam = {
          examId: docSnap.id,
          ...data,
        } as V2Exam;

        const questionCount = await getQuestionCount(
          docSnap.id,
          firstPositiveNumber(
            data.questionCount,
            data.question_count,
            data.totalQuestions,
            data.total_questions,
            data.itemCount,
            data.item_count,
            data.totalItems,
            data.total_items,
          ),
        );

        // Pass through raw Firestore fields that are not part of the V2Exam interface
        const raw: RawExamFields = {
          type: typeof data.type === 'string' ? data.type : undefined,
          source: typeof data.source === 'string' ? data.source : null,
          sourceType: typeof data.sourceType === 'string' ? data.sourceType : null,
          examAuthority: typeof data.examAuthority === 'string' ? data.examAuthority : null,
          difficulty: typeof data.difficulty === 'string' ? data.difficulty : null,
          is_free: typeof data.is_free === 'boolean' ? data.is_free : null,
        };

        return toExamSummary(exam, questionCount, raw);
      } catch (error) {
        console.warn('[listExamsFirebase] Skipping exam that failed browse mapping', {
          examId: docSnap.id,
          error,
        });
        return null;
      }
    }),
  );

  const items = exams
    .filter((exam): exam is FirebaseExam => Boolean(exam))
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

  return { ok: true, items };
}

export async function loadV2ExamDataFirebase(examId: string): Promise<LoadedV2ExamData> {
  console.time('V2 exam load');
  try {
    const exam = await getExam(examId);

    if (!exam) {
      return {
        exam: null,
        sections: [],
        instructionGroups: new Map(),
        contextBlocks: new Map(),
        items: new Map(),
        interactions: new Map(),
        markingRules: new Map(),
        rubrics: new Map(),
        modelAnswers: new Map(),
      };
    }

    const [
      sectionsSnapshot,
      instructionGroupsSnapshot,
      contextBlocksSnapshot,
      itemsSnapshot,
      interactionsSnapshot,
    ] = await Promise.all([
      getDocs(query(collection(db, EXAM_COLLECTIONS.sections), where('examId', '==', examId), orderBy('orderIndex'))),
      getDocs(query(collection(db, EXAM_COLLECTIONS.instructionGroups), where('examId', '==', examId), orderBy('orderIndex'))),
      getDocs(query(collection(db, EXAM_COLLECTIONS.contextBlocks), where('examId', '==', examId))),
      getDocs(query(collection(db, EXAM_COLLECTIONS.items), where('examId', '==', examId), orderBy('orderIndex'))),
      getDocs(query(collection(db, EXAM_COLLECTIONS.interactions), where('examId', '==', examId))),
    ]);

    const sections = sectionsSnapshot.docs.map((docSnap) =>
      deserializeDates<V2Section>({ sectionId: docSnap.id, ...docSnap.data() }),
    );
    const allInstructionGroups = instructionGroupsSnapshot.docs.map((docSnap) =>
      deserializeDates<V2InstructionGroup>({ instructionGroupId: docSnap.id, ...docSnap.data() }),
    );
    const allContextBlocks = contextBlocksSnapshot.docs.map((docSnap) =>
      deserializeDates<V2ContextBlock>({ contextBlockId: docSnap.id, ...docSnap.data() }),
    );
    const allItems = itemsSnapshot.docs.map((docSnap) =>
      deserializeDates<V2Item>({ itemId: docSnap.id, ...docSnap.data() }),
    );
    const allInteractions = interactionsSnapshot.docs.map((docSnap) =>
      deserializeDates<V2Interaction>({ interactionId: docSnap.id, ...docSnap.data() }),
    );

    const uniqueMarkingRuleIds = [...new Set(allInteractions.map((interaction) => interaction.markingRuleId).filter(Boolean))];
    const uniqueRubricIds = [...new Set(allInteractions.map((interaction) => interaction.rubricId).filter(Boolean))];
    const interactionIds = allInteractions.map((interaction) => interaction.interactionId);

    // marking_rules and rubrics are restricted to content editors by Firestore rules.
    // Students cannot read them, so we fetch them in isolated try/catch blocks so a
    // permission error on these optional collections never blocks exam access.
    const markingRuleSnapshots = await Promise.all(
      uniqueMarkingRuleIds.map((markingRuleId) =>
        getDoc(doc(db, EXAM_COLLECTIONS.markingRules, markingRuleId as string)).catch((err) => {
          console.debug('[V2 exam load] Skipping marking rule (permission denied or missing):', markingRuleId, err?.code);
          return null;
        }),
      ),
    );

    const rubricSnapshots = await Promise.all(
      uniqueRubricIds.map((rubricId) =>
        getDoc(doc(db, EXAM_COLLECTIONS.rubrics, rubricId as string)).catch((err) => {
          console.debug('[V2 exam load] Skipping rubric (permission denied or missing):', rubricId, err?.code);
          return null;
        }),
      ),
    );

    const modelAnswerSnapshots = await Promise.all(
      chunkArray(interactionIds, MODEL_ANSWER_BATCH_SIZE).map((interactionChunk) =>
        interactionChunk.length === 0
          ? Promise.resolve({ docs: [] } as Awaited<ReturnType<typeof getDocs>>)
          : getDocs(
            query(
              collection(db, EXAM_COLLECTIONS.modelAnswerVersions),
              where('interactionId', 'in', interactionChunk),
            ),
          ),
      ),
    );

    const instructionGroups = new Map(
      Array.from(groupByKey(allInstructionGroups, (group) => group.sectionId).entries())
        .map(([sectionId, groups]) => [sectionId, sortByOrderIndex(groups)]),
    );

    const contextBlocks = groupByKey(allContextBlocks, (block) => block.instructionGroupId);

    const items = new Map(
      Array.from(groupByKey(allItems, (item) => item.instructionGroupId).entries())
        .map(([instructionGroupId, groupedItems]) => [instructionGroupId, sortByOrderIndex(groupedItems)]),
    );

    const interactions = new Map(
      Array.from(groupByKey(allInteractions, (interaction) => interaction.itemId).entries())
        .map(([itemId, groupedInteractions]) => [itemId, sortByOrderIndex(groupedInteractions)]),
    );

    const markingRules = new Map<string, V2MarkingRule>();
    for (const snapshot of markingRuleSnapshots) {
      if (!snapshot || !snapshot.exists()) continue;
      const data = snapshot.data();
      const rule = deserializeDates<V2MarkingRule>({
        markingRuleId: snapshot.id,
        ...data,
        conceptGroups: deserializeConceptGroupsFromFirestore(data.conceptGroups),
      });
      markingRules.set(rule.markingRuleId, rule);
    }

    const rubrics = new Map<string, V2Rubric>();
    for (const snapshot of rubricSnapshots) {
      if (!snapshot || !snapshot.exists()) continue;
      const rubric = deserializeDates<V2Rubric>({ rubricId: snapshot.id, ...snapshot.data() });
      rubrics.set(rubric.rubricId, rubric);
    }

    const modelAnswersByInteraction = new Map<string, V2ModelAnswerVersion[]>();
    for (const snapshot of modelAnswerSnapshots) {
      for (const docSnap of snapshot.docs) {
        const modelAnswer = deserializeDates<V2ModelAnswerVersion>({
          modelAnswerVersionId: docSnap.id,
          ...docSnap.data(),
        });
        const existing = modelAnswersByInteraction.get(modelAnswer.interactionId);
        if (existing) {
          existing.push(modelAnswer);
        } else {
          modelAnswersByInteraction.set(modelAnswer.interactionId, [modelAnswer]);
        }
      }
    }

    for (const [interactionId, versions] of modelAnswersByInteraction) {
      versions.sort((a, b) => b.versionNumber - a.versionNumber);
      modelAnswersByInteraction.set(interactionId, versions);
    }

    const modelAnswers = new Map<string, V2ModelAnswerVersion[]>();
    for (const item of allItems) {
      const itemInteractions = interactions.get(item.itemId) || [];
      const versions = itemInteractions.flatMap((interaction) => modelAnswersByInteraction.get(interaction.interactionId) || []);
      modelAnswers.set(
        item.itemId,
        versions.sort((a, b) => b.versionNumber - a.versionNumber),
      );
    }

    return {
      exam,
      sections,
      instructionGroups,
      contextBlocks,
      items,
      interactions,
      markingRules,
      rubrics,
      modelAnswers,
    };
  } finally {
    console.timeEnd('V2 exam load');
  }
}

export async function getExamContentFirebase(examId: string) {
  const data = await loadV2ExamDataFirebase(examId);
  if (!data.exam) {
    return { ok: false, exam: null };
  }
  return { ok: true, ...data };
}

export async function listReviewDueQuestionsFirebase() {
  throw new Error('Legacy review-session flow has been disabled. The exam engine is now V2-only.');
}

export async function submitReviewAnswerFirebase() {
  throw new Error('Legacy review-session flow has been disabled. The exam engine is now V2-only.');
}
