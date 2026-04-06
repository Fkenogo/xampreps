import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { listReviewDueQuestionsFirebase } from '@/integrations/firebase/content';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseDb } from '@/integrations/firebase/client';
import { Button } from '@/components/ui/button';
import { Brain, RefreshCw, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpacedRepetitionCardProps {
  className?: string;
}

export default function SpacedRepetitionCard({ className }: SpacedRepetitionCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dueCount, setDueCount] = useState(0);
  const [reviewStreak, setReviewStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [masteredCount, setMasteredCount] = useState(0);

  useEffect(() => {
    const fetchReviewData = async () => {
      if (!user?.id) return;

      const dueResult = await listReviewDueQuestionsFirebase(100);
      const dueQuestions = dueResult.items || [];
      setDueCount(dueQuestions.length);
      const totalStreak = dueQuestions.reduce((acc, item) => acc + (item.history.streak || 0), 0);
      setReviewStreak(dueQuestions.length > 0 ? Math.round(totalStreak / dueQuestions.length) : 0);

      const db = getFirebaseDb();
      const masteredByUserId = await getDocs(query(
        collection(db, 'question_history'),
        where('userId', '==', user.id),
        where('streak', '>=', 5)
      ));
      const masteredByUserSnake = masteredByUserId.empty ? await getDocs(query(
        collection(db, 'question_history'),
        where('user_id', '==', user.id),
        where('streak', '>=', 5)
      )) : masteredByUserId;
      setMasteredCount(masteredByUserSnake.size);

      setLoading(false);
    };

    fetchReviewData();
  }, [user?.id]);

  const handleStartReview = () => {
    navigate('/review');
  };

  if (loading) {
    return (
      <div className={cn(
        "bg-card rounded-2xl border border-border p-6 animate-pulse",
        className
      )}>
        <div className="h-6 bg-muted rounded w-1/2 mb-4" />
        <div className="h-10 bg-muted rounded w-1/3" />
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 rounded-2xl border border-violet-500/20 p-6 relative overflow-hidden",
      className
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-violet-500/20 rounded-xl">
            <Brain className="w-5 h-5 text-violet-500" />
          </div>
          <h3 className="font-semibold text-foreground">Spaced Repetition</h3>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className={cn(
              "text-2xl font-bold",
              dueCount > 0 ? "text-amber-500" : "text-emerald-500"
            )}>
              {dueCount}
            </div>
            <p className="text-xs text-muted-foreground">Due Now</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-violet-500">
              {masteredCount}
            </div>
            <p className="text-xs text-muted-foreground">Mastered</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {reviewStreak}
            </div>
            <p className="text-xs text-muted-foreground">Avg Streak</p>
          </div>
        </div>

        {dueCount > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
              <span>{dueCount} question{dueCount !== 1 ? 's' : ''} ready for review</span>
            </div>
            <Button 
              onClick={handleStartReview}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Start Review Session
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span>All caught up! Great work!</span>
            </div>
            <Button 
              variant="outline"
              onClick={handleStartReview}
              className="w-full border-violet-500/30 text-violet-600 hover:bg-violet-500/10"
            >
              Practice Anyway
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Questions you answer correctly will be spaced further apart
        </p>
      </div>
    </div>
  );
}
