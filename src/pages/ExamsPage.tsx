import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { listExamsFirebase, type FirebaseExam } from '@/integrations/firebase/content';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ExamFilters from '@/components/exam-library/ExamFilters';
import ExamListItem from '@/components/exam-library/ExamListItem';
import ExamCard from '@/components/exam-library/ExamCard';
import ExamModeSelectionModal from '@/components/exam/ExamModeSelectionModal';
import ExamPreviewModal from '@/components/exam-library/ExamPreviewModal';
import { Button } from '@/components/ui/button';
import { BookOpen, Grid3X3, List, ChevronRight } from 'lucide-react';
import { ALL_EDUCATION_LEVELS, getEducationLevelsByCountry, SUPPORTED_COUNTRIES } from '@/lib/education-system';

interface ExamsPageProps {
  type?: 'Past Paper' | 'Practice Paper';
}

export default function ExamsPage({ type }: ExamsPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [exams, setExams] = useState<FirebaseExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get('level') || 'All');
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || 'All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Mode selection modal
  const [modeModalOpen, setModeModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<FirebaseExam | null>(null);

  // Preview modal
  const [previewExam, setPreviewExam] = useState<FirebaseExam | null>(null);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await listExamsFirebase(type);
        if (response.ok) {
          // Filter by paper type if specified
          const items = type
            ? response.items.filter(e => e.type === type)
            : response.items;
          setExams(items);
        } else {
          setExams([]);
        }
      } catch (error) {
        console.error('Error fetching Firebase exams:', error);
        setExams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [type]);

  const {
    availableCountries,
    availableLevels,
    availableSubjects,
    availableYears,
    availableSources,
    filteredExams,
  } = useMemo(() => {
    const byCountry = selectedCountry === 'All'
      ? exams
      : exams.filter(e => e.country === selectedCountry);
    const byLevel = selectedLevel === 'All'
      ? byCountry
      : byCountry.filter(e => e.level === selectedLevel);

    const countrySet = new Set(exams.map(e => e.country).filter(Boolean));
    const countries = SUPPORTED_COUNTRIES.filter(c => countrySet.has(c.code)).map(c => c.code);

    const levelSet = new Set(byCountry.map(e => e.level).filter(Boolean));
    const levels = ALL_EDUCATION_LEVELS.filter(l => levelSet.has(l));

    const subjects = [...new Set(byLevel.map(e => e.subject))].sort();
    const years = [...new Set(byLevel.map(e => e.year.toString()).filter(y => y !== '0'))].sort((a, b) => parseInt(b) - parseInt(a));
    const sources = [...new Set(byLevel.map(e => e.source).filter((s): s is string => Boolean(s)))].sort();

    const filtered = exams.filter(exam => {
      if (selectedCountry !== 'All' && exam.country !== selectedCountry) return false;
      if (selectedLevel !== 'All' && exam.level !== selectedLevel) return false;
      if (selectedSubject !== 'All' && exam.subject !== selectedSubject) return false;
      if (selectedYear !== 'All' && exam.year.toString() !== selectedYear) return false;
      if (selectedDifficulty !== 'All' && exam.difficulty !== selectedDifficulty) return false;
      if (selectedSource !== 'All' && exam.source !== selectedSource) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          exam.title.toLowerCase().includes(q) ||
          exam.subject.toLowerCase().includes(q) ||
          exam.year.toString().includes(q) ||
          (exam.source ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    return {
      availableCountries: countries,
      availableLevels: levels.length > 0 ? levels : getEducationLevelsByCountry('UGANDA'),
      availableSubjects: subjects,
      availableYears: years,
      availableSources: sources,
      filteredExams: filtered,
    };
  }, [exams, selectedCountry, selectedLevel, selectedSubject, selectedYear, selectedDifficulty, selectedSource, searchQuery]);

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedLevel('All');
    setSelectedSubject('All');
    setSelectedYear('All');
    setSelectedSource('All');
  };

  const handleLevelChange = (level: string) => {
    setSelectedLevel(level);
    setSelectedSubject('All');
    setSelectedYear('All');
    setSelectedSource('All');
  };

  const handleStartExam = (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (exam) {
      setSelectedExam(exam);
      setModeModalOpen(true);
    }
  };

  const handlePreview = (examId: string) => {
    const exam = exams.find(e => e.id === examId) ?? null;
    setPreviewExam(exam);
  };

  const handleStartFromPreview = (examId: string) => {
    handleStartExam(examId);
  };

  // Derive page title and breadcrumb label from type prop
  const pageLabel = type === 'Past Paper'
    ? 'Past Papers'
    : type === 'Practice Paper'
    ? 'Practice Papers'
    : 'Exam Library';

  const isPracticePaper = type === 'Practice Paper';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">{pageLabel}</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {pageLabel}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isPracticePaper
              ? 'Browse mock and practice papers. Click a paper to preview, then choose your mode.'
              : 'Browse official past exam papers across East Africa. Click a paper to preview, then choose your mode.'}
          </p>
        </div>

        {/* Filters */}
        <ExamFilters
          paperType={type}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCountry={selectedCountry}
          onCountryChange={handleCountryChange}
          availableCountries={availableCountries}
          selectedLevel={selectedLevel}
          onLevelChange={handleLevelChange}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedDifficulty={selectedDifficulty}
          onDifficultyChange={setSelectedDifficulty}
          availableLevels={availableLevels}
          availableSubjects={availableSubjects}
          availableYears={availableYears}
          selectedSource={selectedSource}
          onSourceChange={setSelectedSource}
          availableSources={availableSources}
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
                exam={{
                  ...exam,
                  time_limit: exam.time_limit ?? 0,
                  question_count: exam.question_count ?? 0,
                  is_free: exam.is_free ?? true,
                }}
                onStart={handleStartExam}
                onPreview={handlePreview}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((exam, index) => (
              <ExamCard
                key={exam.id}
                exam={{
                  ...exam,
                  time_limit: exam.time_limit ?? 0,
                  question_count: exam.question_count ?? 0,
                  is_free: exam.is_free ?? true,
                }}
                onStart={handleStartExam}
                onPreview={handlePreview}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Exam Mode Selection Modal */}
        {selectedExam && (
          <ExamModeSelectionModal
            open={modeModalOpen}
            onOpenChange={(open) => { setModeModalOpen(open); if (!open) setSelectedExam(null); }}
            examId={selectedExam.id}
            examTitle={selectedExam.title}
            timeLimit={selectedExam.time_limit}
          />
        )}

        {/* Preview Modal */}
        <ExamPreviewModal
          exam={previewExam}
          open={previewExam !== null}
          onClose={() => setPreviewExam(null)}
          onStartExam={handleStartFromPreview}
          onSignIn={() => navigate('/auth')}
        />
      </div>
    </DashboardLayout>
  );
}
