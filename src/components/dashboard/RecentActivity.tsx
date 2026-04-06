import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { listExamHistoryFirebase } from '@/integrations/firebase/exams';
import { Clock, CheckCircle, XCircle, Trophy, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
type ExamAttempt = {
  id: string;
  exam_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  exams: { title: string | null } | null;
};

interface RecentActivityProps {
  limit?: number;
  className?: string;
}

export default function RecentActivity({ limit = 5, className }: RecentActivityProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttempts = async () => {
      if (!profile?.id) return;

      const history = await listExamHistoryFirebase();
      setAttempts(
        (history.items || []).slice(0, limit).map((item) => ({
          id: item.id,
          exam_id: item.examId,
          score: item.score,
          total_questions: item.totalQuestions,
          completed_at: item.completedAt,
          exams: item.exam ? { title: item.exam.title } : null,
        }))
      );
      setLoading(false);
    };

    fetchAttempts();
  }, [profile?.id, limit]);

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-emerald-500';
    if (percentage >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return <Trophy className="w-4 h-4 text-emerald-500" />;
    if (percentage >= 60) return <CheckCircle className="w-4 h-4 text-amber-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  if (loading) {
    return (
      <div className={cn('bg-card rounded-2xl border border-border p-6', className)}>
        <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-card rounded-2xl border border-border p-6 animate-fade-in', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
        <button
          onClick={() => navigate('/history')}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {attempts.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No exams taken yet</p>
          <button
            onClick={() => navigate('/exams')}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Start your first exam
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {attempts.map((attempt, index) => (
            <div
              key={attempt.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group',
                'opacity-0 animate-slide-in-right'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => navigate(`/exam/${attempt.exam_id}/results/${attempt.id}`)}
            >
              {getScoreIcon(attempt.score, attempt.total_questions)}
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {attempt.exams?.title || 'Unknown Exam'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(attempt.completed_at), { addSuffix: true })}
                </p>
              </div>

              <div className="text-right">
                <p className={cn('font-bold text-sm', getScoreColor(attempt.score, attempt.total_questions))}>
                  {Math.round((attempt.score / attempt.total_questions) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {attempt.score}/{attempt.total_questions}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
