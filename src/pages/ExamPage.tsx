import React, { useState, useEffect, useMemo } from 'react';
import { Exam, ExamMode, QuestionPart } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon, ClockIcon, SparklesIcon } from '../components/icons';
import Card from '../components/common/Card';

interface ExamPageProps {
  exam: Exam;
  mode: ExamMode;
  onExit: (result?: { score: number; total: number }) => void;
}

const ExamPage: React.FC<ExamPageProps> = ({ exam, mode, onExit }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(exam.timeLimit * 60);

  const currentQuestion = exam.questions[currentQuestionIndex];
  const totalParts = useMemo(() => exam.questions.reduce((acc, q) => acc + q.parts.length, 0), [exam]);

  // Timer for simulation mode
  useEffect(() => {
    if (mode === 'simulation' && !showResults) {
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
  }, [mode, showResults]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (partId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [partId]: value }));
  };

  const checkAnswer = (part: QuestionPart, userAnswer: string): boolean => {
    const normalizedUser = userAnswer.toLowerCase().trim();
    const normalizedCorrect = part.answer.toLowerCase().trim();
    
    if (part.answerType === 'numeric') {
      const userNum = parseFloat(normalizedUser);
      const correctNum = parseFloat(normalizedCorrect);
      return Math.abs(userNum - correctNum) < 0.1;
    }
    
    return normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser);
  };

  const handleCheckPracticeAnswer = (part: QuestionPart) => {
    const userAnswer = answers[part.id] || '';
    const isCorrect = checkAnswer(part, userAnswer);
    setResults(prev => ({ ...prev, [part.id]: isCorrect }));
  };

  const handleSubmitExam = () => {
    const newResults: Record<string, boolean> = {};
    exam.questions.forEach(question => {
      question.parts.forEach(part => {
        const userAnswer = answers[part.id] || '';
        newResults[part.id] = checkAnswer(part, userAnswer);
      });
    });
    setResults(newResults);
    setShowResults(true);
  };

  const calculateScore = () => {
    const correct = Object.values(results).filter(Boolean).length;
    return { score: correct, total: totalParts };
  };

  const handleExit = () => {
    if (showResults) {
      onExit(calculateScore());
    } else {
      if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
        onExit();
      }
    }
  };

  if (showResults) {
    const { score, total } = calculateScore();
    const percentage = Math.round((score / total) * 100);
    
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card className="text-center">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${percentage >= 70 ? 'bg-green-100' : percentage >= 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <span className={`text-3xl font-bold ${percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {percentage}%
              </span>
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Exam Complete!</h1>
            <p className="text-muted-foreground mb-6">
              You scored {score} out of {total} questions correctly.
            </p>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={handleExit}
                className="btn-primary"
              >
                Back to Dashboard
              </button>
            </div>
          </Card>

          {/* Review Section */}
          <div className="mt-8 space-y-6">
            <h2 className="text-xl font-bold">Review Your Answers</h2>
            {exam.questions.map((question, qIndex) => (
              <Card key={question.id}>
                <h3 className="font-bold mb-4">Question {qIndex + 1}</h3>
                <p className="text-muted-foreground mb-4 whitespace-pre-line">{question.text}</p>
                
                {question.parts.map(part => (
                  <div key={part.id} className="border-t border-border pt-4 mt-4">
                    <div className="flex items-start gap-3">
                      {results[part.id] ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                      ) : (
                        <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{part.text}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your answer: {answers[part.id] || '(No answer)'}
                        </p>
                        <p className="text-sm text-green-600 mt-1">
                          Correct answer: {part.answer}
                        </p>
                        {part.explanation && (
                          <p className="text-sm text-secondary mt-2 bg-secondary/10 p-3 rounded-lg">
                            {part.explanation}
                          </p>
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
            <button onClick={handleExit} className="text-muted-foreground hover:text-foreground">
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <div>
              <h1 className="font-bold text-foreground">{exam.title}</h1>
              <p className="text-sm text-muted-foreground">
                {mode === 'practice' ? 'Practice Mode' : 'Exam Simulation'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {mode === 'simulation' && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${timeLeft < 300 ? 'bg-red-100 text-red-600' : 'bg-muted text-foreground'}`}>
                <ClockIcon className="w-5 h-5" />
                <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
              </div>
            )}
            
            {mode === 'simulation' && (
              <button
                onClick={handleSubmitExam}
                className="btn-primary py-2"
              >
                Submit Exam
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Question Navigation */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {exam.questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? 'gradient-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Q{index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Question Content */}
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <Card>
          <div className="mb-6">
            <span className="text-sm text-primary font-medium">
              Question {currentQuestionIndex + 1} of {exam.questions.length}
            </span>
            <h2 className="text-xl font-bold mt-2 whitespace-pre-line">{currentQuestion.text}</h2>
          </div>

          <div className="space-y-6">
            {currentQuestion.parts.map((part, partIndex) => (
              <div key={part.id} className="border-t border-border pt-6">
                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 gradient-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {String.fromCharCode(97 + partIndex)}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium mb-2">{part.text}</p>
                    <p className="text-sm text-muted-foreground mb-3">[{part.marks} marks]</p>
                    
                    <textarea
                      value={answers[part.id] || ''}
                      onChange={(e) => handleAnswerChange(part.id, e.target.value)}
                      placeholder="Enter your answer..."
                      className="input-style min-h-[100px] resize-y"
                    />

                    {mode === 'practice' && (
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={() => handleCheckPracticeAnswer(part)}
                          className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Check Answer
                        </button>
                        
                        {results[part.id] !== undefined && (
                          <div className={`flex items-center gap-2 ${results[part.id] ? 'text-green-600' : 'text-red-600'}`}>
                            {results[part.id] ? (
                              <>
                                <CheckCircleIcon className="w-5 h-5" />
                                <span>Correct!</span>
                              </>
                            ) : (
                              <>
                                <XCircleIcon className="w-5 h-5" />
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
                          <SparklesIcon className="w-5 h-5" />
                          Explanation
                        </div>
                        <p className="text-sm text-muted-foreground">{part.explanation}</p>
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
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            Previous
          </button>
          
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}
            disabled={currentQuestionIndex === exam.questions.length - 1}
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default ExamPage;
