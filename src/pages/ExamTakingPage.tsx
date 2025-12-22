import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProgress } from '@/hooks/useXPAndStreak';
import { fireConfetti, fireStars } from '@/hooks/useConfetti';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Card from '@/components/common/Card';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Sparkles,
  ArrowLeft,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Exam = Database['public']['Tables']['exams']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];
type QuestionPart = Database['public']['Tables']['question_parts']['Row'];

interface QuestionWithParts extends Question {
  parts: QuestionPart[];
}

export default function ExamTakingPage() {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  
  const mode = searchParams.get('mode') as 'practice' | 'simulation' || 'practice';
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<QuestionWithParts[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;

      // Fetch exam
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .maybeSingle();

      if (examError || !examData) {
        console.error('Error fetching exam:', examError);
        navigate('/exams');
        return;
      }

      setExam(examData);
      setTimeLeft(examData.time_limit * 60);

      // Fetch questions with parts
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('question_number');

      if (questionsData) {
        // Fetch parts for all questions
        const questionIds = questionsData.map(q => q.id);
        const { data: partsData } = await supabase
          .from('question_parts')
          .select('*')
          .in('question_id', questionIds)
          .order('order_index');

        const questionsWithParts: QuestionWithParts[] = questionsData.map(q => ({
          ...q,
          parts: (partsData || []).filter(p => p.question_id === q.id),
        }));

        setQuestions(questionsWithParts);
      }

      setLoading(false);
    };

    fetchExam();
  }, [examId, navigate]);

  // Timer for simulation mode
  useEffect(() => {
    if (mode === 'simulation' && !showResults && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode, showResults, timeLeft]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalParts = useMemo(() => 
    questions.reduce((acc, q) => acc + q.parts.length, 0), 
    [questions]
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (partId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [partId]: value }));
  };

  // Helper to normalize text for comparison
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[,\s]+/g, ' ')           // Normalize whitespace and commas
      .replace(/sh\.?\s*/gi, '')         // Remove currency prefixes
      .replace(/°|degrees?/gi, '')       // Normalize degrees
      .replace(/p\.?\s*m\.?/gi, 'pm')    // Normalize PM
      .replace(/a\.?\s*m\.?/gi, 'am')    // Normalize AM
      .replace(/\s+/g, ' ')              // Collapse multiple spaces
      .replace(/['"]/g, '')              // Remove quotes
      .replace(/\./g, '')                // Remove periods (for abbreviations)
      .trim();
  };

  // Extract numeric value from text
  const extractNumber = (text: string): number | null => {
    const cleaned = text.replace(/[,\s]/g, '').replace(/sh\.?/gi, '');
    const match = cleaned.match(/-?\d+\.?\d*/);
    return match ? parseFloat(match[0]) : null;
  };

  // Check if two fractions are equivalent
  const checkFractionEquivalence = (user: string, correct: string): boolean => {
    // Handle mixed numbers like "2 1/3" or "2⅓"
    const parseFraction = (str: string): number | null => {
      str = str.replace(/⅓/g, '1/3').replace(/⅔/g, '2/3').replace(/½/g, '1/2').replace(/¼/g, '1/4').replace(/¾/g, '3/4');
      
      // Mixed number: "2 1/3"
      const mixedMatch = str.match(/(\d+)\s+(\d+)\/(\d+)/);
      if (mixedMatch) {
        const whole = parseInt(mixedMatch[1]);
        const num = parseInt(mixedMatch[2]);
        const den = parseInt(mixedMatch[3]);
        return whole + num / den;
      }
      
      // Simple fraction: "7/3"
      const fractionMatch = str.match(/(\d+)\/(\d+)/);
      if (fractionMatch) {
        return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
      }
      
      // Decimal
      const num = parseFloat(str);
      return isNaN(num) ? null : num;
    };

    const userVal = parseFraction(user);
    const correctVal = parseFraction(correct);
    
    if (userVal !== null && correctVal !== null) {
      return Math.abs(userVal - correctVal) < 0.01;
    }
    return false;
  };

  // Check time equivalence
  const checkTimeEquivalence = (user: string, correct: string): boolean => {
    const parseTime = (str: string): { hours: number; minutes: number; isPm: boolean } | null => {
      str = str.toLowerCase().replace(/\s/g, '');
      const isPm = str.includes('pm') || str.includes('p.m');
      const isAm = str.includes('am') || str.includes('a.m');
      
      const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        return { hours, minutes, isPm };
      }
      return null;
    };

    const userTime = parseTime(user);
    const correctTime = parseTime(correct);
    
    if (userTime && correctTime) {
      return userTime.hours === correctTime.hours && 
             userTime.minutes === correctTime.minutes &&
             userTime.isPm === correctTime.isPm;
    }
    return false;
  };

  const checkAnswer = (part: QuestionPart, userAnswer: string): boolean => {
    if (!userAnswer.trim()) return false;
    
    const normalizedUser = normalizeText(userAnswer);
    const normalizedCorrect = normalizeText(part.answer);
    
    // Exact match after normalization
    if (normalizedUser === normalizedCorrect) return true;
    
    // Handle numeric answers
    if (part.answer_type === 'numeric') {
      const userNum = extractNumber(userAnswer);
      const correctNum = extractNumber(part.answer);
      if (userNum !== null && correctNum !== null) {
        return Math.abs(userNum - correctNum) < 0.01;
      }
    }
    
    // Check fraction equivalence (for answers like "7/3" or "2⅓")
    if (userAnswer.includes('/') || part.answer.includes('/') || 
        /[⅓⅔½¼¾]/.test(userAnswer) || /[⅓⅔½¼¾]/.test(part.answer)) {
      if (checkFractionEquivalence(userAnswer, part.answer)) return true;
    }
    
    // Check time equivalence
    if (userAnswer.includes(':') && part.answer.includes(':')) {
      if (checkTimeEquivalence(userAnswer, part.answer)) return true;
    }
    
    // Check if numeric value matches even in text answers
    const userNum = extractNumber(userAnswer);
    const correctNum = extractNumber(part.answer);
    if (userNum !== null && correctNum !== null && Math.abs(userNum - correctNum) < 0.01) {
      return true;
    }
    
    // Fuzzy matching: check containment for longer answers
    if (normalizedCorrect.length > 3) {
      if (normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser)) {
        return true;
      }
    }
    
    // Check if key parts match (for answers like "3x - 35")
    const userParts = normalizedUser.split(/[\s+\-=]+/).filter(Boolean);
    const correctParts = normalizedCorrect.split(/[\s+\-=]+/).filter(Boolean);
    if (correctParts.length > 0 && userParts.length === correctParts.length) {
      const allMatch = correctParts.every((cp, i) => cp === userParts[i]);
      if (allMatch) return true;
    }
    
    return false;
  };

  const handleCheckPracticeAnswer = (part: QuestionPart) => {
    const userAnswer = answers[part.id] || '';
    const isCorrect = checkAnswer(part, userAnswer);
    setResults(prev => ({ ...prev, [part.id]: isCorrect }));
  };

  const handleSubmitExam = async () => {
    const newResults: Record<string, boolean> = {};
    questions.forEach(question => {
      question.parts.forEach(part => {
        const userAnswer = answers[part.id] || '';
        newResults[part.id] = checkAnswer(part, userAnswer);
      });
    });
    setResults(newResults);
    setShowResults(true);

    // Save attempt if user is logged in
    if (profile && exam) {
      const score = Object.values(newResults).filter(Boolean).length;
      const scorePercentage = totalParts > 0 ? (score / totalParts) * 100 : 0;
      
      await supabase.from('exam_attempts').insert({
        user_id: profile.id,
        exam_id: exam.id,
        mode,
        score,
        total_questions: totalParts,
        time_taken: exam.time_limit * 60 - timeLeft,
      });

      // Update XP and streak
      const { xpEarned, newStreak, streakUpdated } = await updateUserProgress({
        userId: profile.id,
        scorePercentage,
        totalQuestions: totalParts,
      });

      // Fire celebration effects
      if (scorePercentage >= 80) {
        fireConfetti();
        fireStars();
      } else if (scorePercentage >= 60) {
        fireConfetti();
      }

      if (xpEarned > 0) {
        toast.success(`+${xpEarned} XP earned!`, {
          icon: <Trophy className="w-4 h-4 text-amber-500" />,
        });
      }

      if (streakUpdated && newStreak && newStreak > 1) {
        toast.success(`🔥 ${newStreak} day streak!`);
      }

      // Check for new achievements (fire and forget)
      supabase.functions.invoke('check-achievements', {
        body: { userId: profile.id },
      }).then(({ data }) => {
        if (data?.newAchievements?.length > 0) {
          data.newAchievements.forEach((achievement: string) => {
            toast.success(`🏆 Achievement Unlocked: ${achievement}!`);
          });
        }
      }).catch(console.error);
    }
  };

  const calculateScore = () => {
    const correct = Object.values(results).filter(Boolean).length;
    return { score: correct, total: totalParts };
  };

  const handleExit = () => {
    if (showResults) {
      navigate(role === 'admin' ? '/dashboard/admin' : '/exams');
    } else {
      if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
        navigate(role === 'admin' ? '/dashboard/admin' : '/exams');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Exam not found</h2>
          <p className="text-muted-foreground mb-4">This exam may not have any questions yet.</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const { score, total } = calculateScore();
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card className="text-center p-8">
            <div className={cn(
              'w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center',
              percentage >= 70 ? 'bg-emerald-100' : percentage >= 50 ? 'bg-amber-100' : 'bg-red-100'
            )}>
              <span className={cn(
                'text-3xl font-bold',
                percentage >= 70 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-600' : 'text-red-600'
              )}>
                {percentage}%
              </span>
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Exam Complete!</h1>
            <p className="text-muted-foreground mb-6">
              You scored {score} out of {total} questions correctly.
            </p>
            
            <Button onClick={handleExit}>
              Back to {role === 'admin' ? 'Dashboard' : 'Exams'}
            </Button>
          </Card>

          {/* Review Section */}
          <div className="mt-8 space-y-6">
            <h2 className="text-xl font-bold">Review Your Answers</h2>
            {questions.map((question, qIndex) => (
              <Card key={question.id} className="p-6">
                <h3 className="font-bold mb-4">Question {qIndex + 1}</h3>
                <p className="text-muted-foreground mb-4 whitespace-pre-line">{question.text}</p>
                {question.image_url && (
                  <div className="mb-4">
                    <img 
                      src={question.image_url} 
                      alt={`Question ${qIndex + 1} diagram`}
                      className="max-w-full h-auto rounded-lg border border-border"
                    />
                  </div>
                )}
                
                {question.parts.map(part => (
                  <div key={part.id} className="border-t border-border pt-4 mt-4">
                    <div className="flex items-start gap-3">
                      {results[part.id] ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-1" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{part.text}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your answer: {answers[part.id] || '(No answer)'}
                        </p>
                        <p className="text-sm text-emerald-600 mt-1">
                          Correct answer: {part.answer}
                        </p>
                        {part.explanation && (
                          <div className="text-sm text-secondary mt-2 bg-secondary/10 p-3 rounded-lg whitespace-pre-line">
                            {part.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleExit}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-foreground">{exam.title}</h1>
              <p className="text-sm text-muted-foreground">
                {mode === 'practice' ? 'Practice Mode' : 'Exam Simulation'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {mode === 'simulation' && (
              <div className={cn(
                'flex items-center gap-2 px-3 py-1 rounded-full',
                timeLeft < 300 ? 'bg-red-100 text-red-600' : 'bg-muted text-foreground'
              )}>
                <Clock className="w-5 h-5" />
                <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
              </div>
            )}
            
            {mode === 'simulation' && (
              <Button onClick={handleSubmitExam}>
                Submit Exam
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Question Navigation */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  index === currentQuestionIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Q{index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Question Content */}
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="p-6">
          <div className="mb-6">
            <span className="text-sm text-primary font-medium">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <h2 className="text-xl font-bold mt-2 whitespace-pre-line">{currentQuestion?.text}</h2>
            {currentQuestion?.image_url && (
              <div className="mt-4">
                <img 
                  src={currentQuestion.image_url} 
                  alt={`Question ${currentQuestionIndex + 1} diagram`}
                  className="max-w-full h-auto rounded-lg border border-border"
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            {currentQuestion?.parts.map((part, partIndex) => (
              <div key={part.id} className="border-t border-border pt-6">
                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {String.fromCharCode(97 + partIndex)}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium mb-2">{part.text}</p>
                    <p className="text-sm text-muted-foreground mb-3">[{part.marks} marks]</p>
                    
                    <Textarea
                      value={answers[part.id] || ''}
                      onChange={(e) => handleAnswerChange(part.id, e.target.value)}
                      placeholder="Enter your answer..."
                      className="min-h-[100px] resize-y"
                    />

                    {mode === 'practice' && (
                      <div className="mt-3 flex items-center gap-3">
                        <Button
                          variant="secondary"
                          onClick={() => handleCheckPracticeAnswer(part)}
                        >
                          Check Answer
                        </Button>
                        
                        {results[part.id] !== undefined && (
                          <div className={cn(
                            'flex items-center gap-2',
                            results[part.id] ? 'text-emerald-600' : 'text-red-600'
                          )}>
                            {results[part.id] ? (
                              <>
                                <CheckCircle className="w-5 h-5" />
                                <span>Correct!</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-5 h-5" />
                                <span>Incorrect. Answer: {part.answer}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {mode === 'practice' && results[part.id] !== undefined && part.explanation && (
                      <div className="mt-3 p-4 bg-secondary/10 rounded-lg">
                        <div className="flex items-center gap-2 text-secondary font-medium mb-2">
                          <Sparkles className="w-5 h-5" />
                          Explanation
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-line">{part.explanation}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="ghost"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
            disabled={currentQuestionIndex === questions.length - 1}
          >
            Next
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}