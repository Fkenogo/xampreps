import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listExamHistoryFirebase } from '@/integrations/firebase/exams';
import { Lightbulb, TrendingUp, Target, Award, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Insight {
  id: string;
  icon: React.ReactNode;
  text: string;
  type: 'success' | 'tip' | 'goal' | 'achievement';
}

interface PersonalizedInsightsProps {
  className?: string;
}

interface AttemptWithExam {
  score: number;
  totalQuestions: number;
  completedAt: string;
  exam: { subject: string | null } | null;
}

export default function PersonalizedInsights({ className }: PersonalizedInsightsProps) {
  const { profile, progress } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateInsights = async () => {
      if (!profile?.id) return;

      const newInsights: Insight[] = [];

      const historyResult = await listExamHistoryFirebase();
      const typedAttempts = ((historyResult.items || []).slice(0, 20).map((item) => ({
        score: item.score,
        totalQuestions: item.totalQuestions,
        completedAt: item.completedAt,
        exam: item.exam ? { subject: item.exam.subject } : null,
      })) as AttemptWithExam[]) || [];

      if (typedAttempts.length > 0) {
        // Calculate subject performance
        const subjectScores: Record<string, { total: number; count: number }> = {};
        typedAttempts.forEach((a) => {
          const subject = a.exam?.subject || 'Unknown';
          if (!subjectScores[subject]) {
            subjectScores[subject] = { total: 0, count: 0 };
          }
          subjectScores[subject].total += (a.score / a.totalQuestions) * 100;
          subjectScores[subject].count += 1;
        });

        // Find best and weakest subjects
        let bestSubject = { name: '', score: 0 };
        let weakestSubject = { name: '', score: 100 };

        Object.entries(subjectScores).forEach(([subject, data]) => {
          const avg = data.total / data.count;
          if (avg > bestSubject.score) {
            bestSubject = { name: subject, score: avg };
          }
          if (avg < weakestSubject.score) {
            weakestSubject = { name: subject, score: avg };
          }
        });

        // Best subject insight
        if (bestSubject.name && bestSubject.score > 0) {
          newInsights.push({
            id: 'best-subject',
            icon: <Award className="w-4 h-4 text-amber-500" />,
            text: `You're crushing it in ${bestSubject.name}! ${Math.round(bestSubject.score)}% average score 🏆`,
            type: 'success',
          });
        }

        // Improvement area insight
        if (weakestSubject.name && weakestSubject.score < 100 && weakestSubject.name !== bestSubject.name) {
          newInsights.push({
            id: 'improve-subject',
            icon: <Target className="w-4 h-4 text-blue-500" />,
            text: `Focus on ${weakestSubject.name} to boost your overall score. Practice makes perfect!`,
            type: 'tip',
          });
        }

        // Recent improvement check
        const recentAttempts = typedAttempts.slice(0, 5);
        const olderAttempts = typedAttempts.slice(5, 10);
        
        if (recentAttempts.length >= 3 && olderAttempts.length >= 3) {
          const recentAvg = recentAttempts.reduce((a, b) => a + (b.score / b.totalQuestions) * 100, 0) / recentAttempts.length;
          const olderAvg = olderAttempts.reduce((a, b) => a + (b.score / b.totalQuestions) * 100, 0) / olderAttempts.length;
          
          if (recentAvg > olderAvg + 5) {
            newInsights.push({
              id: 'improvement',
              icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
              text: `You've improved ${Math.round(recentAvg - olderAvg)}% from your earlier attempts! Keep it up! 📈`,
              type: 'success',
            });
          }
        }
      }

      // XP and level insights
      const xp = progress?.xp || 0;
      const level = Math.floor(xp / 100) + 1;
      const xpToNextLevel = 100 - (xp % 100);

      if (xpToNextLevel <= 30) {
        newInsights.push({
          id: 'level-up',
          icon: <Sparkles className="w-4 h-4 text-purple-500" />,
          text: `Only ${xpToNextLevel} XP to Level ${level + 1}! Complete one more exam to level up! ⭐`,
          type: 'goal',
        });
      }

      // Streak insights
      const streak = progress?.streak || 0;
      if (streak >= 7) {
        newInsights.push({
          id: 'streak',
          icon: <Award className="w-4 h-4 text-orange-500" />,
          text: `Amazing ${streak}-day streak! You're building great study habits! 🔥`,
          type: 'achievement',
        });
      } else if (streak > 0 && streak < 7) {
        newInsights.push({
          id: 'streak-goal',
          icon: <Target className="w-4 h-4 text-orange-500" />,
          text: `${7 - streak} more days to reach a 7-day streak! Keep the momentum going!`,
          type: 'goal',
        });
      }

      // Default insight if none generated
      if (newInsights.length === 0) {
        newInsights.push({
          id: 'default',
          icon: <Lightbulb className="w-4 h-4 text-amber-500" />,
          text: 'Start practicing to get personalized insights about your progress!',
          type: 'tip',
        });
      }

      setInsights(newInsights.slice(0, 3));
      setLoading(false);
    };

    generateInsights();
  }, [profile?.id, progress]);

  const getTypeStyles = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'tip':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'goal':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'achievement':
        return 'bg-amber-500/10 border-amber-500/20';
      default:
        return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <div className={cn('bg-card rounded-2xl border border-border p-6', className)}>
        <h3 className="font-semibold text-foreground mb-4">Insights</h3>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-card rounded-2xl border border-border p-6 animate-fade-in', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-foreground">Personalized Insights</h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={insight.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl border transition-all',
              getTypeStyles(insight.type),
              'opacity-0 animate-slide-up'
            )}
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className="mt-0.5">{insight.icon}</div>
            <p className="text-sm text-foreground">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
