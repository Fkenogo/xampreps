import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/client';

const call = <TReq, TRes>(name: string) =>
  httpsCallable<TReq, TRes>(getFirebaseFunctions(), name);

export interface FirebaseExam {
  id: string;
  title: string;
  subject: string;
  level: string;
  year: number;
  time_limit: number;
  difficulty: string;
  type: string;
  is_free: boolean;
  question_count?: number;
  explanation_pdf_url?: string | null;
  description?: string | null;
}

export interface FirebaseQuestionPart {
  id: string;
  question_id: string;
  text: string;
  answer: string;
  explanation: string | null;
  marks: number;
  order_index: number;
  answer_type: string;
}

export interface FirebaseQuestion {
  id: string;
  exam_id: string;
  question_number: number;
  text: string;
  image_url: string | null;
  parts: FirebaseQuestionPart[];
  question_parts: FirebaseQuestionPart[];
}

export interface FirebaseReviewItem {
  history: {
    id: string;
    user_id: string;
    question_part_id: string;
    exam_id: string;
    is_correct: boolean;
    streak: number;
    next_review: string;
    last_attempt: string;
  };
  part: FirebaseQuestionPart;
  question: {
    id: string;
    exam_id: string;
    question_number: number;
    text: string;
    image_url: string | null;
  };
  exam: {
    id: string;
    title: string;
    subject: string;
    level: string;
  };
}

export async function listExamsFirebase(type?: string) {
  const fn = call<{ type?: string }, { ok: boolean; items: FirebaseExam[] }>('listExams');
  return (await fn(type ? { type } : {})).data;
}

export async function getExamContentFirebase(examId: string) {
  const fn = call<{ examId: string }, { ok: boolean; exam: FirebaseExam; questions: FirebaseQuestion[] }>(
    'getExamContent'
  );
  return (await fn({ examId })).data;
}

export async function listReviewDueQuestionsFirebase(limit = 20) {
  const fn = call<{ limit: number }, { ok: boolean; items: FirebaseReviewItem[] }>('listReviewDueQuestions');
  return (await fn({ limit })).data;
}

export async function submitReviewAnswerFirebase(payload: {
  historyId: string;
  isCorrect: boolean;
  streak: number;
  nextReview: string;
  lastAttempt: string;
}) {
  const fn = call<typeof payload, { ok: boolean }>('submitReviewAnswer');
  return (await fn(payload)).data;
}
