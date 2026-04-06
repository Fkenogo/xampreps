import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/client';

const call = <TReq, TRes>(name: string) =>
  httpsCallable<TReq, TRes>(getFirebaseFunctions(), name);

export interface AIExplanationRequest {
  type: 'explanation' | 'feedback';
  questionText: string;
  correctAnswer: string;
  userAnswer?: string;
  studentLevel?: string;
  subject?: string;
  marks?: number;
}

export interface AIExplanationResponse {
  ok: boolean;
  explanation: string;
}

export async function getAIExplanationFirebase(payload: AIExplanationRequest) {
  const fn = call<AIExplanationRequest, AIExplanationResponse>('aiExplanations');
  return (await fn(payload)).data;
}
