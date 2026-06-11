import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, FileText, Play, LogIn, Search, Grid3X3, List } from 'lucide-react';
import PublicLayout from '../components/layout/PublicLayout';
import ExamFilters from '../components/exam-library/ExamFilters';
import ExamCard from '../components/exam-library/ExamCard';
import ExamListItem from '../components/exam-library/ExamListItem';
import ExamPreviewModal from '../components/exam-library/ExamPreviewModal';
import ExamModeSelectionModal from '../components/exam/ExamModeSelectionModal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { listExamsFirebase, type FirebaseExam } from '@/integrations/firebase/content';
import { ALL_EDUCATION_LEVELS, getEducationLevelsByCountry, SUPPORTED_COUNTRIES } from '@/lib/education-system';
import { PublicPage } from '../types';
import { useAuth } from '@/contexts/AuthContext';

interface PublicBrowsePageProps {
  paperType: 'Past Paper' | 'Practice Paper';
  onNavigateToAuth: () => void;
  onNavigate: (page: PublicPage) => void;
}

type LoadState = 'loading' | 'loaded' | 'error' | 'empty';

export default function PublicBrowsePage({ paperType, onNavigateToAuth, onNavigate }: PublicBrowsePageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  const [allExams, setAllExams] = useState<FirebaseExam[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Preview modal state
  const [previewExam, setPreviewExam] = useState<FirebaseExam | null>(null);
  // Mode selection modal — only used when a signed-in user clicks Start from preview
  const [modeModalOpen, setModeModalOpen] = useState(false);
  const [modeExam, setModeExam] = useState<FirebaseExam | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');

    listExamsFirebase()
      .then(({ items }) => {
        if (cancelled) return;
        // Keep only exams matching the requested paper type.
        const filtered = paperType === 'Past Paper'
          ? items.filter(e => !e.type || e.type === 'Past Paper')
          : items.filter(e => e.type === 'Practice Paper');
        setAllExams(filtered);
        setLoadState(filtered.length === 0 ? 'empty' : 'loaded');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });

    return () => { cancelled = true; };
  }, [paperType]);

  const {
    availableCountries,
    availableLevels,
    availableSubjects,
    availableYears,
    availableSources,
  } = useMemo(() => {
    // Narrow by country first for level/subject/year/source options
    const byCountry = selectedCountry === 'All'
      ? allExams
      : allExams.filter(e => e.country === selectedCountry);
    const byLevel = selectedLevel === 'All'
      ? byCountry
      : byCountry.filter(e => e.level === selectedLevel);

    // Available countries derived from all exams
    const countrySet = new Set(allExams.map(e => e.country).filter(Boolean));
    const countries = SUPPORTED_COUNTRIES
      .filter(c => countrySet.has(c.code))
      .map(c => c.code);

    // Available levels from country-filtered set
    const levelSet = new Set(byCountry.map(e => e.level).filter(Boolean));
    const levels = ALL_EDUCATION_LEVELS.filter(l => levelSet.has(l));

    const subjects = [...new Set(byLevel.map(e => e.subject))].sort();
    const years = [...new Set(byLevel.map(e => e.year.toString()).filter(y => y !== '0'))].sort((a, b) => parseInt(b) - parseInt(a));
    const sources = [...new Set(byLevel.map(e => e.source).filter((s): s is string => Boolean(s)))].sort();

    return {
      availableCountries: countries,
      availableLevels: levels.length > 0 ? levels : getEducationLevelsByCountry('UGANDA'),
      availableSubjects: subjects,
      availableYears: years,
      availableSources: sources,
    };
  }, [allExams, selectedCountry, selectedLevel]);

  const filtered = useMemo(() => {
    return allExams.filter(exam => {
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
  }, [allExams, selectedCountry, selectedLevel, selectedSubject, selectedYear, selectedDifficulty, selectedSource, searchQuery]);

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

  const handleStart = (examId: string) => {
    if (!isAuthenticated) {
      onNavigateToAuth();
      return;
    }

    const exam = allExams.find(e => e.id === examId) ?? null;
    if (exam) {
      setModeExam(exam);
      setModeModalOpen(true);
    }
  };

  // Open preview modal on card click
  const handlePreview = (examId: string) => {
    const exam = allExams.find(e => e.id === examId) ?? null;
    setPreviewExam(exam);
  };

  // Called from preview modal when an authenticated user clicks Start
  const handleStartFromPreview = (examId: string) => {
    const exam = allExams.find(e => e.id === examId) ?? null;
    if (exam) {
      setModeExam(exam);
      setModeModalOpen(true);
    }
  };

  // Map FirebaseExam to the shape expected by ExamCard / ExamListItem
  const toCardProps = (exam: FirebaseExam) => ({
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    year: exam.year,
    level: exam.level,
    country: exam.country ?? null,
    difficulty: exam.difficulty ?? 'Medium',
    time_limit: exam.time_limit ?? 0,
    question_count: exam.question_count ?? 0,
    avg_score: undefined,
    is_free: exam.is_free ?? true,
    description: exam.description ?? null,
    source: exam.source ?? null,
    examAuthority: exam.examAuthority ?? null,
  });

  const isPracticePaper = paperType === 'Practice Paper';

  return (
    <PublicLayout onNavigateToAuth={onNavigateToAuth} onNavigate={onNavigate}>
      <main className="py-10 px-4 sm:px-6 min-h-screen">
        <div className="container mx-auto max-w-6xl">

          {/* Page header */}
          <div className="mb-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
              <button onClick={() => onNavigate('landing')} className="hover:text-foreground transition-colors">Home</button>
              <span>/</span>
              <span className="text-foreground">{isPracticePaper ? 'Practice Papers' : 'Past Papers'}</span>
            </div>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  {isPracticePaper
                    ? <><Library className="w-7 h-7 text-secondary" /> Practice Papers</>
                    : <><FileText className="w-7 h-7 text-primary" /> Past Papers</>
                  }
                </h1>
                <p className="text-muted-foreground mt-1.5 max-w-xl">
                  {isPracticePaper
                    ? 'Mock and practice papers from schools and institutions across East Africa. Click any paper to preview. Sign in to start practising.'
                    : 'Official national exam papers from across East Africa, organised by country and level. Click any paper to preview. Sign in to start practising.'
                  }
                </p>
              </div>

              <Button onClick={onNavigateToAuth} className="gap-2 shrink-0">
                <LogIn className="w-4 h-4" />
                Sign in to Practice
              </Button>
            </div>
          </div>

          {/* Sign-in banner */}
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-sm">
              <Play className="w-4 h-4 text-primary shrink-0" />
              <span>
                <strong>Browsing is free.</strong>{' '}
                Create an account to unlock 2 free practice sessions — no payment required.
              </span>
            </div>
            <Button size="sm" onClick={onNavigateToAuth} variant="outline" className="gap-1.5 shrink-0">
              <LogIn className="w-3.5 h-3.5" />
              Get started free
            </Button>
          </div>

          {/* Content area */}
          {loadState === 'loading' && (
            <div className="py-24 text-center text-muted-foreground">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              Loading exam library…
            </div>
          )}

          {loadState === 'error' && (
            <div className="py-24 text-center">
              <Library className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to load exams</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Please try again. If the problem persists, check your connection.
              </p>
            </div>
          )}

          {loadState === 'empty' && (
            <div className="py-24 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No {isPracticePaper ? 'practice' : 'past'} papers yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {isPracticePaper
                  ? 'Practice papers from schools and institutions are being added. Check back soon, or browse past papers in the meantime.'
                  : 'No exam papers are available yet. We are adding more papers — check back soon.'}
              </p>
              {isPracticePaper && (
                <Button variant="outline" onClick={() => onNavigate('past-papers')} className="gap-2">
                  <FileText className="w-4 h-4" />
                  Browse Past Papers
                </Button>
              )}
            </div>
          )}

          {loadState === 'loaded' && (
            <>
              {/* Filters */}
              <div className="mb-6">
                <ExamFilters
                  paperType={paperType}
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
              </div>

              {/* Results bar */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? 'paper' : 'papers'}
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

              {/* Exam list/grid */}
              {filtered.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-border">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-1">No papers match your filters</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-3">
                  {filtered.map((exam, i) => (
                    <ExamListItem
                      key={exam.id}
                      exam={toCardProps(exam)}
                      onStart={handleStart}
                      onPreview={handlePreview}
                      index={i}
                      startLabel={isAuthenticated ? 'Start Exam' : 'Sign in to practice'}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((exam, i) => (
                    <ExamCard
                      key={exam.id}
                      exam={toCardProps(exam)}
                      onStart={handleStart}
                      onPreview={handlePreview}
                      index={i}
                      startLabel={isAuthenticated ? 'Start Exam' : 'Sign in to practice'}
                    />
                  ))}
                </div>
              )}

              {/* Bottom CTA */}
              <div className="mt-12 text-center py-10 bg-card border border-border rounded-2xl">
                <h3 className="text-lg font-bold mb-2">Ready to start practising?</h3>
                <p className="text-muted-foreground text-sm mb-5">
                  Create a free account and use 2 practice sessions at no cost.
                </p>
                <Button onClick={onNavigateToAuth} className="gap-2" size="lg">
                  <Play className="w-4 h-4" />
                  Start Practicing Free
                </Button>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Exam preview modal */}
      <ExamPreviewModal
        exam={previewExam}
        open={previewExam !== null}
        onClose={() => setPreviewExam(null)}
        onStartExam={handleStartFromPreview}
        onSignIn={onNavigateToAuth}
      />

      {/* Mode selection modal — for authenticated users starting from preview */}
      {modeExam && (
        <ExamModeSelectionModal
          open={modeModalOpen}
          onOpenChange={(open) => { setModeModalOpen(open); if (!open) setModeExam(null); }}
          examId={modeExam.id}
          examTitle={modeExam.title}
          timeLimit={modeExam.time_limit}
        />
      )}
    </PublicLayout>
  );
}
