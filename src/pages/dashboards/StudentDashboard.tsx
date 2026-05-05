import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  listStudentDashboardSummaryFirebase,
  type FirebaseAchievement,
} from '@/integrations/firebase/student';
import { listExamHistoryFirebase, type FirebaseExamHistoryItem } from '@/integrations/firebase/exams';
import { listExamsFirebase, type FirebaseExam } from '@/integrations/firebase/content';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AchievementBadge from '@/components/dashboard/AchievementBadge';
import QuickActionCard from '@/components/dashboard/QuickActionCard';
import SubjectCard from '@/components/dashboard/SubjectCard';
import StudyAssistant from '@/components/chat/StudyAssistant';
import StudentLinkCodesPanel from '@/components/identity/StudentLinkCodesPanel';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Flame,
  PlayCircle,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';

type Achievement = FirebaseAchievement;

interface SubjectProgress {
  subject: string;
  progress: number;
  examCount: number;
}

const emptyExamStats = {
  totalAttempts: 0,
  averageScore: 0,
  bestSubject: 'Mathematics',
};

const fallbackSubjects: SubjectProgress[] = [
  { subject: 'Mathematics', progress: 0, examCount: 0 },
  { subject: 'Science', progress: 0, examCount: 0 },
  { subject: 'English', progress: 0, examCount: 0 },
  { subject: 'Social Studies', progress: 0, examCount: 0 },
];

function formatScore(attempt: FirebaseExamHistoryItem) {
  if (attempt.totalQuestions <= 0) return '0%';
  return `${Math.round((attempt.score / attempt.totalQuestions) * 100)}%`;
}

function getScoreTone(attempt: FirebaseExamHistoryItem) {
  if (attempt.totalQuestions <= 0) return 'text-muted-foreground';
  const percentage = (attempt.score / attempt.totalQuestions) * 100;
  if (percentage >= 80) return 'text-emerald-600';
  if (percentage >= 60) return 'text-amber-600';
  return 'text-rose-600';
}

function isWithinPastWeek(completedAt: string | null) {
  if (!completedAt) return false;
  const completedTime = new Date(completedAt).getTime();
  if (Number.isNaN(completedTime)) return false;
  return completedTime >= Date.now() - 7 * 24 * 60 * 60 * 1000;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { profile, progress } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievementIds, setUserAchievementIds] = useState<string[]>([]);
  const [examStats, setExamStats] = useState(emptyExamStats);
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>(fallbackSubjects);
  const [recentAttempts, setRecentAttempts] = useState<FirebaseExamHistoryItem[]>([]);
  const [availableExams, setAvailableExams] = useState<FirebaseExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = profile?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [summary, history, exams] = await Promise.all([
          listStudentDashboardSummaryFirebase(),
          listExamHistoryFirebase(userId),
          listExamsFirebase(),
        ]);

        if (summary.ok) {
          setAchievements(summary.achievements || []);
          setUserAchievementIds(summary.userAchievementIds || []);
          setExamStats(summary.examStats || emptyExamStats);
          setSubjectProgress(summary.subjectProgress?.length ? summary.subjectProgress : fallbackSubjects);
        }

        if (history.ok) {
          setRecentAttempts(history.items || []);
        }

        if (exams.ok) {
          const levelFiltered = (exams.items || []).filter((exam) =>
            profile?.level ? exam.level === profile.level : true,
          );
          setAvailableExams(levelFiltered);
        }
      } catch (error) {
        console.error('[StudentDashboard] Failed to load dashboard data', error);
        setAchievements([]);
        setUserAchievementIds([]);
        setExamStats(emptyExamStats);
        setSubjectProgress(fallbackSubjects);
        setRecentAttempts([]);
        setAvailableExams([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [profile?.id, profile?.level]);

  const xp = progress?.xp || 0;
  const streak = progress?.streak || 0;
  const level = Math.floor(xp / 100) + 1;

  const recentAverage = useMemo(() => {
    const scoredAttempts = recentAttempts.slice(0, 5).filter((attempt) => attempt.totalQuestions > 0);
    if (scoredAttempts.length === 0) return examStats.averageScore;
    const total = scoredAttempts.reduce((sum, attempt) => sum + (attempt.score / attempt.totalQuestions) * 100, 0);
    return Math.round(total / scoredAttempts.length);
  }, [examStats.averageScore, recentAttempts]);

  const attemptsThisWeek = useMemo(
    () => recentAttempts.filter((attempt) => isWithinPastWeek(attempt.completedAt)).length,
    [recentAttempts],
  );

  const weakSubjects = useMemo(() => {
    const attemptedSubjects = subjectProgress.filter((subject) => subject.examCount > 0);
    return [...attemptedSubjects].sort((a, b) => a.progress - b.progress).slice(0, 3);
  }, [subjectProgress]);

  const focusSubject = weakSubjects[0]?.subject || recentAttempts[0]?.exam?.subject || null;

  const recommendedExam = useMemo(() => {
    if (availableExams.length === 0) return null;
    if (focusSubject) {
      const subjectMatch = availableExams.find((exam) => exam.subject === focusSubject);
      if (subjectMatch) return subjectMatch;
    }
    return availableExams[0];
  }, [availableExams, focusSubject]);

  const latestAttempt = recentAttempts[0] || null;

  const continueHeading = latestAttempt && recommendedExam
    ? `Stay with ${recommendedExam.subject}`
    : recommendedExam
      ? `Start with ${recommendedExam.subject}`
      : 'Start your next practice session';

  const continueDescription = latestAttempt && recommendedExam
    ? `Your latest score was ${formatScore(latestAttempt)} on ${latestAttempt.exam?.title || 'your recent paper'}. Keep momentum going with ${recommendedExam.title}.`
    : recommendedExam
      ? `${recommendedExam.title} is ready for your level${recommendedExam.year ? ` from ${recommendedExam.year}` : ''}. A focused practice session is the safest next step.`
      : 'Pick a practice paper for your level and start building a fresh score history.';

  const handleStartRecommended = () => {
    if (recommendedExam) {
      navigate(`/exams/${recommendedExam.id}?mode=practice`);
      return;
    }
    navigate('/exams?mode=practice');
  };

  const handleBrowsePractice = () => {
    if (focusSubject && profile?.level) {
      navigate(`/exams?mode=practice&subject=${encodeURIComponent(focusSubject)}&level=${encodeURIComponent(profile.level)}`);
      return;
    }
    navigate('/exams?mode=practice');
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Hey {profile?.name?.split(' ')[0] || 'Champion'}!
          </h1>
          <p className="text-muted-foreground">
            See what to study next and keep your progress moving.
          </p>
        </div>

        <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-card to-card p-6 shadow-sm dark:border-violet-900/50 dark:from-violet-950/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-violet-700 dark:text-violet-200">Continue learning</p>
                <h2 className="text-2xl font-semibold text-foreground">{continueHeading}</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">{continueDescription}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {recommendedExam ? (
                  <>
                    <span>{recommendedExam.subject}</span>
                    <span>•</span>
                    <span>{recommendedExam.year}</span>
                    <span>•</span>
                    <span>{recommendedExam.time_limit} min</span>
                    <span>•</span>
                    <span>{recommendedExam.question_count} questions</span>
                  </>
                ) : (
                  <span>No match yet. You can still start with practice.</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleStartRecommended}
                  className="gap-2 bg-orange-500 text-white hover:bg-orange-600"
                >
                  <PlayCircle className="h-4 w-4" />
                  {recommendedExam ? 'Start Recommended Practice' : 'Start Practice'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBrowsePractice}
                  className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-950/30"
                >
                  <Target className="h-4 w-4" />
                  Browse Practice
                </Button>
              </div>
            </div>

            <div className="grid min-w-full grid-cols-1 gap-3 sm:min-w-[320px] sm:grid-cols-2">
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/20">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest score</p>
                <p className={`mt-2 text-2xl font-semibold ${latestAttempt ? getScoreTone(latestAttempt) : 'text-foreground'}`}>
                  {latestAttempt ? formatScore(latestAttempt) : 'No attempts yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {latestAttempt?.exam?.title || 'Start a practice paper to build your history'}
                </p>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50/70 px-4 py-3 dark:border-orange-900/50 dark:bg-orange-950/20">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Focus next</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {focusSubject || 'Any subject'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {weakSubjects.length > 0
                    ? `${weakSubjects[0].progress}% mastery on your weakest subject right now`
                    : 'Your next focus will show here once you have attempt data'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-900/50 dark:bg-violet-950/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-violet-500" />
              XP
            </div>
            <p className="mt-3 text-3xl font-semibold text-foreground">{xp.toLocaleString()}</p>
            <p className="mt-1 text-sm text-muted-foreground">Level {level}</p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-5 dark:border-orange-900/50 dark:bg-orange-950/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className="h-4 w-4 text-orange-500" />
              Streak
            </div>
            <p className="mt-3 text-3xl font-semibold text-foreground">{streak}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {streak > 0 ? 'Keep the streak alive today' : 'One session starts your streak'}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4 text-emerald-500" />
              Recent Average
            </div>
            <p className="mt-3 text-3xl font-semibold text-foreground">{recentAverage}%</p>
            <p className="mt-1 text-sm text-muted-foreground">Last five scored attempts</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-card p-5 dark:border-violet-900/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-blue-500" />
              Attempts This Week
            </div>
            <p className="mt-3 text-3xl font-semibold text-foreground">{attemptsThisWeek}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {attemptsThisWeek > 0 ? 'Recent activity is building momentum' : 'A practice paper gets this moving'}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-violet-700 dark:text-violet-200">Focus next</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">Weak Subjects</h2>
                <p className="text-sm text-muted-foreground">
                  Start with the subject that needs the most help.
                </p>
              </div>
              {focusSubject ? (
                <Button
                  variant="outline"
                  onClick={handleBrowsePractice}
                  className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-900 dark:text-orange-200 dark:hover:bg-orange-950/30"
                >
                  Focus on {focusSubject}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {fallbackSubjects.slice(0, 2).map((subject) => (
                  <div key={subject.subject} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
                ))}
              </div>
            ) : weakSubjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50/70 p-6 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-100">
                <p className="font-medium">Your focus suggestions will show here soon.</p>
                <p className="mt-2 text-sm text-blue-800/80 dark:text-blue-100/80">
                  Complete a few papers and this section will point you to the subject that needs more work.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {weakSubjects.map((subject, index) => (
                  <SubjectCard
                    key={subject.subject}
                    subject={subject.subject}
                    progress={subject.progress}
                    examCount={subject.examCount}
                    level={profile?.level || 'PLE'}
                    delay={index * 75}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6 dark:border-blue-900/50 dark:bg-blue-950/10">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">Recent Scores</h2>
              <p className="text-sm text-muted-foreground">
                See how your latest papers have been going.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))
              ) : recentAttempts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  No scores yet. Start with practice to build your history.
                </div>
              ) : (
                recentAttempts.slice(0, 5).map((attempt) => (
                  <button
                    key={attempt.id}
                    onClick={() => navigate(`/exams/${attempt.examId}/results/${attempt.id}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {attempt.exam?.title || 'Untitled exam'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.exam?.subject || 'Unknown subject'} • {attempt.mode}
                      </p>
                    </div>
                    <div className="pl-4 text-right">
                      <p className={`text-lg font-semibold ${getScoreTone(attempt)}`}>{formatScore(attempt)}</p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.score}/{attempt.totalQuestions}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
            <p className="text-sm text-muted-foreground">
              Jump straight into your next session.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <QuickActionCard
              title="Practice"
              description="Pick a paper and keep building your score history."
              icon={Target}
              href="/exams?mode=practice"
              gradient="from-orange-500 to-amber-500"
            />
            <QuickActionCard
              title="Mock Exam"
              description="Run a timed session under exam conditions."
              icon={BookOpen}
              href="/exams?mode=simulation"
              gradient="from-violet-500 to-purple-600"
            />
          </div>
        </section>

        <section className="space-y-8 border-t border-violet-200 pt-8 dark:border-violet-900/50">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Achievements</h2>
              <p className="text-sm text-muted-foreground">
                Your milestones stay here without getting in the way of your next step.
              </p>
            </div>

            {achievements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                Achievements will appear as you complete more study activity.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
            )}
          </div>

          <StudentLinkCodesPanel />

          <StudyAssistant />
        </section>
      </div>
    </DashboardLayout>
  );
}
