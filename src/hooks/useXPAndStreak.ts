import { supabase } from '@/integrations/supabase/client';

interface UpdateProgressParams {
  userId: string;
  scorePercentage: number;
  totalQuestions: number;
}

export async function updateUserProgress({ userId, scorePercentage, totalQuestions }: UpdateProgressParams) {
  // Calculate XP earned based on score
  const baseXP = totalQuestions * 10; // 10 XP per question
  const bonusMultiplier = scorePercentage >= 80 ? 1.5 : scorePercentage >= 60 ? 1.2 : 1;
  const xpEarned = Math.round(baseXP * (scorePercentage / 100) * bonusMultiplier);

  // Get current progress
  const { data: currentProgress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

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
  const { error } = await supabase
    .from('user_progress')
    .update({
      xp: currentProgress.xp + xpEarned,
      streak: newStreak,
      last_exam_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating user progress:', error);
    return { xpEarned: 0, streakUpdated: false };
  }

  return { xpEarned, newStreak, streakUpdated };
}
