import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { COUNTRY_LABELS } from '@/lib/education-system';

interface ExamFiltersProps {
  paperType?: 'Past Paper' | 'Practice Paper';
  searchQuery: string;
  onSearchChange: (value: string) => void;
  // Country filter — optional, only shown when multiple countries are in the data
  selectedCountry?: string;
  onCountryChange?: (value: string) => void;
  availableCountries?: string[];
  // Level pills
  selectedLevel: string;
  onLevelChange: (value: string) => void;
  availableLevels: string[];
  // Subject, Year, Source, Difficulty dropdowns
  selectedSubject: string;
  onSubjectChange: (value: string) => void;
  selectedYear: string;
  onYearChange: (value: string) => void;
  selectedDifficulty: string;
  onDifficultyChange: (value: string) => void;
  availableSubjects: string[];
  availableYears: string[];
  // Source filter — for Practice Papers
  selectedSource?: string;
  onSourceChange?: (value: string) => void;
  availableSources?: string[];
}

const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

function countryLabel(code: string): string {
  return (COUNTRY_LABELS as Record<string, string>)[code] ?? code;
}

export default function ExamFilters({
  paperType,
  searchQuery,
  onSearchChange,
  selectedCountry = 'All',
  onCountryChange,
  availableCountries = [],
  selectedLevel,
  onLevelChange,
  selectedSubject,
  onSubjectChange,
  selectedYear,
  onYearChange,
  selectedDifficulty,
  onDifficultyChange,
  availableLevels,
  availableSubjects,
  availableYears,
  selectedSource = 'All',
  onSourceChange,
  availableSources = [],
}: ExamFiltersProps) {
  const levels = ['All', ...availableLevels];
  const showCountryFilter = Boolean(onCountryChange);
  const isPracticePaper = paperType === 'Practice Paper';
  const showSourceFilter = isPracticePaper && Boolean(onSourceChange);
  const showYearFilter = !isPracticePaper || availableYears.length > 0;

  // For Practice Papers the dropdown grid is: Search | Subject | Source | Difficulty
  // For Past Papers: Search | Subject | Year | Difficulty
  const dropdownCount = 4;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">

      {/* Country filter — only shown when multiple countries present */}
      {showCountryFilter && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">Country</label>
          <div className="flex flex-wrap gap-2">
            {['All', ...availableCountries].map((code) => (
              <button
                key={code}
                onClick={() => onCountryChange!(code)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                  selectedCountry === code
                    ? 'bg-secondary text-secondary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {code === 'All' ? 'All Countries' : countryLabel(code)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Level Toggle Badges */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          {showCountryFilter ? 'Exam Level' : 'Find Exams by Your Level'}
        </label>
        <div className="flex flex-wrap gap-2">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => onLevelChange(level)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                selectedLevel === level
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filters Row */}
      <div className={cn('grid grid-cols-1 gap-4', `md:grid-cols-${dropdownCount}`)}>
        {/* Search */}
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-foreground mb-2">Search Exams</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isPracticePaper ? 'e.g., Mathematics, school…' : 'e.g., Mathematics, 2023…'}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Subject Filter */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
          <Select value={selectedSubject} onValueChange={onSubjectChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="All">All</SelectItem>
              {availableSubjects.map((subject) => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source (Practice Papers) or Year (Past Papers) */}
        {showSourceFilter ? (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Source / Publisher</label>
            <Select value={selectedSource} onValueChange={onSourceChange!}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="All">All</SelectItem>
                {availableSources.map((src) => (
                  <SelectItem key={src} value={src}>{src}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : showYearFilter ? (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Year</label>
            <Select value={selectedYear} onValueChange={onYearChange}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="All">All</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div /> /* placeholder to keep grid alignment */
        )}

        {/* Difficulty Filter */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Difficulty</label>
          <Select value={selectedDifficulty} onValueChange={onDifficultyChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {difficulties.map((diff) => (
                <SelectItem key={diff} value={diff}>{diff}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Optional year for Practice Papers (secondary filter) */}
      {isPracticePaper && availableYears.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Filter by year:</span>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...availableYears].map((year) => (
              <button
                key={year}
                onClick={() => onYearChange(year)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-all duration-200',
                  selectedYear === year
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
