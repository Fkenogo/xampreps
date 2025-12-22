import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AchievementCheck {
  id: string;
  name: string;
  condition: (data: UserData) => boolean;
}

interface UserData {
  userId: string;
  xp: number;
  streak: number;
  examAttempts: number;
  perfectScores: number;
  averageScore: number;
}

const ACHIEVEMENT_CHECKS: AchievementCheck[] = [
  {
    id: 'first-steps',
    name: 'First Steps',
    condition: (data) => data.examAttempts >= 1,
  },
  {
    id: 'getting-started',
    name: 'Getting Started',
    condition: (data) => data.examAttempts >= 5,
  },
  {
    id: 'streak-master',
    name: 'Streak Master',
    condition: (data) => data.streak >= 7,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    condition: (data) => data.perfectScores >= 1,
  },
  {
    id: 'high-scorer',
    name: 'High Scorer',
    condition: (data) => data.averageScore >= 80,
  },
  {
    id: 'xp-hunter',
    name: 'XP Hunter',
    condition: (data) => data.xp >= 500,
  },
  {
    id: 'xp-master',
    name: 'XP Master',
    condition: (data) => data.xp >= 1000,
  },
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking achievements for user: ${userId}`);

    // Fetch user progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('xp, streak')
      .eq('user_id', userId)
      .single();

    // Fetch exam attempts
    const { data: attempts } = await supabase
      .from('exam_attempts')
      .select('score, total_questions')
      .eq('user_id', userId);

    // Fetch existing user achievements
    const { data: existingAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id, achievements(name)')
      .eq('user_id', userId);

    // Fetch all achievements
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*');

    const examAttempts = attempts?.length || 0;
    const perfectScores = attempts?.filter(a => a.score === a.total_questions).length || 0;
    const averageScore = attempts && attempts.length > 0
      ? attempts.reduce((acc, a) => acc + (a.score / a.total_questions) * 100, 0) / attempts.length
      : 0;

    const userData: UserData = {
      userId,
      xp: progress?.xp || 0,
      streak: progress?.streak || 0,
      examAttempts,
      perfectScores,
      averageScore,
    };

    console.log('User data:', userData);

    const existingAchievementNames = existingAchievements?.map(ea => (ea.achievements as any)?.name?.toLowerCase().replace(/\s+/g, '-')) || [];
    const newAchievements: string[] = [];

    // Check each achievement condition
    for (const check of ACHIEVEMENT_CHECKS) {
      if (!existingAchievementNames.includes(check.id) && check.condition(userData)) {
        // Find the achievement in the database
        const achievement = allAchievements?.find(a => 
          a.name.toLowerCase().replace(/\s+/g, '-') === check.id ||
          a.name.toLowerCase() === check.name.toLowerCase()
        );

        if (achievement) {
          // Award the achievement
          const { error } = await supabase
            .from('user_achievements')
            .insert({
              user_id: userId,
              achievement_id: achievement.id,
            });

          if (!error) {
            newAchievements.push(achievement.name);
            console.log(`Awarded achievement: ${achievement.name}`);

            // Create notification for the user
            await supabase
              .from('notifications')
              .insert({
                user_id: userId,
                text: `🏆 Achievement Unlocked: ${achievement.name}! +${achievement.xp_reward} XP`,
              });

            // Add XP reward
            if (achievement.xp_reward > 0) {
              await supabase
                .from('user_progress')
                .update({ xp: (progress?.xp || 0) + achievement.xp_reward })
                .eq('user_id', userId);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newAchievements,
        message: newAchievements.length > 0 
          ? `Awarded ${newAchievements.length} new achievement(s)` 
          : 'No new achievements'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error checking achievements:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
