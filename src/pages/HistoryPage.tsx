import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Clock, Trophy, Target, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type ExamAttempt = Database['public']['Tables']['exam_attempts']['Row'] & {
  exams: Database['public']['Tables']['exams']['Row'] | null;
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!profile?.id) return;

      const { data } = await supabase
        .from('exam_attempts')
        .select('*, exams(*)')
        .eq('user_id', profile.id)
        .order('completed_at', { ascending: false });

      if (data) {
        setAttempts(data as ExamAttempt[]);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [profile?.id]);

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-emerald-500';
    if (percentage >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'bg-emerald-500/10';
    if (percentage >= 60) return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

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
          <p className="text-muted-foreground mt-1">Review your past exam attempts</p>
        </div>

        {attempts.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No exams taken yet</h3>
            <p className="text-muted-foreground mb-6">Start practicing to see your history here</p>
            <Button onClick={() => navigate('/exams')}>Browse Exams</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group"
                onClick={() => navigate(`/exam/${attempt.exam_id}/results/${attempt.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        attempt.mode === 'practice' ? 'bg-blue-500/10 text-blue-500' : 'bg-violet-500/10 text-violet-500'
                      )}>
                        {attempt.mode === 'practice' ? 'Practice' : 'Simulation'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(attempt.completed_at), 'PPp')}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {attempt.exams?.title || 'Unknown Exam'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {attempt.exams?.subject} • {attempt.exams?.level}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className={cn(
                        'w-16 h-16 rounded-xl flex items-center justify-center',
                        getScoreBg(attempt.score, attempt.total_questions)
                      )}>
                        <span className={cn('text-2xl font-bold', getScoreColor(attempt.score, attempt.total_questions))}>
                          {Math.round((attempt.score / attempt.total_questions) * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {attempt.score}/{attempt.total_questions}
                      </p>
                    </div>

                    {attempt.time_taken && (
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                          <Clock className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.floor(attempt.time_taken / 60)}m
                        </p>
                      </div>
                    )}

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
