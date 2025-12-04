import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import ProgressRing from '@/components/dashboard/ProgressRing';
import StreakCalendar from '@/components/dashboard/StreakCalendar';
import AchievementBadge from '@/components/dashboard/AchievementBadge';
import QuickActionCard from '@/components/dashboard/QuickActionCard';
import SubjectCard from '@/components/dashboard/SubjectCard';
import StudyAssistant from '@/components/chat/StudyAssistant';
import { 
  Zap, 
  Trophy, 
  BookOpen, 
  Target, 
  TrendingUp,
  Clock,
  Star,
  Flame,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Achievement = Database['public']['Tables']['achievements']['Row'];

export default function StudentDashboard() {
  const { profile, progress } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievementIds, setUserAchievementIds] = useState<string[]>([]);
  const [examStats, setExamStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    bestSubject: 'Mathematics',
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch achievements
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*')
        .limit(6);
      
      if (achievementsData) {
        setAchievements(achievementsData);
      }

      // Fetch user achievements
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id');
      
      if (userAchievements) {
        setUserAchievementIds(userAchievements.map(ua => ua.achievement_id));
      }

      // Fetch exam stats
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('score, total_questions');
      
      if (attempts && attempts.length > 0) {
        const avgScore = attempts.reduce((acc, a) => acc + (a.score / a.total_questions) * 100, 0) / attempts.length;
        setExamStats({
          totalAttempts: attempts.length,
          averageScore: Math.round(avgScore),
          bestSubject: 'Mathematics',
        });
      }
    };

    fetchData();
  }, []);

  const xp = progress?.xp || 0;
  const streak = progress?.streak || 0;
  const level = Math.floor(xp / 100) + 1;
  const dailyGoal = 50;
  const dailyProgress = Math.min((xp % 100) / dailyGoal * 100, 100);

  // Subject progress (mock data for now)
  const subjects = [
    { subject: 'Mathematics', progress: 75, examCount: 12 },
    { subject: 'Science', progress: 60, examCount: 10 },
    { subject: 'English', progress: 85, examCount: 15 },
    { subject: 'Social Studies', progress: 45, examCount: 8 },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Hey {profile?.name?.split(' ')[0] || 'Champion'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {streak > 0 
                ? `You're on fire! ${streak} day streak 🔥`
                : "Ready to crush some exams today?"}
            </p>
          </div>
          
          {/* Daily Goal Progress */}
          <div className="flex items-center gap-4 bg-card rounded-2xl border border-border p-4">
            <ProgressRing progress={dailyProgress} size={80} strokeWidth={6}>
              <div className="text-center">
                <span className="text-lg font-bold text-foreground">{Math.round(dailyProgress)}%</span>
              </div>
            </ProgressRing>
            <div>
              <p className="text-sm text-muted-foreground">Daily Goal</p>
              <p className="font-semibold text-foreground">{Math.round(xp % dailyGoal)}/{dailyGoal} XP</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total XP"
            value={xp.toLocaleString()}
            subtitle={`Level ${level}`}
            icon={Zap}
            gradient="from-violet-500 to-purple-600"
          />
          <StatCard
            title="Day Streak"
            value={streak}
            subtitle={streak > 0 ? "Keep it up!" : "Start today"}
            icon={Flame}
            gradient="from-orange-500 to-red-500"
          />
          <StatCard
            title="Exams Taken"
            value={examStats.totalAttempts}
            subtitle={`Avg: ${examStats.averageScore}%`}
            icon={BookOpen}
            gradient="from-blue-500 to-cyan-500"
          />
          <StatCard
            title="Achievements"
            value={userAchievementIds.length}
            subtitle={`of ${achievements.length}`}
            icon={Trophy}
            gradient="from-amber-500 to-yellow-500"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <QuickActionCard
              title="Practice Mode"
              description="Study at your own pace"
              icon={Target}
              href="/exams?mode=practice"
              gradient="from-emerald-500 to-teal-500"
            />
            <QuickActionCard
              title="Exam Mode"
              description="Test under real conditions"
              icon={Clock}
              href="/exams?mode=simulation"
              gradient="from-violet-500 to-purple-600"
            />
            <QuickActionCard
              title="Review Mistakes"
              description="Learn from your errors"
              icon={TrendingUp}
              href="/review"
              gradient="from-orange-500 to-amber-500"
            />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Subjects */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Your Subjects</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {subjects.map((subject) => (
                  <SubjectCard
                    key={subject.subject}
                    subject={subject.subject}
                    progress={subject.progress}
                    examCount={subject.examCount}
                    level={profile?.level || 'PLE'}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Streak & Achievements */}
          <div className="space-y-6">
            <StreakCalendar 
              streak={streak} 
              lastExamDate={progress?.last_exam_date || undefined} 
            />
            
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Recent Achievements</h3>
                <a href="/achievements" className="text-sm text-primary hover:underline">
                  View all
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {achievements.slice(0, 4).map((achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    name={achievement.name}
                    description={achievement.description}
                    icon={achievement.icon || 'trophy'}
                    earned={userAchievementIds.includes(achievement.id)}
                    xpReward={achievement.xp_reward}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Footer */}
        <div className="bg-gradient-to-r from-primary/10 via-violet-500/10 to-purple-500/10 rounded-2xl p-6 text-center">
          <p className="text-lg font-medium text-foreground">
            {examStats.averageScore >= 80 
              ? "🌟 You're doing amazing! Keep up the excellent work!"
              : examStats.averageScore >= 60
              ? "💪 Great progress! A little more practice and you'll be a master!"
              : "🚀 Every expert was once a beginner. Keep practicing!"}
          </p>
        </div>

        {/* AI Study Assistant */}
        <StudyAssistant />
      </div>
    </DashboardLayout>
  );
}
