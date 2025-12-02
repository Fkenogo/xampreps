import React, { useState, useMemo } from 'react';
import PublicLayout from '../components/layout/PublicLayout';
import { DocumentTextIcon, ClockIcon } from '../components/icons';
import { Exam, EducationLevel, PublicPage } from '../types';

interface ExamListPageProps {
  pageType: 'Past Paper' | 'Practice Paper';
  allExams: Exam[];
  onNavigateToAuth: () => void;
  onNavigate: (page: PublicPage) => void;
}

const subjectColors: { [key: string]: string } = {
  Mathematics: 'bg-blue-100 text-blue-800',
  English: 'bg-red-100 text-red-800',
  Science: 'bg-green-100 text-green-800',
  SST: 'bg-yellow-100 text-yellow-800',
  Physics: 'bg-indigo-100 text-indigo-800',
  Chemistry: 'bg-purple-100 text-purple-800',
  Biology: 'bg-pink-100 text-pink-800',
};

const difficultyColors: { [key: string]: string } = {
  Easy: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Hard: 'bg-red-100 text-red-800',
};

const ExamListPage: React.FC<ExamListPageProps> = ({ pageType, allExams, onNavigateToAuth, onNavigate }) => {
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | 'All'>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');

  const papersForType = useMemo(() => allExams.filter(e => e.type === pageType), [allExams, pageType]);

  const { availableSubjects, availableYears } = useMemo(() => {
    const papers = selectedLevel === 'All' ? papersForType : papersForType.filter(p => p.level === selectedLevel);
    const subjects = ['All', ...new Set(papers.map(p => p.subject))];
    const years = ['All', ...new Set(papers.map(p => p.year.toString()))].sort((a, b) => {
      if (a === 'All') return -1;
      if (b === 'All') return 1;
      return parseInt(b) - parseInt(a);
    });
    return { availableSubjects: subjects, availableYears: years };
  }, [papersForType, selectedLevel]);

  const filteredPapers = useMemo(() => {
    return papersForType.filter(paper => {
      if (selectedLevel !== 'All' && paper.level !== selectedLevel) return false;
      if (selectedSubject !== 'All' && paper.subject !== selectedSubject) return false;
      if (selectedYear !== 'All' && paper.year.toString() !== selectedYear) return false;
      return true;
    });
  }, [papersForType, selectedLevel, selectedSubject, selectedYear]);

  return (
    <PublicLayout onNavigateToAuth={onNavigateToAuth} onNavigate={onNavigate}>
      <main className="py-12 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              {pageType === 'Past Paper' ? 'Past Papers' : 'Practice Papers'}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {pageType === 'Past Paper' 
                ? 'Access official past examination papers from PLE, UCE, and UACE exams.'
                : 'Practice with our curated question sets designed to help you master key topics.'}
            </p>
          </div>

          {/* Filters */}
          <div className="bg-card rounded-xl p-6 shadow-sm mb-8">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Level</label>
                <select 
                  value={selectedLevel} 
                  onChange={(e) => {
                    setSelectedLevel(e.target.value as EducationLevel | 'All');
                    setSelectedSubject('All');
                    setSelectedYear('All');
                  }}
                  className="input-style"
                >
                  <option value="All">All Levels</option>
                  <option value="PLE">PLE</option>
                  <option value="UCE">UCE</option>
                  <option value="UACE">UACE</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Subject</label>
                <select 
                  value={selectedSubject} 
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="input-style"
                >
                  {availableSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject === 'All' ? 'All Subjects' : subject}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Year</label>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="input-style"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year === 'All' ? 'All Years' : year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="mb-4 text-muted-foreground">
            Showing {filteredPapers.length} {filteredPapers.length === 1 ? 'paper' : 'papers'}
          </div>

          {filteredPapers.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl">
              <DocumentTextIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No papers found</h3>
              <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPapers.map(paper => (
                <div key={paper.id} className="bg-card rounded-xl shadow-sm p-6 card-hover">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${subjectColors[paper.subject] || 'bg-gray-100 text-gray-800'}`}>
                      {paper.subject}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${difficultyColors[paper.difficulty]}`}>
                      {paper.difficulty}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-lg mb-2">{paper.title}</h3>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {paper.timeLimit} min
                    </span>
                    <span>{paper.questionCount} questions</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs px-2 py-1 bg-muted rounded">{paper.level}</span>
                    <span className="text-xs text-muted-foreground">{paper.year}</span>
                  </div>
                  
                  <button
                    onClick={onNavigateToAuth}
                    className={`w-full py-2 rounded-lg font-semibold transition-all ${
                      paper.isFree
                        ? 'gradient-primary text-primary-foreground hover:opacity-90'
                        : 'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                    }`}
                  >
                    {paper.isFree ? 'Start Free' : 'Premium'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </PublicLayout>
  );
};

export default ExamListPage;
