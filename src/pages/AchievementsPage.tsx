import { useState, useEffect } from 'react';
import { listStudentDashboardSummaryFirebase, type FirebaseAchievement } from '@/integrations/firebase/student';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Trophy, Lock, CheckCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type Achievement = FirebaseAchievement;

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const summary = await listStudentDashboardSummaryFirebase();
        if (summary.ok) {
          const sortedAchievements = [...summary.achievements].sort(
            (a, b) => a.xp_reward - b.xp_reward
          );
          setAchievements(sortedAchievements);
          setUserAchievements(summary.userAchievementIds || []);
        }
      } catch (error) {
        console.error('Failed to fetch achievements from Firebase:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  const earnedCount = userAchievements.length;
  const totalXP = achievements
    .filter((a) => userAchievements.includes(a.id))
    .reduce((acc, a) => acc + a.xp_reward, 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Achievements</h1>
          <p className="text-muted-foreground mt-1">Track your learning milestones</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{earnedCount}</p>
            <p className="text-sm text-muted-foreground">Earned</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{achievements.length - earnedCount}</p>
            <p className="text-sm text-muted-foreground">Locked</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <Star className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{totalXP}</p>
            <p className="text-sm text-muted-foreground">XP Earned</p>
          </div>
        </div>

        {/* Achievement Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {achievements.map((achievement) => {
            const isEarned = userAchievements.includes(achievement.id);

            return (
              <div
                key={achievement.id}
                className={cn(
                  'bg-card rounded-2xl border p-6 transition-all',
                  isEarned
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-border opacity-60'
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center text-2xl',
                      isEarned ? 'bg-amber-500/20' : 'bg-muted'
                    )}
                  >
                    {achievement.icon || '🏆'}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{achievement.name}</h3>
                      {isEarned && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                    <p className="text-xs text-primary mt-2">+{achievement.xp_reward} XP</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {achievements.length === 0 && (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No achievements yet</h3>
            <p className="text-muted-foreground">Achievements will appear here as they're added</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
