import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/client';

const call = <TReq, TRes>(name: string) =>
  httpsCallable<TReq, TRes>(getFirebaseFunctions(), name);

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StudyAssistantResponse {
  ok: boolean;
  reply: string;
}

export async function studyAssistantFirebase(messages: ChatMessage[]) {
  const fn = call<{ messages: ChatMessage[] }, StudyAssistantResponse>('studyAssistant');
  return (await fn({ messages })).data;
}
