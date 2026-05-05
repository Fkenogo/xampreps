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
  studentSubmissionId: string;
  issueType: string;
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
