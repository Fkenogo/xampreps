import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/client';

const call = <TReq, TRes>(name: string) =>
  httpsCallable<TReq, TRes>(getFirebaseFunctions(), name);

export interface FirebaseAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
}

export interface FirebaseStudentDashboardSummary {
  ok: boolean;
  achievements: FirebaseAchievement[];
  userAchievementIds: string[];
  examStats: {
    totalAttempts: number;
    averageScore: number;
    bestSubject: string;
  };
  subjectProgress: Array<{
    subject: string;
    progress: number;
    examCount: number;
  }>;
}

export async function listStudentDashboardSummaryFirebase() {
  const fn = call<Record<string, never>, FirebaseStudentDashboardSummary>('listStudentDashboardSummary');
  return (await fn({})).data;
}
