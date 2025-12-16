import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Clock, 
  Target, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type ExamAttempt = Database['public']['Tables']['exam_attempts']['Row'];
type Exam = Database['public']['Tables']['exams']['Row'];

export default function ExamResultsPage() {
  const { examId, attemptId } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!attemptId || !examId) return;

      const { data: attemptData } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('id', attemptId)
        .maybeSingle();

      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .maybeSingle();

      if (attemptData) setAttempt(attemptData);
      if (examData) setExam(examData);
      setLoading(false);
    };

    fetchResults();
  }, [attemptId, examId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!attempt || !exam) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">Results not found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
  const isPassing = percentage >= 50;
  const isExcellent = percentage >= 80;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{exam.title}</h1>
            <p className="text-muted-foreground">{exam.subject} • {exam.level}</p>
          </div>
        </div>

        {/* Score Card */}
        <div className={cn(
          'rounded-2xl border p-8 text-center',
          isExcellent ? 'bg-emerald-500/10 border-emerald-500/30' :
          isPassing ? 'bg-amber-500/10 border-amber-500/30' :
          'bg-red-500/10 border-red-500/30'
        )}>
          <div className={cn(
            'w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6',
            isExcellent ? 'bg-emerald-500/20' :
            isPassing ? 'bg-amber-500/20' :
            'bg-red-500/20'
          )}>
            <span className={cn(
              'text-5xl font-bold',
              isExcellent ? 'text-emerald-500' :
              isPassing ? 'text-amber-500' :
              'text-red-500'
            )}>
              {percentage}%
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isExcellent ? 'Excellent!' : isPassing ? 'Good Job!' : 'Keep Practicing!'}
          </h2>
          <p className="text-muted-foreground">
            You scored {attempt.score} out of {attempt.total_questions} questions correctly
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{attempt.score}</p>
            <p className="text-sm text-muted-foreground">Correct</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{attempt.total_questions - attempt.score}</p>
            <p className="text-sm text-muted-foreground">Incorrect</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {attempt.time_taken ? `${Math.floor(attempt.time_taken / 60)}m` : '--'}
            </p>
            <p className="text-sm text-muted-foreground">Time Taken</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={() => navigate(`/exam/${examId}?mode=${attempt.mode}`)} className="flex-1 gap-2">
            <RotateCcw className="w-4 h-4" />
            Retry Exam
          </Button>
          <Button variant="outline" onClick={() => navigate('/exams')} className="flex-1">
            Browse More Exams
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
