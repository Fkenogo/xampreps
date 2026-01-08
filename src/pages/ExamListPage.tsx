import React, { useState, useMemo } from 'react';
import PublicLayout from '../components/layout/PublicLayout';
import ExamFilters from '../components/exam-library/ExamFilters';
import ExamListItem from '../components/exam-library/ExamListItem';
import ExamCard from '../components/exam-library/ExamCard';
import { DocumentTextIcon } from '../components/icons';
import { Exam, EducationLevel, PublicPage } from '../types';
import { Grid3X3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExamListPageProps {
  pageType: 'Past Paper' | 'Practice Paper';
  allExams: Exam[];
  onNavigateToAuth: () => void;
  onNavigate: (page: PublicPage) => void;
}

const ExamListPage: React.FC<ExamListPageProps> = ({ pageType, allExams, onNavigateToAuth, onNavigate }) => {
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const papersForType = useMemo(() => allExams.filter(e => e.type === pageType), [allExams, pageType]);

  const { availableSubjects, availableYears } = useMemo(() => {
    const papers = selectedLevel === 'All' ? papersForType : papersForType.filter(p => p.level === selectedLevel);
    const subjects = [...new Set(papers.map(p => p.subject))].sort();
    const years = [...new Set(papers.map(p => p.year.toString()))].sort((a, b) => parseInt(b) - parseInt(a));
    return { availableSubjects: subjects, availableYears: years };
  }, [papersForType, selectedLevel]);

  const filteredPapers = useMemo(() => {
    return papersForType.filter(paper => {
      if (selectedLevel !== 'All' && paper.level !== selectedLevel) return false;
      if (selectedSubject !== 'All' && paper.subject !== selectedSubject) return false;
      if (selectedYear !== 'All' && paper.year.toString() !== selectedYear) return false;
      if (selectedDifficulty !== 'All' && paper.difficulty !== selectedDifficulty) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!paper.title.toLowerCase().includes(query) && 
            !paper.subject.toLowerCase().includes(query) &&
            !paper.year.toString().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [papersForType, selectedLevel, selectedSubject, selectedYear, selectedDifficulty, searchQuery]);

  const handleLevelChange = (level: string) => {
    setSelectedLevel(level);
    setSelectedSubject('All');
    setSelectedYear('All');
  };

  const handleStartExam = (examId: string) => {
    onNavigateToAuth();
  };

  // Convert Exam type to match component props
  const examToComponentProps = (paper: Exam) => ({
    id: paper.id,
    title: paper.title,
    subject: paper.subject,
    year: paper.year,
    level: paper.level,
    difficulty: paper.difficulty,
    time_limit: paper.timeLimit,
    question_count: paper.questionCount,
    avg_score: paper.avgScore,
    is_free: paper.isFree,
    description: paper.description,
  });

  return (
    <PublicLayout onNavigateToAuth={onNavigateToAuth} onNavigate={onNavigate}>
      <main className="py-8 sm:py-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-foreground">
              {pageType === 'Past Paper' ? 'Past Papers' : 'Practice Papers'}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {pageType === 'Past Paper' 
                ? 'Browse our collection of past papers to sharpen your skills.'
                : 'Practice with our curated question sets designed to help you master key topics.'}
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6">
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
          </div>

          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredPapers.length} {filteredPapers.length === 1 ? 'paper' : 'papers'}
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

          {/* Results */}
          {filteredPapers.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <DocumentTextIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">No papers found</h3>
              <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {filteredPapers.map((paper, index) => (
                <ExamListItem
                  key={paper.id}
                  exam={examToComponentProps(paper)}
                  onStart={handleStartExam}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPapers.map((paper, index) => (
                <ExamCard
                  key={paper.id}
                  exam={examToComponentProps(paper)}
                  onStart={handleStartExam}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </PublicLayout>
  );
};

export default ExamListPage;
