import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, Clock } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { listExamHistoryFirebase, type FirebaseExamHistoryItem } from '@/integrations/firebase/exams';
import { cn } from '@/lib/utils';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [attempts, setAttempts] = useState<FirebaseExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      try {
        const result = await listExamHistoryFirebase(profile.id);
        setAttempts(result.items || []);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [profile?.id]);

  function getScoreColor(score: number, total: number) {
    const percentage = total > 0 ? (score / total) * 100 : 0;
    if (percentage >= 80) return 'text-emerald-500';
    if (percentage >= 60) return 'text-amber-500';
    return 'text-rose-500';
  }

  function getScoreBg(score: number, total: number) {
    const percentage = total > 0 ? (score / total) * 100 : 0;
    if (percentage >= 80) return 'bg-emerald-500/10';
    if (percentage >= 60) return 'bg-amber-500/10';
    return 'bg-rose-500/10';
  }

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
          <h1 className="text-3xl font-bold text-foreground">Exam History</h1>
          <p className="text-muted-foreground mt-1">Your V2 exam attempts live here now.</p>
        </div>

        {attempts.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No V2 attempts yet</h3>
            <p className="text-muted-foreground mb-6">Take the seeded V2 fixture exam to start building history.</p>
            <Button onClick={() => navigate('/exams')}>Browse Exams</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group"
                onClick={() => navigate(`/exams/${attempt.examId}/results/${attempt.id}`)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {attempt.mode}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {attempt.completedAt ? format(new Date(attempt.completedAt), 'PPp') : 'Pending review'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {attempt.exam?.title || 'Untitled V2 Exam'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {attempt.exam?.subject} • {attempt.exam?.level} • status: {attempt.status}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div
                        className={cn(
                          'w-16 h-16 rounded-xl flex items-center justify-center',
                          getScoreBg(attempt.score, attempt.totalQuestions),
                        )}
                      >
                        <span className={cn('text-2xl font-bold', getScoreColor(attempt.score, attempt.totalQuestions))}>
                          {attempt.totalQuestions > 0
                            ? Math.round((attempt.score / attempt.totalQuestions) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {attempt.score}/{attempt.totalQuestions}
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                        <Clock className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.floor(attempt.timeTaken / 60)}m
                      </p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
