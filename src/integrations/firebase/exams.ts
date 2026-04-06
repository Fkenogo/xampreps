import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/client';

export interface SubmitExamAttemptInput {
  examId: string;
  mode: 'practice' | 'quiz' | 'simulation';
  score: number;
  totalQuestions: number;
  timeTaken: number;
  questionHistoryUpdates: Array<{
    questionPartId: string;
    isCorrect: boolean;
    nextReview: string;
  }>;
}

export interface SubmitExamAttemptResult {
  ok: boolean;
  attemptId: string;
  xpEarned: number;
  newStreak: number;
  streakUpdated: boolean;
}

export interface FirebaseExamAttempt {
  id: string;
  userId: string;
  examId: string;
  mode: 'practice' | 'simulation' | 'quiz';
  score: number;
  totalQuestions: number;
  timeTaken: number;
  completedAt: string;
}

export interface FirebaseExamHistoryItem {
  id: string;
  examId: string;
  mode: 'practice' | 'simulation' | 'quiz';
  score: number;
  totalQuestions: number;
  timeTaken: number;
  completedAt: string;
  exam: {
    title: string;
    subject: string;
    level: string;
  } | null;
}

const call = <TReq, TRes>(name: string) =>
  httpsCallable<TReq, TRes>(getFirebaseFunctions(), name);

export async function submitExamAttemptFirebase(payload: SubmitExamAttemptInput) {
  const fn = call<SubmitExamAttemptInput, SubmitExamAttemptResult>('submitExamAttempt');
  return (await fn(payload)).data;
}

export async function getLatestExamAttemptIdFirebase(examId: string) {
  const fn = call<{ examId: string }, { ok: boolean; attemptId: string | null }>('getLatestExamAttemptId');
  return (await fn({ examId })).data;
}

export async function getExamAttemptFirebase(attemptId: string) {
  const fn = call<{ attemptId: string }, { ok: boolean; attempt: FirebaseExamAttempt }>('getExamAttempt');
  return (await fn({ attemptId })).data;
}

export async function listExamHistoryFirebase() {
  const fn = call<Record<string, never>, { ok: boolean; items: FirebaseExamHistoryItem[] }>('listExamHistory');
  return (await fn({})).data;
}
