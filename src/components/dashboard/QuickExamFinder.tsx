import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Filter, ArrowRight, Clock, Star, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Exam = Database['public']['Tables']['exams']['Row'];

const subjects = ['Mathematics', 'Science', 'English', 'Social Studies'];
const levels = ['PLE', 'UCE', 'UACE'] as const;

interface QuickExamFinderProps {
  maxResults?: number;
  showRecommendations?: boolean;
  className?: string;
}

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
      
      // Fetch exams
      let query = supabase.from('exams').select('*');
      
      if (selectedSubject) {
        query = query.eq('subject', selectedSubject);
      }
      
      if (profile?.level) {
        query = query.eq('level', profile.level);
      }

      const { data: examsData } = await query.limit(20);
      
      if (examsData) {
        // Filter by search
        const filtered = examsData.filter(exam => 
          exam.title.toLowerCase().includes(search.toLowerCase()) ||
          exam.subject.toLowerCase().includes(search.toLowerCase())
        );
        setExams(filtered.slice(0, maxResults));
      }

      // Fetch most recent exam attempt
      if (showRecommendations) {
        const { data: recentAttempt } = await supabase
          .from('exam_attempts')
          .select('exam_id, exams(*)')
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();
        
        if (recentAttempt?.exams) {
          setRecentExam(recentAttempt.exams as unknown as Exam);
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
            <p className="text-xs text-muted-foreground">{recentExam.subject}</p>
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
                'hover:border-primary/50 hover:bg-primary/5 transition-all group',
                'opacity-0 animate-slide-up'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {exam.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {exam.time_limit}min
                    </span>
                    <span>•</span>
                    <span>{exam.question_count} questions</span>
                    {exam.is_free && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          FREE
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* View All Link */}
      <button
        onClick={() => navigate('/exams')}
        className="w-full mt-4 text-sm text-primary hover:underline flex items-center justify-center gap-1"
      >
        View all exams
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
