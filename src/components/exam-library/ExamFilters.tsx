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

interface ExamFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedLevel: string;
  onLevelChange: (value: string) => void;
  selectedSubject: string;
  onSubjectChange: (value: string) => void;
  selectedYear: string;
  onYearChange: (value: string) => void;
  selectedDifficulty: string;
  onDifficultyChange: (value: string) => void;
  availableSubjects: string[];
  availableYears: string[];
}

const levels = ['All', 'PLE', 'UCE', 'UACE'];
const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

export default function ExamFilters({
  searchQuery,
  onSearchChange,
  selectedLevel,
  onLevelChange,
  selectedSubject,
  onSubjectChange,
  selectedYear,
  onYearChange,
  selectedDifficulty,
  onDifficultyChange,
  availableSubjects,
  availableYears,
}: ExamFiltersProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
      {/* Level Toggle Badges */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          Find Exams by Your Level
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-foreground mb-2">
            Search Exams
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="e.g., Mathematics, 2023..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Subject Filter */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Subject
          </label>
          <Select value={selectedSubject} onValueChange={onSubjectChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="All">All</SelectItem>
              {availableSubjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year Filter */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Year
          </label>
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="All">All</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Difficulty Filter */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Difficulty
          </label>
          <Select value={selectedDifficulty} onValueChange={onDifficultyChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {difficulties.map((diff) => (
                <SelectItem key={diff} value={diff}>
                  {diff}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
