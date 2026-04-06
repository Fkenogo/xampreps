import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  submitExamAttemptFirebase,
  getLatestExamAttemptIdFirebase,
} from '@/integrations/firebase/exams';
import { getExamContentFirebase } from '@/integrations/firebase/content';
import { useAIExplanation } from '@/hooks/useAIExplanation';
import { fireConfetti, fireStars } from '@/hooks/useConfetti';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Card from '@/components/common/Card';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
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
  Loader2,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Exam {
  id: string;
  title: string;
  subject: string | null;
  level: string | null;
  time_limit: number;
}

interface Question {
  id: string;
  exam_id: string;
  question_number: number;
  text: string;
  image_url: string | null;
}

interface QuestionPart {
  id: string;
  question_id: string;
  text: string;
  answer: string;
  marks: number;
  explanation: string | null;
  order_index: number;
  answer_type: string;
}

interface QuestionWithParts extends Question {
  parts: QuestionPart[];
}

type ExamMode = 'practice' | 'quiz' | 'simulation';

export default function ExamTakingPage() {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  
  const mode = (searchParams.get('mode') as ExamMode) || 'practice';
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<QuestionWithParts[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Quiz mode specific state
  const [quizPartIndex, setQuizPartIndex] = useState(0);
  const [quizFeedbackVisible, setQuizFeedbackVisible] = useState(false);
  const [quizAutoAdvanceTimer, setQuizAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);
  
  // AI explanations state
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingAI, setLoadingAI] = useState<Record<string, boolean>>({});

  const { getExplanation, getFeedback } = useAIExplanation({
    studentLevel: exam?.level || 'PLE',
    subject: exam?.subject,
  });

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;

      try {
        const response = await getExamContentFirebase(examId);
        if (!response.ok || !response.exam) {
          navigate('/exams');
          return;
        }

        setExam(response.exam as Exam);
        setTimeLeft((response.exam.time_limit || 60) * 60);
        const questionsWithParts: QuestionWithParts[] = (response.questions || []).map((q) => ({
          ...(q as unknown as Question),
          parts: (q.parts || q.question_parts || []) as QuestionPart[],
        }));
        setQuestions(questionsWithParts);
      } catch (error) {
        console.error('Error fetching Firebase exam content:', error);
        navigate('/exams');
      } finally {
        setLoading(false);
      }
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

  // Clean up quiz auto-advance timer
  useEffect(() => {
    return () => {
      if (quizAutoAdvanceTimer) {
        clearTimeout(quizAutoAdvanceTimer);
      }
    };
  }, [quizAutoAdvanceTimer]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalParts = useMemo(() => 
    questions.reduce((acc, q) => acc + q.parts.length, 0), 
    [questions]
  );

  // For quiz mode: flatten all parts across questions
  const allParts = useMemo(() => {
    const parts: { question: QuestionWithParts; part: QuestionPart; questionIndex: number }[] = [];
    questions.forEach((q, qIdx) => {
      q.parts.forEach(p => parts.push({ question: q, part: p, questionIndex: qIdx }));
    });
    return parts;
  }, [questions]);

  const currentQuizItem = allParts[quizPartIndex];

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
      .replace(/[,\s]+/g, ' ')
      .replace(/sh\.?\s*/gi, '')
      .replace(/°|degrees?/gi, '')
      .replace(/p\.?\s*m\.?/gi, 'pm')
      .replace(/a\.?\s*m\.?/gi, 'am')
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

  const checkFractionEquivalence = (user: string, correct: string): boolean => {
    const parseFraction = (str: string): number | null => {
      str = str.replace(/⅓/g, '1/3').replace(/⅔/g, '2/3').replace(/½/g, '1/2').replace(/¼/g, '1/4').replace(/¾/g, '3/4');
      
      const mixedMatch = str.match(/(\d+)\s+(\d+)\/(\d+)/);
      if (mixedMatch) {
        const whole = parseInt(mixedMatch[1]);
        const num = parseInt(mixedMatch[2]);
        const den = parseInt(mixedMatch[3]);
        return whole + num / den;
      }
      
      const fractionMatch = str.match(/(\d+)\/(\d+)/);
      if (fractionMatch) {
        return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
      }
      
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

  const checkTimeEquivalence = (user: string, correct: string): boolean => {
    const parseTime = (str: string): { hours: number; minutes: number; isPm: boolean } | null => {
      str = str.toLowerCase().replace(/\s/g, '');
      const isPm = str.includes('pm') || str.includes('p.m');
      
      const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
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
    
    if (normalizedUser === normalizedCorrect) return true;
    
    if (part.answer_type === 'numeric') {
      const userNum = extractNumber(userAnswer);
      const correctNum = extractNumber(part.answer);
      if (userNum !== null && correctNum !== null) {
        return Math.abs(userNum - correctNum) < 0.01;
      }
    }
    
    if (userAnswer.includes('/') || part.answer.includes('/') || 
        /[⅓⅔½¼¾]/.test(userAnswer) || /[⅓⅔½¼¾]/.test(part.answer)) {
      if (checkFractionEquivalence(userAnswer, part.answer)) return true;
    }
    
    if (userAnswer.includes(':') && part.answer.includes(':')) {
      if (checkTimeEquivalence(userAnswer, part.answer)) return true;
    }
    
    const userNum = extractNumber(userAnswer);
    const correctNum = extractNumber(part.answer);
    if (userNum !== null && correctNum !== null && Math.abs(userNum - correctNum) < 0.01) {
      return true;
    }
    
    if (normalizedCorrect.length > 3) {
      if (normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser)) {
        return true;
      }
    }
    
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

  // Quiz mode: check and advance
  const handleQuizSubmit = useCallback(() => {
    if (!currentQuizItem) return;
    
    const { part } = currentQuizItem;
    const userAnswer = answers[part.id] || '';
    const isCorrect = checkAnswer(part, userAnswer);
    setResults(prev => ({ ...prev, [part.id]: isCorrect }));
    setQuizFeedbackVisible(true);
    
    // Auto-advance after showing feedback
    const timer = setTimeout(() => {
      setQuizFeedbackVisible(false);
      if (quizPartIndex < allParts.length - 1) {
        setQuizPartIndex(prev => prev + 1);
        // Update current question index if needed
        const nextItem = allParts[quizPartIndex + 1];
        if (nextItem && nextItem.questionIndex !== currentQuestionIndex) {
          setCurrentQuestionIndex(nextItem.questionIndex);
        }
      } else {
        // Quiz complete
        handleSubmitExam();
      }
    }, 2500);
    
    setQuizAutoAdvanceTimer(timer);
  }, [currentQuizItem, answers, quizPartIndex, allParts, currentQuestionIndex]);

  // Get AI explanation for a part
  const handleGetAIExplanation = async (part: QuestionPart, questionText: string, isIncorrect: boolean) => {
    const key = `${part.id}_${isIncorrect ? 'feedback' : 'explain'}`;
    
    if (aiExplanations[key]) return; // Already have it
    
    setLoadingAI(prev => ({ ...prev, [key]: true }));
    
    try {
      let result: string | null;
      if (isIncorrect) {
        const userAnswer = answers[part.id] || '';
        result = await getFeedback(questionText + '\n' + part.text, userAnswer, part.answer, part.marks);
      } else {
        result = await getExplanation(questionText + '\n' + part.text, part.answer, part.marks);
      }
      
      if (result) {
        setAiExplanations(prev => ({ ...prev, [key]: result }));
      }
    } finally {
      setLoadingAI(prev => ({ ...prev, [key]: false }));
    }
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

    if (profile && exam) {
      const score = Object.values(newResults).filter(Boolean).length;
      const scorePercentage = totalParts > 0 ? (score / totalParts) * 100 : 0;
      
      // Map quiz mode to practice for database (quiz is a UI variant of practice)
      const dbMode = mode === 'quiz' ? 'practice' : mode;

      // Update question history for spaced repetition
      const now = new Date();
      const questionHistoryUpdates = questions.flatMap(question =>
        question.parts.map(part => {
          const isCorrect = newResults[part.id];
          // Calculate next review time based on SM-2 variant
          const intervalHours = isCorrect ? 24 : 1; // 24 hours if correct, 1 hour if incorrect
          const nextReview = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
          
          return {
            user_id: profile.id,
            question_part_id: part.id,
            exam_id: exam.id,
            is_correct: isCorrect,
            streak: isCorrect ? 1 : 0,
            next_review: nextReview.toISOString(),
            last_attempt: now.toISOString(),
          };
        })
      );
      const result = await submitExamAttemptFirebase({
        examId: exam.id,
        mode: dbMode,
        score,
        totalQuestions: totalParts,
        timeTaken: exam.time_limit * 60 - timeLeft,
        questionHistoryUpdates: questionHistoryUpdates.map((item) => ({
          questionPartId: item.question_part_id,
          isCorrect: item.is_correct,
          nextReview: item.next_review,
        })),
      });
      const xpEarned = result.xpEarned || 0;
      const newStreak = result.newStreak;
      const streakUpdated = !!result.streakUpdated;

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

  // Build user answers data for results page
  const buildUserAnswersData = () => {
    const answersData: Record<string, { partId: string; answer: string; isCorrect: boolean }[]> = {};
    questions.forEach(question => {
      answersData[question.id] = question.parts.map(part => ({
        partId: part.id,
        answer: answers[part.id] || '',
        isCorrect: results[part.id] || false,
      }));
    });
    return answersData;
  };

  const handleViewDetailedResults = async () => {
    // Get the attempt ID from the most recent attempt
    if (!profile || !exam) return;
    
    const response = await getLatestExamAttemptIdFirebase(exam.id);
    const attemptId = response.ok ? response.attemptId : null;
    
    if (attemptId) {
      const answersParam = encodeURIComponent(JSON.stringify(buildUserAnswersData()));
      navigate(`/exam/${exam.id}/results/${attemptId}?answers=${answersParam}`);
    }
  };

  // Results View
  if (showResults) {
    const { score, total } = calculateScore();
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card className="text-center p-8">
            <div className={cn(
              'w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center',
              percentage >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/30' : percentage >= 50 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'
            )}>
              <span className={cn(
                'text-3xl font-bold',
                percentage >= 70 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-600' : 'text-red-600'
              )}>
                {percentage}%
              </span>
            </div>
            
            <h1 className="text-2xl font-bold mb-2">
              {mode === 'quiz' ? 'Quiz Complete!' : 'Exam Complete!'}
            </h1>
            <p className="text-muted-foreground mb-6">
              You scored {score} out of {total} questions correctly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleViewDetailedResults} className="gap-2">
                <Sparkles className="w-4 h-4" />
                View Detailed Results
              </Button>
              <Button variant="outline" onClick={handleExit}>
                Back to {role === 'admin' ? 'Dashboard' : 'Exams'}
              </Button>
            </div>
          </Card>

          {/* Quick Review Section */}
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Quick Review</h2>
              <Button variant="ghost" size="sm" onClick={handleViewDetailedResults} className="gap-1">
                Full Review with AI Help
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
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
                
                {question.parts.map(part => {
                  const isCorrect = results[part.id];
                  const feedbackKey = `${part.id}_feedback`;
                  const explainKey = `${part.id}_explain`;
                  
                  return (
                    <div key={part.id} className="border-t border-border pt-4 mt-4">
                      <div className="flex items-start gap-3">
                        {isCorrect ? (
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
                          
                          {/* Static explanation if exists */}
                          {part.explanation && (
                            <div className="text-sm text-secondary mt-2 bg-secondary/10 p-3 rounded-lg whitespace-pre-line">
                              {part.explanation}
                            </div>
                          )}
                          
                          {/* AI Help Button */}
                          {!isCorrect && !aiExplanations[feedbackKey] && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={() => handleGetAIExplanation(part, question.text, true)}
                              disabled={loadingAI[feedbackKey]}
                            >
                              {loadingAI[feedbackKey] ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Lightbulb className="w-4 h-4 mr-2" />
                              )}
                              Why was I wrong?
                            </Button>
                          )}
                          
                          {isCorrect && !part.explanation && !aiExplanations[explainKey] && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={() => handleGetAIExplanation(part, question.text, false)}
                              disabled={loadingAI[explainKey]}
                            >
                              {loadingAI[explainKey] ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                              )}
                              Show explanation
                            </Button>
                          )}
                          
                          {/* AI Explanation Display */}
                          {aiExplanations[feedbackKey] && (
                            <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                              <div className="flex items-center gap-2 text-amber-600 font-medium mb-2">
                                <Lightbulb className="w-5 h-5" />
                                AI Feedback
                              </div>
                              <MarkdownRenderer content={aiExplanations[feedbackKey]} className="text-sm" />
                            </div>
                          )}
                          
                          {aiExplanations[explainKey] && (
                            <div className="mt-3 p-4 bg-secondary/10 rounded-lg">
                              <div className="flex items-center gap-2 text-secondary font-medium mb-2">
                                <Sparkles className="w-5 h-5" />
                                AI Explanation
                              </div>
                              <MarkdownRenderer content={aiExplanations[explainKey]} className="text-sm" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Quiz Mode View
  if (mode === 'quiz' && currentQuizItem) {
    const { question, part, questionIndex } = currentQuizItem;
    const isAnswered = results[part.id] !== undefined;
    const isCorrect = results[part.id];
    
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
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Quiz Mode
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {quizPartIndex + 1} of {allParts.length}
              </span>
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((quizPartIndex + 1) / allParts.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Quiz Content */}
        <main className="container mx-auto px-6 py-8 max-w-2xl">
          <Card className="p-6">
            <div className="mb-6">
              <span className="text-sm text-primary font-medium">
                Question {questionIndex + 1}
              </span>
              <h2 className="text-xl font-bold mt-2 whitespace-pre-line">{question.text}</h2>
              {question.image_url && (
                <div className="mt-4">
                  <img 
                    src={question.image_url} 
                    alt="Question diagram"
                    className="max-w-full h-auto rounded-lg border border-border"
                  />
                </div>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <p className="font-medium mb-2">{part.text}</p>
              <p className="text-sm text-muted-foreground mb-3">[{part.marks} marks]</p>
              
              <Textarea
                value={answers[part.id] || ''}
                onChange={(e) => handleAnswerChange(part.id, e.target.value)}
                placeholder="Enter your answer..."
                className="min-h-[100px] resize-y"
                disabled={isAnswered}
              />

              {/* Feedback overlay */}
              {quizFeedbackVisible && isAnswered && (
                <div className={cn(
                  'mt-4 p-4 rounded-lg flex items-center gap-3',
                  isCorrect 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                )}>
                  {isCorrect ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                      <div>
                        <p className="font-medium text-emerald-700 dark:text-emerald-400">Correct! 🎉</p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-500">Moving to next question...</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-red-500" />
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-400">Not quite right</p>
                        <p className="text-sm text-red-600 dark:text-red-500">Correct answer: {part.answer}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {!isAnswered && (
                <Button 
                  className="mt-4 w-full"
                  onClick={handleQuizSubmit}
                  disabled={!answers[part.id]?.trim()}
                >
                  Submit Answer
                </Button>
              )}
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Practice/Simulation Mode View
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
                timeLeft < 300 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-muted text-foreground'
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
            {currentQuestion?.parts.map((part, partIndex) => {
              const explainKey = `${part.id}_explain`;
              
              return (
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
                        <div className="mt-3 flex items-center gap-3 flex-wrap">
                          <Button
                            variant="secondary"
                            onClick={() => handleCheckPracticeAnswer(part)}
                          >
                            Check Answer
                          </Button>
                          
                          {/* AI Help button in practice mode */}
                          {results[part.id] === undefined && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGetAIExplanation(part, currentQuestion?.text || '', false)}
                              disabled={loadingAI[explainKey]}
                            >
                              {loadingAI[explainKey] ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Lightbulb className="w-4 h-4 mr-2" />
                              )}
                              Get AI Help
                            </Button>
                          )}
                          
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

                      {/* AI Explanation display */}
                      {aiExplanations[explainKey] && (
                        <div className="mt-3 p-4 bg-secondary/10 rounded-lg">
                          <div className="flex items-center gap-2 text-secondary font-medium mb-2">
                            <Sparkles className="w-5 h-5" />
                            AI Explanation
                          </div>
                          <MarkdownRenderer content={aiExplanations[explainKey]} className="text-sm" />
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
              );
            })}
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
