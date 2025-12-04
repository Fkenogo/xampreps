import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Clock, 
  BookOpen,
  Star,
  Lock,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Exam = Database['public']['Tables']['exams']['Row'];

interface ExamsPageProps {
  type?: 'Past Paper' | 'Practice Paper';
}

export default function ExamsPage({ type }: ExamsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [subjectFilter, setSubjectFilter] = useState(searchParams.get('subject') || 'all');
  const [levelFilter, setLevelFilter] = useState(searchParams.get('level') || 'all');

  useEffect(() => {
    const fetchExams = async () => {
      let query = supabase
        .from('exams')
        .select('*')
        .order('year', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      if (levelFilter && levelFilter !== 'all') {
        query = query.eq('level', levelFilter as 'PLE' | 'UCE' | 'UACE');
      }

      if (subjectFilter && subjectFilter !== 'all') {
        query = query.eq('subject', subjectFilter);
      }

      const { data } = await query;
      
      if (data) {
        let filtered = data;
        if (searchQuery) {
          filtered = data.filter(e => 
            e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.subject.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        setExams(filtered);
      }
      setLoading(false);
    };

    fetchExams();
  }, [subjectFilter, levelFilter, searchQuery, type]);

  const subjects = ['Mathematics', 'English', 'Science', 'Social Studies'];
  const levels = ['PLE', 'UCE', 'UACE'];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-emerald-500 bg-emerald-500/10';
      case 'Medium': return 'text-amber-500 bg-amber-500/10';
      case 'Hard': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {type === 'Past Paper' ? 'Past Papers 📜' : type === 'Practice Paper' ? 'Practice Papers ✍️' : 'All Exams 📚'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {type ? `Browse ${type.toLowerCase()}s` : 'Browse and take practice exams'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {levels.map(level => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Exams Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No exams found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all group"
              >
                {/* Exam Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      getDifficultyColor(exam.difficulty)
                    )}>
                      {exam.difficulty}
                    </span>
                    {!exam.is_free && (
                      <span className="flex items-center gap-1 text-amber-500 text-xs font-medium">
                        <Lock className="w-3 h-3" />
                        Premium
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{exam.subject} • {exam.year}</p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {exam.time_limit} min
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {exam.question_count} Q's
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {exam.avg_score}%
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-5 pb-5 pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/exam/${exam.id}?mode=practice`)}
                  >
                    Practice
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => navigate(`/exam/${exam.id}?mode=simulation`)}
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
