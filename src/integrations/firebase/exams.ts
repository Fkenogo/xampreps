import { httpsCallable } from 'firebase/functions';
import {
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Timestamp,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseDb, getFirebaseFunctions } from '@/integrations/firebase/client';
import { hasSubmittedAnswer } from '@/lib/v2-response-display';
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

interface ResultLoadDebugContext {
  routeExamId?: string | null;
  currentUserId?: string | null;
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

function firebaseErrorDetails(error: unknown) {
  const maybe = error as { code?: unknown; message?: unknown };
  return {
    code: typeof maybe?.code === 'string' ? maybe.code : null,
    message: typeof maybe?.message === 'string' ? maybe.message : String(error),
  };
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0) || '';
}

function firstNumber(...values: unknown[]) {
  return values.find((value): value is number => typeof value === 'number' && Number.isFinite(value));
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
  const snapshots = await Promise.allSettled([
    getDocs(query(collection(db, 'exam_attempts'), where('userId', '==', userId), where('examId', '==', examId))),
    getDocs(query(collection(db, 'exam_attempts'), where('user_id', '==', userId), where('exam_id', '==', examId))),
  ]);

  const latest = snapshots
    .flatMap((result) => result.status === 'fulfilled' ? result.value.docs : [])
    .map((docSnap) => ({
      id: docSnap.id,
      submittedAt: toIso(docSnap.data().submittedAt) || toIso(docSnap.data().submitted_at),
    }))
    .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))[0];

  return { ok: Boolean(latest), attemptId: latest?.id || null };
}

export async function getExamAttemptFirebase(attemptId: string, debugContext: ResultLoadDebugContext = {}) {
  const attemptPath = `exam_attempts/${attemptId}`;
  console.info('[V2 results] Reading attempt', {
    routeExamId: debugContext.routeExamId || null,
    routeAttemptId: attemptId,
    path: attemptPath,
    currentUserId: debugContext.currentUserId || null,
  });

  let snap;
  try {
    snap = await getDoc(doc(db, 'exam_attempts', attemptId));
  } catch (error) {
    console.error('[V2 results] Attempt read failed', {
      routeExamId: debugContext.routeExamId || null,
      routeAttemptId: attemptId,
      path: attemptPath,
      currentUserId: debugContext.currentUserId || null,
      ...firebaseErrorDetails(error),
    });
    throw error;
  }

  console.info('[V2 results] Attempt read complete', {
    routeExamId: debugContext.routeExamId || null,
    routeAttemptId: attemptId,
    path: attemptPath,
    currentUserId: debugContext.currentUserId || null,
    exists: snap.exists(),
    userId: snap.exists() ? snap.data().userId || null : null,
    user_id: snap.exists() ? snap.data().user_id || null : null,
    examId: snap.exists() ? snap.data().examId || null : null,
    exam_id: snap.exists() ? snap.data().exam_id || null : null,
  });

  if (!snap.exists()) {
    return { ok: false, attempt: null };
  }

  const data = snap.data();
  const resolvedExamId = firstString(data.examId, data.exam_id, debugContext.routeExamId);
  const resolvedUserId = firstString(data.userId, data.user_id, data.uid, data.studentId, data.student_id);
  return {
    ok: true,
    attempt: {
      id: snap.id,
      userId: resolvedUserId,
      examId: resolvedExamId,
      mode: data.mode,
      status: data.status || 'submitted',
      durationSeconds: firstNumber(data.durationSeconds, data.duration_seconds, data.timeTaken, data.time_taken) ?? 0,
      autoScore: firstNumber(data.autoScore, data.auto_score) ?? 0,
      manualScore: firstNumber(data.manualScore, data.manual_score) ?? null,
      finalScore: firstNumber(data.finalScore, data.final_score, data.score) ?? 0,
      maxScore: firstNumber(data.maxScore, data.max_score, data.totalQuestions, data.total_questions) ?? 0,
      submittedAt: toIso(data.submittedAt) || toIso(data.submitted_at),
      completedAt: toIso(data.completedAt) || toIso(data.completed_at),
    } satisfies FirebaseExamAttempt,
  };
}

function mapSubmissionDoc(docSnap: DocumentSnapshot | QueryDocumentSnapshot): FirebaseAttemptSubmission {
  const data = docSnap.data()!;
  const interactionIdFromDocId = docSnap.id.includes('__') ? docSnap.id.split('__').slice(1).join('__') : '';
  const interactionRefId = typeof data.interactionRef === 'string'
    ? data.interactionRef.split('/').pop()
    : '';
  const responsePayload = data.responsePayload || data.response_payload || data.payload || data.answerPayload || {};
  return {
    submissionId: docSnap.id,
    itemId: firstString(data.itemId, data.item_id, data.itemRef, data.item_ref),
    interactionId: firstString(data.interactionId, data.interaction_id, interactionRefId, interactionIdFromDocId),
    responsePayload,
    isAnswered: (data.isAnswered !== false && data.is_answered !== false) || hasSubmittedAnswer(responsePayload),
    autoScore: firstNumber(data.autoScore, data.auto_score),
    manualScore: firstNumber(data.manualScore, data.manual_score),
    finalScore: firstNumber(data.finalScore, data.final_score),
    autoFeedback: data.autoFeedback || data.auto_feedback || undefined,
    teacherFeedback: data.teacherFeedback || data.teacher_feedback || undefined,
    reviewStatus: data.reviewStatus || data.review_status || 'pending',
    submittedAt: toIso(data.submittedAt) || toIso(data.submitted_at),
  } satisfies FirebaseAttemptSubmission;
}

export async function getExamAttemptDetailsFirebase(attemptId: string, debugContext: ResultLoadDebugContext = {}) {
  const attemptResult = await getExamAttemptFirebase(attemptId, debugContext);
  if (!attemptResult.ok || !attemptResult.attempt) {
    return { ok: false, attempt: null, submissions: [] };
  }

  const submissionQueries = [
    {
      label: 'attemptId',
      path: `submissions where attemptId == ${attemptId}`,
      run: () => getDocs(query(collection(db, 'submissions'), where('attemptId', '==', attemptId))),
    },
    {
      label: 'attempt_id',
      path: `submissions where attempt_id == ${attemptId}`,
      run: () => getDocs(query(collection(db, 'submissions'), where('attempt_id', '==', attemptId))),
    },
    {
      label: 'documentId_prefix',
      path: `submissions where documentId starts with ${attemptId}__`,
      run: () => getDocs(query(
        collection(db, 'submissions'),
        where(documentId(), '>=', `${attemptId}__`),
        where(documentId(), '<', `${attemptId}__\uf8ff`),
      )),
    },
  ];

  const submissionsById = new Map<string, FirebaseAttemptSubmission>();
  const submissionResults = await Promise.allSettled(
    submissionQueries.map(async (submissionQuery) => ({
      submissionQuery,
      snapshot: await submissionQuery.run(),
    })),
  );

  submissionResults.forEach((result, index) => {
    const submissionQuery = submissionQueries[index];
    if (result.status === 'fulfilled') {
      console.info('[V2 results] Submissions query complete', {
        routeExamId: debugContext.routeExamId || null,
        routeAttemptId: attemptId,
        path: result.value.submissionQuery.path,
        currentUserId: debugContext.currentUserId || null,
        count: result.value.snapshot.size,
      });
      result.value.snapshot.docs.forEach((docSnap) => submissionsById.set(docSnap.id, mapSubmissionDoc(docSnap)));
      return;
    }

    console.error('[V2 results] Submissions query failed', {
      routeExamId: debugContext.routeExamId || null,
      routeAttemptId: attemptId,
      path: submissionQuery.path,
      currentUserId: debugContext.currentUserId || null,
      ...firebaseErrorDetails(result.reason),
    });
  });

  if (submissionResults.every((result) => result.status === 'rejected')) {
    console.warn('[V2 results] All submissions queries failed; showing attempt shell without submissions', {
      routeExamId: debugContext.routeExamId || null,
      routeAttemptId: attemptId,
      currentUserId: debugContext.currentUserId || null,
    });
  }

  if (submissionsById.size === 0) {
    console.info('[V2 results] No submissions found for attempt', {
      routeExamId: debugContext.routeExamId || null,
      routeAttemptId: attemptId,
      currentUserId: debugContext.currentUserId || null,
    });
  }

  const submissions = Array.from(submissionsById.values())
    .sort((a, b) => a.interactionId.localeCompare(b.interactionId));

  console.info('[V2 results] Attempt details loaded', {
    routeExamId: debugContext.routeExamId || null,
    routeAttemptId: attemptId,
    currentUserId: debugContext.currentUserId || null,
    attemptExamId: attemptResult.attempt.examId,
    attemptUserId: attemptResult.attempt.userId,
    submissionsCount: submissions.length,
  });

  return { ok: true, attempt: attemptResult.attempt, submissions };
}

/**
 * Fetch submissions for an attempt using individual document reads.
 *
 * Collection queries on `submissions` require a `userId` filter to satisfy Firestore security
 * rules (students can only read their own documents). Filtering by `attemptId` alone causes a
 * `permission-denied` error because Firestore cannot statically prove ownership. Individual
 * `getDoc()` calls bypass this restriction — each read is evaluated against the specific
 * document, which passes the `resource.data.userId == request.auth.uid` check.
 *
 * Submissions are stored with document IDs of the form `{attemptId}__{interactionId}`, so
 * knowing the interaction IDs is sufficient to construct the exact paths.
 */
export async function fetchSubmissionsForAttemptFirebase(
  attemptId: string,
  interactionIds: string[],
): Promise<FirebaseAttemptSubmission[]> {
  if (!interactionIds.length) return [];
  const results = await Promise.allSettled(
    interactionIds.map((interactionId) =>
      getDoc(doc(db, 'submissions', `${attemptId}__${interactionId}`)),
    ),
  );
  return results.flatMap((result) => {
    if (result.status !== 'fulfilled' || !result.value.exists()) return [];
    return [mapSubmissionDoc(result.value)];
  });
}

export async function listExamHistoryFirebase(userId?: string | null) {
  const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
  if (!normalizedUserId) {
    return {
      ok: true,
      items: [] as FirebaseExamHistoryItem[],
    };
  }

  const attemptSnapshots = await Promise.allSettled([
    getDocs(query(collection(db, 'exam_attempts'), where('userId', '==', normalizedUserId))),
    getDocs(query(collection(db, 'exam_attempts'), where('user_id', '==', normalizedUserId))),
  ]);

  attemptSnapshots.forEach((result) => {
    if (result.status === 'rejected') {
      console.warn('[listExamHistoryFirebase] Optional attempt history query failed', firebaseErrorDetails(result.reason));
    }
  });

  const attemptDocs = Array.from(new Map(
    attemptSnapshots
      .flatMap((result) => result.status === 'fulfilled' ? result.value.docs : [])
      .map((docSnap) => [docSnap.id, docSnap])
  ).values());

  const items = await Promise.all(
    attemptDocs.map(async (docSnap) => {
      const data = docSnap.data();
      const attemptExamId = firstString(data.examId, data.exam_id);
      const examSnap = await getDoc(doc(db, 'exams', attemptExamId));
      if (!examSnap.exists() || examSnap.data().engineVersion !== 'v2') {
        return null;
      }

      return {
        id: docSnap.id,
        examId: attemptExamId,
        mode: data.mode || 'practice',
        status: data.status || 'submitted',
        score: firstNumber(data.finalScore, data.final_score, data.score) ?? 0,
        totalQuestions: firstNumber(data.maxScore, data.max_score, data.totalQuestions, data.total_questions) ?? 0,
        timeTaken: firstNumber(data.durationSeconds, data.duration_seconds, data.timeTaken, data.time_taken) ?? 0,
        completedAt: toIso(data.completedAt) || toIso(data.completed_at) || toIso(data.submittedAt) || toIso(data.submitted_at),
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
