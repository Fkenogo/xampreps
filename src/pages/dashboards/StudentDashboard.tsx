import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listStudentDashboardSummaryFirebase,
  type FirebaseAchievement,
} from '@/integrations/firebase/student';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import ProgressRing from '@/components/dashboard/ProgressRing';
import StreakCalendar from '@/components/dashboard/StreakCalendar';
import AchievementBadge from '@/components/dashboard/AchievementBadge';
import QuickActionCard from '@/components/dashboard/QuickActionCard';
import SubjectCard from '@/components/dashboard/SubjectCard';
import QuickExamFinder from '@/components/dashboard/QuickExamFinder';
import WeeklyProgressChart from '@/components/dashboard/WeeklyProgressChart';
import RecentActivity from '@/components/dashboard/RecentActivity';
import PersonalizedInsights from '@/components/dashboard/PersonalizedInsights';
import StudyAssistant from '@/components/chat/StudyAssistant';
import {
  Zap, 
  Trophy, 
  BookOpen, 
  Target, 
  TrendingUp,
  Clock,
  Flame,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
type Achievement = FirebaseAchievement;

interface SubjectProgress {
  subject: string;
  progress: number;
  examCount: number;
}

export default function StudentDashboard() {
  const { profile, progress } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievementIds, setUserAchievementIds] = useState<string[]>([]);
  const [examStats, setExamStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    bestSubject: 'Mathematics',
  });
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const summary = await listStudentDashboardSummaryFirebase();
        if (summary.ok) {
          setAchievements(summary.achievements);
          setUserAchievementIds(summary.userAchievementIds || []);
          setExamStats(
            summary.examStats || {
              totalAttempts: 0,
              averageScore: 0,
              bestSubject: 'Mathematics',
            }
          );
          setSubjectProgress(summary.subjectProgress || []);
        }
      } catch (error) {
        console.error('Failed to fetch Firebase student summary:', error);
        setSubjectProgress([
          { subject: 'Mathematics', progress: 0, examCount: 0 },
          { subject: 'Science', progress: 0, examCount: 0 },
          { subject: 'English', progress: 0, examCount: 0 },
          { subject: 'Social Studies', progress: 0, examCount: 0 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const xp = progress?.xp || 0;
  const streak = progress?.streak || 0;
  const level = Math.floor(xp / 100) + 1;
  const dailyGoal = 50;
  const dailyProgress = Math.min((xp % 100) / dailyGoal * 100, 100);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header with Animation */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 opacity-0 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              Hey {profile?.name?.split(' ')[0] || 'Champion'}! 
              <span className="animate-bounce-soft inline-block">👋</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {streak > 0 
                ? <span className="flex items-center gap-1">You're on fire! {streak} day streak <Flame className="w-4 h-4 text-orange-500 animate-pulse-glow" /></span>
                : "Ready to crush some exams today?"}
            </p>
          </div>
          
          {/* Daily Goal Progress */}
          <div className="flex items-center gap-4 bg-card rounded-2xl border border-border p-4 animate-scale-in animation-delay-200">
            <ProgressRing progress={dailyProgress} size={80} strokeWidth={6} showGlow>
              <div className="text-center">
                <span className="text-lg font-bold text-foreground">{Math.round(dailyProgress)}%</span>
              </div>
            </ProgressRing>
            <div>
              <p className="text-sm text-muted-foreground">Daily Goal</p>
              <p className="font-semibold text-foreground">{Math.round(xp % dailyGoal)}/{dailyGoal} XP</p>
              {dailyProgress >= 100 && (
                <span className="text-xs text-emerald-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Completed!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row with Staggered Animation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total XP"
            value={xp}
            subtitle={`Level ${level}`}
            icon={Zap}
            gradient="from-violet-500 to-purple-600"
            delay={100}
          />
          <StatCard
            title="Day Streak"
            value={streak}
            subtitle={streak > 0 ? "Keep it up!" : "Start today"}
            icon={Flame}
            gradient="from-orange-500 to-red-500"
            delay={200}
          />
          <StatCard
            title="Exams Taken"
            value={examStats.totalAttempts}
            subtitle={`Avg: ${examStats.averageScore}%`}
            icon={BookOpen}
            gradient="from-blue-500 to-cyan-500"
            delay={300}
          />
          <StatCard
            title="Achievements"
            value={userAchievementIds.length}
            subtitle={`of ${achievements.length}`}
            icon={Trophy}
            gradient="from-amber-500 to-yellow-500"
            delay={400}
          />
        </div>

        {/* Quick Actions with Hover Effects */}
        <div className="opacity-0 animate-slide-up animation-delay-300">
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

        {/* Quick Exam Finder */}
        <QuickExamFinder showRecommendations maxResults={4} />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Subjects & Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subject Progress */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Your Subjects</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {subjectProgress.map((subject, index) => (
                  <SubjectCard
                    key={subject.subject}
                    subject={subject.subject}
                    progress={subject.progress}
                    examCount={subject.examCount}
                    level={profile?.level || 'PLE'}
                    delay={index * 100}
                  />
                ))}
              </div>
            </div>

            {/* Weekly Progress & Insights */}
            <div className="grid md:grid-cols-2 gap-4">
              <WeeklyProgressChart />
              <PersonalizedInsights />
            </div>
          </div>

          {/* Right Column - Activity & Achievements */}
          <div className="space-y-6">
            <StreakCalendar 
              streak={streak} 
              lastExamDate={progress?.last_exam_date || undefined} 
            />
            
            <RecentActivity limit={5} />
            
            <div className="bg-card rounded-2xl border border-border p-6 opacity-0 animate-fade-in animation-delay-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Recent Achievements</h3>
                <a href="/achievements" className="text-sm text-primary hover:underline">
                  View all
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {achievements.slice(0, 4).map((achievement, index) => (
                  <div
                    key={achievement.id}
                    className="opacity-0 animate-scale-in"
                    style={{ animationDelay: `${600 + index * 100}ms` }}
                  >
                    <AchievementBadge
                      name={achievement.name}
                      description={achievement.description}
                      icon={achievement.icon || 'trophy'}
                      earned={userAchievementIds.includes(achievement.id)}
                      xpReward={achievement.xp_reward}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Footer with Animation */}
        <div className={cn(
          "bg-gradient-to-r from-primary/10 via-violet-500/10 to-purple-500/10 rounded-2xl p-6 text-center",
          "opacity-0 animate-slide-up animation-delay-600",
          "hover:from-primary/15 hover:via-violet-500/15 hover:to-purple-500/15 transition-colors"
        )}>
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
