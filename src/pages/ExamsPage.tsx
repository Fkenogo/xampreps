import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ExamFilters from '@/components/exam-library/ExamFilters';
import ExamListItem from '@/components/exam-library/ExamListItem';
import ExamCard from '@/components/exam-library/ExamCard';
import { Button } from '@/components/ui/button';
import { BookOpen, Grid3X3, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Exam = Database['public']['Tables']['exams']['Row'];

interface ExamsPageProps {
  type?: 'Past Paper' | 'Practice Paper';
}

export default function ExamsPage({ type }: ExamsPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || 'All');
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get('level') || 'All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    const fetchExams = async () => {
      let query = supabase
        .from('exams')
        .select('*')
        .order('year', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data } = await query;
      
      if (data) {
        setExams(data);
      }
      setLoading(false);
    };

    fetchExams();
  }, [type]);

  // Derive available subjects and years from filtered data
  const { availableSubjects, availableYears, filteredExams } = useMemo(() => {
    let filtered = exams;
    
    // Filter by level first to get available subjects/years
    if (selectedLevel !== 'All') {
      filtered = filtered.filter(e => e.level === selectedLevel);
    }
    
    const subjects = [...new Set(filtered.map(e => e.subject))].sort();
    const years = [...new Set(filtered.map(e => e.year.toString()))].sort((a, b) => parseInt(b) - parseInt(a));
    
    // Apply all filters
    filtered = exams.filter(exam => {
      if (selectedLevel !== 'All' && exam.level !== selectedLevel) return false;
      if (selectedSubject !== 'All' && exam.subject !== selectedSubject) return false;
      if (selectedYear !== 'All' && exam.year.toString() !== selectedYear) return false;
      if (selectedDifficulty !== 'All' && exam.difficulty !== selectedDifficulty) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!exam.title.toLowerCase().includes(query) && 
            !exam.subject.toLowerCase().includes(query) &&
            !exam.year.toString().includes(query)) {
          return false;
        }
      }
      return true;
    });
    
    return { availableSubjects: subjects, availableYears: years, filteredExams: filtered };
  }, [exams, selectedLevel, selectedSubject, selectedYear, selectedDifficulty, searchQuery]);

  const handleLevelChange = (level: string) => {
    setSelectedLevel(level);
    setSelectedSubject('All');
    setSelectedYear('All');
  };

  const handleStartExam = (examId: string, mode: 'practice' | 'simulation') => {
    navigate(`/exam/${examId}?mode=${mode}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {type === 'Past Paper' ? 'Past Papers 📜' : type === 'Practice Paper' ? 'Practice Papers ✍️' : 'All Exams 📚'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {type ? `Browse ${type.toLowerCase()}s and test your knowledge` : 'Browse and take practice exams'}
          </p>
        </div>

        {/* Filters */}
        <ExamFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedLevel={selectedLevel}
          onLevelChange={handleLevelChange}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedDifficulty={selectedDifficulty}
          onDifficultyChange={setSelectedDifficulty}
          availableSubjects={availableSubjects}
          availableYears={availableYears}
        />

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredExams.length} {filteredExams.length === 1 ? 'exam' : 'exams'}
          </p>
          <div className="flex items-center gap-1 border border-border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Exams */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No exams found</h3>
            <p className="text-muted-foreground">Try adjusting your filters to see more results</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredExams.map((exam, index) => (
              <ExamListItem
                key={exam.id}
                exam={exam}
                onStart={handleStartExam}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((exam, index) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onStart={handleStartExam}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
