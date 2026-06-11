import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/client';

const functions = getFirebaseFunctions();

const call = <TReq, TRes>(name: string) => httpsCallable<TReq, TRes>(functions, name);

export interface V2TeacherReviewQueueFilters {
  examId?: string;
  studentId?: string;
  status?: string;
  reviewStatus?: string;
  subject?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface V2TeacherReviewQueueItem {
  id: string;
  submissionId: string;
  interactionId: string;
  examId: string;
  itemId: string;
  userId: string;
  priority: string;
  status: string;
  reason?: string;
  submission?: Record<string, unknown> | null;
  exam?: Record<string, unknown> | null;
  item?: Record<string, unknown> | null;
  interaction?: Record<string, unknown> | null;
  markingRule?: Record<string, unknown> | null;
  modelAnswer?: Record<string, unknown> | null;
  student?: Record<string, unknown> | null;
}

export interface V2TeacherAttemptReviewResponse {
  ok: boolean;
  attempt: Record<string, unknown>;
  submissions: Array<Record<string, unknown>>;
  reviewTasks: Array<Record<string, unknown>>;
  student: Record<string, unknown> | null;
}

export interface V2AnswerSuggestionItem {
  id: string;
  suggestionId?: string;
  examId: string;
  itemId: string;
  interactionId: string;
  markingRuleId?: string | null;
  modelAnswerVersionId?: string | null;
  teacherId: string;
  teacherName: string;
  studentId?: string | null;
  studentName?: string;
  studentAnswer?: string;
  studentSubmissionId: string;
  submissionId?: string;
  attemptId?: string;
  issueType: string;
  questionLabel?: string;
  sourceReference?: string;
  currentQuestionText?: string;
  currentAnswer?: string;
  currentAlternatives?: string[];
  currentExplanation?: string;
  currentMarkingMode?: string | null;
  suggestedAnswer?: string;
  suggestedAlternatives?: string[];
  suggestedExplanation?: string;
  suggestedMarkingMode?: string;
  teacherComment?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'needs_discussion';
  adminComment?: string;
  exam?: Record<string, unknown> | null;
  item?: Record<string, unknown> | null;
  interaction?: Record<string, unknown> | null;
  submission?: Record<string, unknown> | null;
}

export interface V2TeacherReviewActionItem {
  id: string;
  actionId?: string;
  actionType: string;
  examId?: string | null;
  attemptId?: string | null;
  submissionId?: string | null;
  itemId?: string | null;
  interactionId?: string | null;
  studentId?: string | null;
  studentName?: string;
  teacherId?: string | null;
  teacherName?: string;
  previousScore?: number | null;
  newScore?: number | null;
  previousReviewStatus?: string | null;
  newReviewStatus?: string | null;
  comment?: string;
  suggestionId?: string | null;
  questionLabel?: string;
  sourceReference?: string;
  studentAnswer?: string;
  officialAnswer?: string;
  suggestedAnswer?: string;
  suggestedExplanation?: string;
  suggestedMarkingMode?: string;
  status?: string;
  createdAt?: unknown;
  exam?: Record<string, unknown> | null;
  item?: Record<string, unknown> | null;
  interaction?: Record<string, unknown> | null;
  submission?: Record<string, unknown> | null;
  suggestion?: Record<string, unknown> | null;
}

export async function listTeacherReviewQueueFirebase(filters: V2TeacherReviewQueueFilters = {}) {
  const fn = call<V2TeacherReviewQueueFilters, { ok: boolean; tasks: V2TeacherReviewQueueItem[] }>(
    'v2ListTeacherReviewQueue',
  );
  return (await fn(filters)).data;
}

export async function submitTeacherReviewFirebase(payload: {
  reviewTaskId: string;
  score: number;
  comments?: string;
  interventionNotes?: string;
  rubricScores?: Record<string, number>;
}) {
  const fn = call<typeof payload, { ok: boolean; success: boolean; reviewTaskId: string; submissionId: string }>(
    'v2SubmitTeacherReview',
  );
  return (await fn(payload)).data;
}

export async function overrideTeacherSubmissionScoreFirebase(payload: {
  submissionId: string;
  score: number;
  comment: string;
}) {
  const fn = call<typeof payload, {
    ok: boolean;
    success: boolean;
    submissionId: string;
    reviewTaskId?: string | null;
    actionId?: string;
    summary?: Record<string, unknown> | null;
  }>('v2OverrideTeacherSubmissionScore');
  return (await fn(payload)).data;
}

export async function getTeacherAttemptReviewFirebase(payload: { attemptId: string }) {
  const fn = call<typeof payload, V2TeacherAttemptReviewResponse>('v2GetTeacherAttemptReview');
  return (await fn(payload)).data;
}

export async function createTeacherAnswerSuggestionFirebase(payload: {
  reviewTaskId?: string;
  submissionId?: string;
  issueType: string;
  suggestedAnswer?: string;
  suggestedAlternatives?: string[];
  suggestedExplanation?: string;
  suggestedMarkingMode?: string;
  teacherComment?: string;
}) {
  const fn = call<typeof payload, { ok: boolean; suggestionId: string }>('v2CreateTeacherAnswerSuggestion');
  return (await fn(payload)).data;
}

export async function listAdminAnswerSuggestionsFirebase(filters: {
  examId?: string;
  teacherId?: string;
  status?: string;
  issueType?: string;
  limit?: number;
} = {}) {
  const fn = call<typeof filters, { ok: boolean; suggestions: V2AnswerSuggestionItem[] }>(
    'v2ListAdminAnswerSuggestions',
  );
  return (await fn(filters)).data;
}

export async function adminResolveAnswerSuggestionFirebase(payload: {
  suggestionId: string;
  resolutionStatus: 'accepted' | 'rejected' | 'needs_discussion';
  adminComment?: string;
  approvedAnswer?: string;
  acceptableAlternatives?: string[];
  explanation?: string;
  markingMode?: string;
  itemPromptMarkdown?: string;
  interactionPromptMarkdown?: string;
  changeReason?: string;
}) {
  const fn = call<typeof payload, { ok: boolean; suggestionId: string; status: string; modelAnswerVersionId?: string }>(
    'v2AdminResolveAnswerSuggestion',
  );
  return (await fn(payload)).data;
}

export async function listTeacherReviewActionsFirebase(filters: {
  teacherId?: string;
  studentId?: string;
  examId?: string;
  actionType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
} = {}) {
  const fn = call<typeof filters, { ok: boolean; actions: V2TeacherReviewActionItem[] }>(
    'v2ListTeacherReviewActions',
  );
  return (await fn(filters)).data;
}

export async function adminUpdateV2ExamContentFirebase(payload: {
  examId: string;
  itemId: string;
  interactionId: string;
  markingRuleId?: string | null;
  itemUpdates?: Record<string, unknown>;
  interactionUpdates?: Record<string, unknown>;
  markingRuleUpdates?: Record<string, unknown>;
  modelAnswerUpdates?: Record<string, unknown>;
  changeReason: string;
}) {
  const fn = call<typeof payload, { ok: boolean; auditEventId: string; modelAnswerVersionId?: string | null }>(
    'v2AdminUpdateV2ExamContent',
  );
  return (await fn(payload)).data;
}
