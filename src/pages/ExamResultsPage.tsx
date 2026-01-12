import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuestionReviewCard from '@/components/exam/QuestionReviewCard';
import { 
  Trophy, 
  Clock, 
  Target, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  RotateCcw,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type ExamAttempt = Database['public']['Tables']['exam_attempts']['Row'];
type Exam = Database['public']['Tables']['exams']['Row'];

interface QuestionPart {
  id: string;
  text: string;
  answer: string;
  marks: number;
  explanation: string | null;
  order_index: number;
}

interface Question {
  id: string;
  question_number: number;
  text: string;
  image_url: string | null;
  question_parts: QuestionPart[];
}

interface UserAnswer {
  partId: string;
  answer: string;
  isCorrect: boolean;
}

export default function ExamResultsPage() {
  const { examId, attemptId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Get user answers from URL params (passed from ExamTakingPage)
  useEffect(() => {
    const answersParam = searchParams.get('answers');
    if (answersParam) {
      try {
        const parsedAnswers = JSON.parse(decodeURIComponent(answersParam));
        setUserAnswers(parsedAnswers);
      } catch (e) {
        console.error('Failed to parse answers:', e);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!attemptId || !examId) return;

      const [attemptRes, examRes, questionsRes] = await Promise.all([
        supabase
          .from('exam_attempts')
          .select('*')
          .eq('id', attemptId)
          .maybeSingle(),
        supabase
          .from('exams')
          .select('*')
          .eq('id', examId)
          .maybeSingle(),
        supabase
          .from('questions')
          .select(`
            id,
            question_number,
            text,
            image_url,
            question_parts (
              id,
              text,
              answer,
              marks,
              explanation,
              order_index
            )
          `)
          .eq('exam_id', examId)
          .order('question_number'),
      ]);

      if (attemptRes.data) setAttempt(attemptRes.data);
      if (examRes.data) setExam(examRes.data);
      if (questionsRes.data) {
        const sortedQuestions = questionsRes.data.map(q => ({
          ...q,
          question_parts: q.question_parts.sort((a, b) => a.order_index - b.order_index),
        }));
        setQuestions(sortedQuestions as Question[]);
      }
      setLoading(false);
    };

    fetchResults();
  }, [attemptId, examId]);

  // Performance breakdown by topic
  const performanceBreakdown = useMemo(() => {
    if (!questions.length || !Object.keys(userAnswers).length) return null;

    let totalCorrect = 0;
    let totalParts = 0;

    questions.forEach(q => {
      const qAnswers = userAnswers[q.id] || [];
      q.question_parts.forEach(part => {
        totalParts++;
        const userAnswer = qAnswers.find(a => a.partId === part.id);
        if (userAnswer?.isCorrect) totalCorrect++;
      });
    });

    return {
      totalCorrect,
      totalParts,
      percentage: totalParts > 0 ? Math.round((totalCorrect / totalParts) * 100) : 0,
    };
  }, [questions, userAnswers]);

  const handleStudyTopic = (subject: string) => {
    navigate(`/exams?subject=${encodeURIComponent(subject)}`);
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
      <div className="max-w-4xl mx-auto space-y-8">
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="review" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Question Review
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
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

            {/* Performance Breakdown */}
            {performanceBreakdown && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Performance Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Parts Correct</span>
                    <span className="font-medium text-foreground">
                      {performanceBreakdown.totalCorrect} / {performanceBreakdown.totalParts}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className={cn(
                        'h-3 rounded-full transition-all',
                        performanceBreakdown.percentage >= 80 ? 'bg-emerald-500' :
                        performanceBreakdown.percentage >= 50 ? 'bg-amber-500' :
                        'bg-red-500'
                      )}
                      style={{ width: `${performanceBreakdown.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

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
          </TabsContent>

          <TabsContent value="review" className="space-y-4 mt-6">
            {questions.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Click on each question to expand and see detailed explanations. Use "Get AI Help" for additional guidance.
                </p>
                {questions.map((question, index) => (
                  <QuestionReviewCard
                    key={question.id}
                    question={question}
                    userAnswers={userAnswers[question.id] || []}
                    questionIndex={index}
                    subject={exam.subject}
                    level={exam.level}
                    onStudyTopic={handleStudyTopic}
                  />
                ))}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Question review is not available for this exam.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}