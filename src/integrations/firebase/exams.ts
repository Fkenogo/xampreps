import { httpsCallable } from 'firebase/functions';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseDb, getFirebaseFunctions } from '@/integrations/firebase/client';
import type { V2ExamMode, V2Interaction, V2ResponsePayload, V2Submission } from '@/types/v2';

export interface SubmitExamAttemptInput {
  attemptId?: string;
  userId: string;
  examId: string;
  mode: V2ExamMode;
  durationSeconds: number;
  interactions: Array<Pick<V2Interaction, 'interactionId' | 'itemId'>>;
  responses: Record<string, V2ResponsePayload>;
  existingSubmissionStates?: Record<string, PersistedSubmissionState>;
}

export interface SubmitExamAttemptResult {
  ok: boolean;
  attemptId: string;
  summary: {
    attemptId: string;
    autoScore: number;
    manualScore: number | null;
    finalScore: number;
    maxScore: number;
    percentage: number;
    allReviewed: boolean;
  };
}

export interface FirebaseExamAttempt {
  id: string;
  userId: string;
  examId: string;
  mode: V2ExamMode;
  status: string;
  durationSeconds: number;
  autoScore: number;
  manualScore: number | null;
  finalScore: number;
  maxScore: number;
  submittedAt: string | null;
  completedAt: string | null;
}

export interface FirebaseExamHistoryItem {
  id: string;
  examId: string;
  mode: V2ExamMode;
  status: string;
  score: number;
  totalQuestions: number;
  timeTaken: number;
  completedAt: string | null;
  exam: {
    title: string;
    subject: string;
    level: string;
  } | null;
}

export interface FirebaseAttemptSubmission extends Pick<
  V2Submission,
  'submissionId' | 'itemId' | 'interactionId' | 'responsePayload' | 'isAnswered' | 'autoScore' | 'manualScore' | 'finalScore' | 'autoFeedback' | 'teacherFeedback' | 'reviewStatus'
> {
  submittedAt: string | null;
}

export interface InitializeV2ExamAttemptInput {
  userId: string;
  examId: string;
  mode: V2ExamMode;
}

export interface InitializeV2ExamAttemptResult {
  attemptId: string;
}

export interface PersistV2SubmissionInput {
  attemptId: string;
  userId: string;
  examId: string;
  itemId: string;
  interactionId: string;
  responsePayload: V2ResponsePayload;
  isAnswered?: boolean;
}

export interface PersistV2SubmissionResult {
  submissionId: string;
}

export interface AutoCheckV2SubmissionInput extends PersistV2SubmissionInput {}

export interface AutoCheckV2SubmissionResult {
  submissionId: string;
  autoScore: number;
  maxScore?: number;
  isCorrect?: boolean;
  requiresManualReview: boolean;
  confidence?: number;
  markingModeUsed?: string;
  feedback?: V2Submission['autoFeedback'];
}

export interface PersistedSubmissionState extends Partial<FirebaseAttemptSubmission> {
  submissionId: string;
  itemId: string;
  interactionId: string;
  responsePayload: V2ResponsePayload;
}

const db = getFirebaseDb();
const functions = getFirebaseFunctions();

const call = <TReq, TRes>(name: string) => httpsCallable<TReq, TRes>(functions, name);

function buildSubmissionId(attemptId: string, interactionId: string) {
  return `${attemptId}__${interactionId}`;
}

export function describeV2CallableError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : '';
  const message = error instanceof Error ? error.message : '';

  if (code.includes('functions/unauthenticated') || code.includes('unauthenticated')) {
    return 'Your session is not authorized for this V2 action. Sign in again and retry.';
  }
  if (code.includes('functions/invalid-argument') || code.includes('invalid-argument')) {
    return message || 'The V2 function rejected the request payload. Check the answer format and retry.';
  }
  if (code.includes('functions/unavailable') || code.includes('unavailable')) {
    return 'The V2 marking service is temporarily unavailable. Retry in a moment.';
  }
  if (code.includes('functions/internal') || code.includes('internal')) {
    return 'The V2 marking service failed while processing this request.';
  }
  if (message.includes('preflight') || message.includes('CORS') || message.includes('access control checks')) {
    return 'The browser could not reach the V2 callable endpoint. Redeploy the V2 functions and verify callable access.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'The browser could not contact the V2 backend. Check connectivity and function deployment.';
  }

  return message || 'The V2 backend request failed.';
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertValidResponsePayload(responsePayload: V2ResponsePayload, interactionId: string) {
  if (!isPlainObject(responsePayload)) {
    throw new Error(`Malformed interaction payload for ${interactionId}. Expected an object response payload.`);
  }
}

function isRejected<T>(result: PromiseSettledResult<T>): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

function hasResponseContent(response: V2ResponsePayload | undefined) {
  if (!response) return false;
  if (typeof response.textAnswer === 'string') return response.textAnswer.trim().length > 0;
  if (response.textAnswer && typeof response.textAnswer === 'object') {
    return Object.values(response.textAnswer as Record<string, unknown>).some((value) => String(value || '').trim().length > 0);
  }
  if (response.selectedOptions?.length) return true;
  if (response.tableAnswers) {
    return Object.values(response.tableAnswers).some((value) => String(value || '').trim().length > 0);
  }
  if (response.uploadedFileUrl) return true;
  return false;
}

export async function initializeV2ExamAttemptFirebase(
  payload: InitializeV2ExamAttemptInput,
): Promise<InitializeV2ExamAttemptResult> {
  const now = Timestamp.now();
  const attemptRef = doc(collection(db, 'exam_attempts'));

  await setDoc(attemptRef, {
    attemptId: attemptRef.id,
    userId: payload.userId,
    examId: payload.examId,
    mode: payload.mode,
    status: 'inProgress',
    startedAt: now,
    durationSeconds: 0,
    autoScore: 0,
    manualScore: null,
    finalScore: 0,
    maxScore: 0,
    createdAt: now,
    updatedAt: now,
  });

  return { attemptId: attemptRef.id };
}

export async function persistV2SubmissionFirebase(
  payload: PersistV2SubmissionInput,
  options?: { preserveEvaluation?: boolean; markUnanswered?: boolean },
): Promise<PersistV2SubmissionResult> {
  assertValidResponsePayload(payload.responsePayload, payload.interactionId);

  const submissionId = buildSubmissionId(payload.attemptId, payload.interactionId);
  const submissionRef = doc(db, 'submissions', submissionId);
  const now = Timestamp.now();
  const preserveEvaluation = options?.preserveEvaluation === true;
  const isAnswered = payload.isAnswered ?? hasResponseContent(payload.responsePayload);

  const evaluationFields = options?.markUnanswered
    ? {
        reviewStatus: 'unanswered',
        autoScore: 0,
        manualScore: null,
        finalScore: 0,
        autoFeedback: {
          isCorrect: false,
          markingModeUsed: 'unanswered',
        },
        teacherFeedback: null,
        reviewedAt: null,
        reviewedBy: null,
      }
    : preserveEvaluation
    ? {}
    : {
        reviewStatus: 'pending',
        autoScore: null,
        manualScore: null,
        finalScore: null,
        autoFeedback: null,
        teacherFeedback: null,
        reviewedAt: null,
        reviewedBy: null,
      };

  await setDoc(submissionRef, {
    submissionId,
    attemptId: payload.attemptId,
    examId: payload.examId,
    itemId: payload.itemId,
    interactionId: payload.interactionId,
    userId: payload.userId,
    responsePayload: payload.responsePayload,
    isAnswered,
    submittedAt: now,
    updatedAt: now,
    createdAt: now,
    ...evaluationFields,
  }, { merge: true });

  return { submissionId };
}

export async function autoCheckV2SubmissionFirebase(
  payload: AutoCheckV2SubmissionInput,
): Promise<AutoCheckV2SubmissionResult> {
  const { submissionId } = await persistV2SubmissionFirebase(payload);
  const autoMarkSubmission = call<
    { submissionId: string; interactionId: string; responsePayload: V2ResponsePayload },
    AutoCheckV2SubmissionResult
  >('v2AutoMarkSubmission');

  const result = (await autoMarkSubmission({
    submissionId,
    interactionId: payload.interactionId,
    responsePayload: payload.responsePayload,
  })).data;

  return {
    submissionId,
    autoScore: result.autoScore,
    maxScore: result.maxScore,
    isCorrect: result.isCorrect,
    requiresManualReview: result.requiresManualReview,
    confidence: result.confidence,
    markingModeUsed: result.markingModeUsed,
    feedback: result.feedback,
  };
}

export async function finalizeV2ExamAttemptFirebase(payload: {
  attemptId: string;
  durationSeconds: number;
}) {
  await updateDoc(doc(db, 'exam_attempts', payload.attemptId), {
    status: 'submitted',
    durationSeconds: payload.durationSeconds,
    submittedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function submitV2ExamAttemptFirebase(
  payload: SubmitExamAttemptInput,
): Promise<SubmitExamAttemptResult> {
  const attemptId = payload.attemptId
    || (await initializeV2ExamAttemptFirebase({
      userId: payload.userId,
      examId: payload.examId,
      mode: payload.mode,
    })).attemptId;

  const autoMarkSubmission = call<
    { submissionId: string; interactionId: string; responsePayload: V2ResponsePayload },
    { autoScore: number; requiresManualReview: boolean }
  >('v2AutoMarkSubmission');
  const aggregateAttemptScores = call<{ attemptId: string }, SubmitExamAttemptResult['summary']>(
    'v2AggregateAttemptScores',
  );

  const persistedStates = payload.existingSubmissionStates || {};
  const markingJobs: Array<{
    interactionId: string;
    submissionId: string;
    responsePayload: V2ResponsePayload;
  }> = [];
  let unansweredCount = 0;

  const persistenceResults = await Promise.allSettled(payload.interactions.map(async (interaction) => {
    const responsePayload = payload.responses[interaction.interactionId] || {};
    assertValidResponsePayload(responsePayload, interaction.interactionId);
    const isAnswered = hasResponseContent(responsePayload);
    if (!isAnswered) unansweredCount += 1;
    const existingState = persistedStates[interaction.interactionId];
    const { submissionId } = await persistV2SubmissionFirebase({
      attemptId,
      userId: payload.userId,
      examId: payload.examId,
      itemId: interaction.itemId,
      interactionId: interaction.interactionId,
      responsePayload,
      isAnswered,
    }, {
      markUnanswered: !isAnswered,
      preserveEvaluation: Boolean(
        isAnswered &&
        existingState &&
        existingState.reviewStatus &&
        existingState.reviewStatus !== 'pending' &&
        existingState.reviewStatus !== 'unanswered'
      ),
    });

    if (isAnswered && (!existingState || existingState.reviewStatus === 'pending' || existingState.reviewStatus === 'unanswered')) {
      markingJobs.push({
        submissionId,
        interactionId: interaction.interactionId,
        responsePayload,
      });
    }
  }));

  const persistenceFailures = persistenceResults.filter(isRejected);
  if (persistenceFailures.length > 0) {
    console.error('[submitV2ExamAttemptFirebase] Failed to persist one or more submissions', {
      attemptId,
      examId: payload.examId,
      failures: persistenceFailures.map((result) => String(result.reason?.message || result.reason)),
    });
    throw persistenceFailures[0].reason;
  }

  const markingResults = await Promise.allSettled(markingJobs.map((job) =>
    autoMarkSubmission({
      submissionId: job.submissionId,
      interactionId: job.interactionId,
      responsePayload: job.responsePayload,
    }),
  ));

  const markingFailures = markingResults
    .map((result, index) => ({ result, job: markingJobs[index] }))
    .filter((entry): entry is { result: PromiseRejectedResult; job: typeof markingJobs[number] } => entry.result.status === 'rejected');

  if (markingFailures.length > 0) {
    console.error('[submitV2ExamAttemptFirebase] Auto-mark failed for one or more submissions; continuing attempt submit', {
      attemptId,
      examId: payload.examId,
      failures: markingFailures.map(({ result, job }) => ({
        interactionId: job.interactionId,
        submissionId: job.submissionId,
        error: String(result.reason?.message || result.reason),
      })),
    });
  }

  await finalizeV2ExamAttemptFirebase({
    attemptId,
    durationSeconds: payload.durationSeconds,
  });

  let summary: SubmitExamAttemptResult['summary'];
  try {
    summary = (await aggregateAttemptScores({ attemptId })).data;
  } catch (error) {
    console.error('[submitV2ExamAttemptFirebase] Score aggregation failed after submit', {
      attemptId,
      examId: payload.examId,
      error,
    });
    summary = {
      attemptId,
      autoScore: 0,
      manualScore: null,
      finalScore: 0,
      maxScore: 0,
      percentage: 0,
      allReviewed: unansweredCount === payload.interactions.length,
    };
  }
  return { ok: true, attemptId, summary };
}

export async function submitExamAttemptFirebase(payload: SubmitExamAttemptInput) {
  return submitV2ExamAttemptFirebase(payload);
}

export async function getLatestExamAttemptIdFirebase(examId: string, userId: string) {
  const snapshot = await getDocs(
    query(collection(db, 'exam_attempts'), where('userId', '==', userId), where('examId', '==', examId)),
  );

  const latest = snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      submittedAt: toIso(docSnap.data().submittedAt),
    }))
    .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))[0];

  return { ok: Boolean(latest), attemptId: latest?.id || null };
}

export async function getExamAttemptFirebase(attemptId: string) {
  const snap = await getDoc(doc(db, 'exam_attempts', attemptId));
  if (!snap.exists()) {
    return { ok: false, attempt: null };
  }

  const data = snap.data();
  return {
    ok: true,
    attempt: {
      id: snap.id,
      userId: data.userId,
      examId: data.examId,
      mode: data.mode,
      status: data.status || 'submitted',
      durationSeconds: typeof data.durationSeconds === 'number' ? data.durationSeconds : 0,
      autoScore: typeof data.autoScore === 'number' ? data.autoScore : 0,
      manualScore: typeof data.manualScore === 'number' ? data.manualScore : null,
      finalScore: typeof data.finalScore === 'number' ? data.finalScore : 0,
      maxScore: typeof data.maxScore === 'number' ? data.maxScore : 0,
      submittedAt: toIso(data.submittedAt),
      completedAt: toIso(data.completedAt),
    } satisfies FirebaseExamAttempt,
  };
}

export async function getExamAttemptDetailsFirebase(attemptId: string) {
  const attemptResult = await getExamAttemptFirebase(attemptId);
  if (!attemptResult.ok || !attemptResult.attempt) {
    return { ok: false, attempt: null, submissions: [] };
  }

  const submissionsSnapshot = await getDocs(
    query(collection(db, 'submissions'), where('attemptId', '==', attemptId)),
  );
  const submissions = submissionsSnapshot.docs
    .map((docSnap) => {
      const data = docSnap.data();
      return {
        submissionId: docSnap.id,
        itemId: data.itemId,
        interactionId: data.interactionId,
        responsePayload: data.responsePayload || {},
        isAnswered: data.isAnswered !== false,
        autoScore: typeof data.autoScore === 'number' ? data.autoScore : undefined,
        manualScore: typeof data.manualScore === 'number' ? data.manualScore : undefined,
        finalScore: typeof data.finalScore === 'number' ? data.finalScore : undefined,
        autoFeedback: data.autoFeedback || undefined,
        teacherFeedback: data.teacherFeedback || undefined,
        reviewStatus: data.reviewStatus || 'pending',
        submittedAt: toIso(data.submittedAt),
      } satisfies FirebaseAttemptSubmission;
    })
    .sort((a, b) => a.interactionId.localeCompare(b.interactionId));

  return { ok: true, attempt: attemptResult.attempt, submissions };
}

export async function listExamHistoryFirebase(userId?: string | null) {
  const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
  if (!normalizedUserId) {
    return {
      ok: true,
      items: [] as FirebaseExamHistoryItem[],
    };
  }

  const attemptsSnapshot = await getDocs(
    query(collection(db, 'exam_attempts'), where('userId', '==', normalizedUserId)),
  );

  const items = await Promise.all(
    attemptsSnapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const examSnap = await getDoc(doc(db, 'exams', data.examId));
      if (!examSnap.exists() || examSnap.data().engineVersion !== 'v2') {
        return null;
      }

      return {
        id: docSnap.id,
        examId: data.examId,
        mode: data.mode || 'practice',
        status: data.status || 'submitted',
        score: typeof data.finalScore === 'number' ? data.finalScore : 0,
        totalQuestions: typeof data.maxScore === 'number' ? data.maxScore : 0,
        timeTaken: typeof data.durationSeconds === 'number' ? data.durationSeconds : 0,
        completedAt: toIso(data.completedAt) || toIso(data.submittedAt),
        exam: {
          title: examSnap.data().title || 'Untitled V2 Exam',
          subject: examSnap.data().subject || '',
          level: examSnap.data().level || '',
        },
      } satisfies FirebaseExamHistoryItem;
    }),
  );

  return {
    ok: true,
    items: items
      .filter((item): item is FirebaseExamHistoryItem => Boolean(item))
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || '')),
  };
}
