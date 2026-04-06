import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/client';

const call = <TReq, TRes>(name: string) =>
  httpsCallable<TReq, TRes>(getFirebaseFunctions(), name);

type UnknownRecord = Record<string, unknown>;
type UnknownItem = Record<string, unknown>;

interface AdminDashboardSummaryResponse {
  ok: boolean;
  users: UnknownItem[];
  exams: UnknownItem[];
  stats: {
    totalUsers: number;
    totalExams: number;
    totalAttempts: number;
    premiumUsers: number;
  };
}

interface AdminListItemsResponse {
  ok: boolean;
  items: UnknownItem[];
}

export async function adminDashboardSummaryFirebase() {
  const fn = call<Record<string, never>, AdminDashboardSummaryResponse>('adminDashboardSummary');
  return (await fn({})).data;
}

export async function adminListExamsFirebase() {
  const fn = call<Record<string, never>, AdminListItemsResponse>('adminListExams');
  return (await fn({})).data;
}

export async function adminUpsertExamFirebase(payload: UnknownRecord) {
  const fn = call<UnknownRecord, { ok: boolean; id: string }>('adminUpsertExam');
  return (await fn(payload)).data;
}

export async function adminDuplicateExamFirebase(examId: string) {
  const fn = call<{ examId: string }, { ok: boolean; exam: UnknownItem }>('adminDuplicateExam');
  return (await fn({ examId })).data;
}

export async function adminListExamQuestionsPreviewFirebase(examId: string) {
  const fn = call<{ examId: string }, AdminListItemsResponse>('adminListExamQuestionsPreview');
  return (await fn({ examId })).data;
}

export async function adminListExamQuestionsFullFirebase(examId: string) {
  const fn = call<{ examId: string }, AdminListItemsResponse>('adminListExamQuestionsFull');
  return (await fn({ examId })).data;
}

export async function adminSaveExamQuestionsFirebase(examId: string, questions: UnknownItem[]) {
  const fn = call<{ examId: string; questions: UnknownItem[] }, { ok: boolean; questionCount: number }>('adminSaveExamQuestions');
  return (await fn({ examId, questions })).data;
}

export async function adminBulkImportQuestionsFirebase(examId: string, questions: UnknownItem[]) {
  const fn = call<{ examId: string; questions: UnknownItem[] }, { ok: boolean; imported: number; questionCount: number }>('adminBulkImportQuestions');
  return (await fn({ examId, questions })).data;
}

export async function adminSetQuestionImageUrlsFirebase(
  examId: string,
  updates: Array<{ question_number: number; image_url: string }>
) {
  const fn = call<
    { examId: string; updates: Array<{ question_number: number; image_url: string }> },
    { ok: boolean; updated: number; missing: number[] }
  >('adminSetQuestionImageUrls');
  return (await fn({ examId, updates })).data;
}
