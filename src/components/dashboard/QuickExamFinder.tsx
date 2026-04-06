import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { listExamsFirebase } from '@/integrations/firebase/content';
import { listExamHistoryFirebase } from '@/integrations/firebase/exams';
import { Search, ArrowRight, Clock, TrendingUp, BookOpen, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
type Exam = {
  id: string;
  title: string;
  subject: string;
  level: string;
  year: number;
  difficulty: string;
  is_free: boolean;
  time_limit: number;
  question_count?: number;
};

const subjects = ['Mathematics', 'Science', 'English', 'Social Studies'];

interface QuickExamFinderProps {
  maxResults?: number;
  showRecommendations?: boolean;
  className?: string;
}

const subjectColors: Record<string, string> = {
  Mathematics: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  English: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  Science: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Social Studies': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const difficultyColors: Record<string, string> = {
  Easy: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30',
  Medium: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30',
  Hard: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30',
};

export default function QuickExamFinder({
  maxResults = 4,
  showRecommendations = true,
  className,
}: QuickExamFinderProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [recentExam, setRecentExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);

      const examsResponse = await listExamsFirebase();
      const allExams = (examsResponse.items || []).map((exam) => ({
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        level: exam.level,
        year: exam.year,
        difficulty: exam.difficulty,
        is_free: exam.is_free,
        time_limit: exam.time_limit,
        question_count: exam.question_count,
      }));

      const filtered = allExams
        .filter((exam) => (selectedSubject ? exam.subject === selectedSubject : true))
        .filter((exam) => (profile?.level ? exam.level === profile.level : true))
        .filter(
          (exam) =>
            exam.title.toLowerCase().includes(search.toLowerCase()) ||
            exam.subject.toLowerCase().includes(search.toLowerCase())
        );
      setExams(filtered.slice(0, maxResults));

      if (showRecommendations) {
        const history = await listExamHistoryFirebase();
        const latest = history.items && history.items.length > 0 ? history.items[0] : null;
        if (latest) {
          const matchingExam = allExams.find((exam) => exam.id === latest.examId);
          setRecentExam(matchingExam || null);
        }
      }

      setLoading(false);
    };

    fetchExams();
  }, [search, selectedSubject, profile?.level, maxResults, showRecommendations]);

  const handleExamClick = (examId: string, mode: 'practice' | 'simulation') => {
    navigate(`/exam/${examId}?mode=${mode}`);
  };

  return (
    <div className={cn('bg-card rounded-2xl border border-border p-6 animate-fade-in', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Quick Exam Finder</h3>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search exams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Subject Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge
          variant={selectedSubject === null ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-primary/90 transition-colors"
          onClick={() => setSelectedSubject(null)}
        >
          All
        </Badge>
        {subjects.map((subject) => (
          <Badge
            key={subject}
            variant={selectedSubject === subject ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-primary/90 transition-colors"
            onClick={() => setSelectedSubject(subject)}
          >
            {subject}
          </Badge>
        ))}
      </div>

      {/* Recent/Continue Section */}
      {showRecommendations && recentExam && (
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 text-sm text-primary mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">Continue where you left off</span>
          </div>
          <button
            onClick={() => handleExamClick(recentExam.id, 'practice')}
            className="w-full text-left group"
          >
            <p className="font-medium text-foreground group-hover:text-primary transition-colors">
              {recentExam.title}
            </p>
            <p className="text-xs text-muted-foreground">{recentExam.subject} • {recentExam.year}</p>
          </button>
        </div>
      )}

      {/* Exam List */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No exams found. Try a different search.
          </p>
        ) : (
          exams.map((exam, index) => (
            <button
              key={exam.id}
              onClick={() => handleExamClick(exam.id, 'practice')}
              className={cn(
                'w-full p-3 rounded-xl border border-border bg-background/50',
                'hover:border-primary/50 hover:bg-primary/5 transition-all group text-left',
                'animate-fade-in'
              )}
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {exam.title}
                    </p>
                    <Badge 
                      variant="secondary" 
                      className={cn('text-[10px] shrink-0', difficultyColors[exam.difficulty])}
                    >
                      {exam.difficulty}
                    </Badge>
                    {exam.is_free && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 shrink-0">
                        Free
                      </Badge>
                    )}
                    {!exam.is_free && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 shrink-0">
                        <Star className="w-2.5 h-2.5 mr-0.5" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px]', subjectColors[exam.subject])}>
                      {exam.subject}
                    </span>
                    <span>{exam.year}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {exam.time_limit}min
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {exam.question_count} Q's
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 ml-2" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* View All Link */}
      <Button
        variant="ghost"
        onClick={() => navigate('/exams')}
        className="w-full mt-4 text-sm text-primary hover:text-primary"
      >
        View all exams
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
