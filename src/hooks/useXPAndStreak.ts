import { doc, getDoc, getDocs, query, setDoc, collection, where } from 'firebase/firestore';
import { getFirebaseDb } from '@/integrations/firebase/client';

interface UpdateProgressParams {
  userId: string;
  scorePercentage: number;
  totalQuestions: number;
}

export async function updateUserProgress({ userId, scorePercentage, totalQuestions }: UpdateProgressParams) {
  const db = getFirebaseDb();
  // Calculate XP earned based on score
  const baseXP = totalQuestions * 10; // 10 XP per question
  const bonusMultiplier = scorePercentage >= 80 ? 1.5 : scorePercentage >= 60 ? 1.2 : 1;
  const xpEarned = Math.round(baseXP * (scorePercentage / 100) * bonusMultiplier);

  // Get current progress
  const progressRef = doc(db, 'user_progress', userId);
  const progressDoc = await getDoc(progressRef);
  const byIdData = progressDoc.exists() ? progressDoc.data() : null;
  const byUserId = byIdData
    ? byIdData
    : (await getDocs(query(collection(db, 'user_progress'), where('userId', '==', userId)))).docs[0]?.data() ||
      (await getDocs(query(collection(db, 'user_progress'), where('user_id', '==', userId)))).docs[0]?.data() ||
      null;
  const currentProgress = byUserId
    ? {
        xp: typeof byUserId.xp === 'number' ? byUserId.xp : 0,
        streak: typeof byUserId.streak === 'number' ? byUserId.streak : 0,
        last_exam_date:
          typeof byUserId.lastExamDate === 'string'
            ? byUserId.lastExamDate
            : typeof byUserId.last_exam_date === 'string'
              ? byUserId.last_exam_date
              : null,
      }
    : null;

  if (!currentProgress) {
    console.error('No user progress found for user:', userId);
    return { xpEarned: 0, streakUpdated: false };
  }

  const today = new Date().toISOString().split('T')[0];
  const lastExamDate = currentProgress.last_exam_date;
  
  // Calculate streak
  let newStreak = currentProgress.streak;
  let streakUpdated = false;
  
  if (!lastExamDate) {
    // First exam ever
    newStreak = 1;
    streakUpdated = true;
  } else {
    const lastDate = new Date(lastExamDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Already took exam today, keep streak
    } else if (diffDays === 1) {
      // Consecutive day, increment streak
      newStreak = currentProgress.streak + 1;
      streakUpdated = true;
    } else {
      // Missed a day, reset streak
      newStreak = 1;
      streakUpdated = true;
    }
  }

  // Update progress
  try {
    await setDoc(progressRef, {
      xp: currentProgress.xp + xpEarned,
      streak: newStreak,
      lastExamDate: today,
      last_exam_date: today,
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (error: unknown) {
    console.error('Error updating user progress:', error);
    return { xpEarned: 0, streakUpdated: false };
  }

  return { xpEarned, newStreak, streakUpdated };
}
