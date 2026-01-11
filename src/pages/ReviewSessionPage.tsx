import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Card from '@/components/common/Card';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Brain, 
  Trophy,
  Loader2,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fireConfetti } from '@/hooks/useConfetti';
import type { Database } from '@/integrations/supabase/types';

type QuestionHistory = Database['public']['Tables']['question_history']['Row'];
type QuestionPart = Database['public']['Tables']['question_parts']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];
type Exam = Database['public']['Tables']['exams']['Row'];

interface ReviewItem {
  history: QuestionHistory;
  part: QuestionPart;
  question: Question;
  exam: Exam;
}

export default function ReviewSessionPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [sessionComplete, setSessionComplete] = useState(false);

  useEffect(() => {
    const fetchDueQuestions = async () => {
      if (!user?.id) return;

      // Fetch question history where next_review <= now
      const { data: historyData, error: historyError } = await supabase
        .from('question_history')
        .select('*')
        .eq('user_id', user.id)
        .lte('next_review', new Date().toISOString())
        .limit(20);

      if (historyError || !historyData || historyData.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch the question parts
      const partIds = historyData.map(h => h.question_part_id);
      const { data: partsData } = await supabase
        .from('question_parts')
        .select('*')
        .in('id', partIds);

      if (!partsData) {
        setLoading(false);
        return;
      }

      // Fetch the questions
      const questionIds = [...new Set(partsData.map(p => p.question_id))];
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);

      if (!questionsData) {
        setLoading(false);
        return;
      }

      // Fetch the exams
      const examIds = [...new Set(questionsData.map(q => q.exam_id))];
      const { data: examsData } = await supabase
        .from('exams')
        .select('*')
        .in('id', examIds);

      if (!examsData) {
        setLoading(false);
        return;
      }

      // Build review items
      const items: ReviewItem[] = historyData.map(history => {
        const part = partsData.find(p => p.id === history.question_part_id)!;
        const question = questionsData.find(q => q.id === part.question_id)!;
        const exam = examsData.find(e => e.id === question.exam_id)!;
        return { history, part, question, exam };
      }).filter(item => item.part && item.question && item.exam);

      setReviewItems(items);
      setLoading(false);
    };

    fetchDueQuestions();
  }, [user?.id]);

  // SM-2 Algorithm variant for calculating next review
  const calculateNextReview = (isCorrect: boolean, currentStreak: number): { nextReview: Date; newStreak: number } => {
    const now = new Date();
    let newStreak: number;
    let intervalHours: number;

    if (isCorrect) {
      newStreak = currentStreak + 1;
      // Exponential backoff: 1 day, 3 days, 7 days, 14 days, 30 days, etc.
      switch (newStreak) {
        case 1: intervalHours = 24; break;
        case 2: intervalHours = 72; break;
        case 3: intervalHours = 168; break; // 7 days
        case 4: intervalHours = 336; break; // 14 days
        case 5: intervalHours = 720; break; // 30 days
        default: intervalHours = Math.min(newStreak * 168, 2160); break; // Max 90 days
      }
    } else {
      newStreak = 0;
      intervalHours = 1; // Review again in 1 hour
    }

    const nextReview = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    return { nextReview, newStreak };
  };

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[,\s]+/g, ' ')
      .replace(/sh\.?\s*/gi, '')
      .replace(/°|degrees?/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/['"]/g, '')
      .replace(/\./g, '')
      .trim();
  };

  const extractNumber = (text: string): number | null => {
    const cleaned = text.replace(/[,\s]/g, '').replace(/sh\.?/gi, '');
    const match = cleaned.match(/-?\d+\.?\d*/);
    return match ? parseFloat(match[0]) : null;
  };

  const checkAnswer = (userAnswer: string, correctAnswer: string, answerType: string): boolean => {
    if (!userAnswer.trim()) return false;
    
    const normalizedUser = normalizeText(userAnswer);
    const normalizedCorrect = normalizeText(correctAnswer);
    
    if (normalizedUser === normalizedCorrect) return true;
    
    if (answerType === 'numeric') {
      const userNum = extractNumber(userAnswer);
      const correctNum = extractNumber(correctAnswer);
      if (userNum !== null && correctNum !== null) {
        return Math.abs(userNum - correctNum) < 0.01;
      }
    }
    
    const userNum = extractNumber(userAnswer);
    const correctNum = extractNumber(correctAnswer);
    if (userNum !== null && correctNum !== null && Math.abs(userNum - correctNum) < 0.01) {
      return true;
    }
    
    if (normalizedCorrect.length > 3) {
      if (normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser)) {
        return true;
      }
    }
    
    return false;
  };

  const handleSubmitAnswer = useCallback(async () => {
    if (!user?.id || currentIndex >= reviewItems.length) return;

    const currentItem = reviewItems[currentIndex];
    const correct = checkAnswer(answer, currentItem.part.answer, currentItem.part.answer_type);
    setIsCorrect(correct);
    setShowResult(true);

    // Update session stats
    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));

    // Calculate next review using SM-2 variant
    const { nextReview, newStreak } = calculateNextReview(correct, currentItem.history.streak);

    // Update question history
    await supabase
      .from('question_history')
      .update({
        last_attempt: new Date().toISOString(),
        is_correct: correct,
        streak: newStreak,
        next_review: nextReview.toISOString(),
      })
      .eq('id', currentItem.history.id);

    if (correct) {
      toast.success('+5 XP for correct answer!', {
        icon: <Zap className="w-4 h-4 text-amber-500" />,
      });
    }
  }, [user?.id, currentIndex, reviewItems, answer]);

  const handleNext = () => {
    if (currentIndex < reviewItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnswer('');
      setShowResult(false);
    } else {
      // Session complete
      setSessionComplete(true);
      if (sessionStats.correct > sessionStats.total / 2) {
        fireConfetti();
      }
    }
  };

  const handleExit = () => {
    navigate('/dashboard/student');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (reviewItems.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">All Caught Up!</h1>
          <p className="text-muted-foreground mb-6">
            No questions are due for review right now. Keep practicing exams to build up your review queue!
          </p>
          <Button onClick={handleExit}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (sessionComplete) {
    const percentage = Math.round((sessionStats.correct / sessionStats.total) * 100);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className={cn(
            "w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center",
            percentage >= 70 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
          )}>
            <span className={cn(
              "text-2xl font-bold",
              percentage >= 70 ? "text-emerald-600" : "text-amber-600"
            )}>
              {percentage}%
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Review Complete!</h1>
          <p className="text-muted-foreground mb-2">
            You got {sessionStats.correct} out of {sessionStats.total} correct.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {percentage >= 70 
              ? "Great memory retention! Keep it up!"
              : "The questions you missed will appear again soon for more practice."}
          </p>
          <Button onClick={handleExit}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const currentItem = reviewItems[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={handleExit}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Review
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium">
                {currentIndex + 1} / {reviewItems.length}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Streak: {currentItem.history.streak}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-muted">
        <div 
          className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / reviewItems.length) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-6">
          {/* Question context */}
          <div className="mb-4 pb-4 border-b border-border">
            <span className="text-xs text-muted-foreground">
              {currentItem.exam.title} • {currentItem.exam.subject}
            </span>
          </div>

          {/* Question text */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">{currentItem.question.text}</h2>
            {currentItem.question.image_url && (
              <img 
                src={currentItem.question.image_url} 
                alt="Question diagram"
                className="max-w-full h-auto rounded-lg border border-border mb-4"
              />
            )}
            <p className="text-foreground font-medium">{currentItem.part.text}</p>
            <span className="text-xs text-muted-foreground">({currentItem.part.marks} mark{currentItem.part.marks !== 1 ? 's' : ''})</span>
          </div>

          {/* Answer input */}
          {!showResult && (
            <div className="space-y-4">
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="min-h-[100px]"
                autoFocus
              />
              <Button 
                onClick={handleSubmitAnswer}
                disabled={!answer.trim()}
                className="w-full"
              >
                Check Answer
              </Button>
            </div>
          )}

          {/* Result feedback */}
          {showResult && (
            <div className="space-y-4">
              <div className={cn(
                "p-4 rounded-xl flex items-start gap-3",
                isCorrect 
                  ? "bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500/30" 
                  : "bg-red-100 dark:bg-red-900/30 border border-red-500/30"
              )}>
                {isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={cn(
                    "font-semibold",
                    isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                  )}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your answer: <span className="font-medium">{answer}</span>
                  </p>
                  {!isCorrect && (
                    <p className="text-sm mt-1">
                      Correct answer: <span className="font-medium text-foreground">{currentItem.part.answer}</span>
                    </p>
                  )}
                </div>
              </div>

              {currentItem.part.explanation && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-500/20">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">Explanation</p>
                  <MarkdownRenderer content={currentItem.part.explanation} />
                </div>
              )}

              <Button onClick={handleNext} className="w-full">
                {currentIndex < reviewItems.length - 1 ? (
                  <>
                    Next Question
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  'Finish Review'
                )}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
