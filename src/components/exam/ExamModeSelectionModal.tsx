import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Zap, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExamMode = 'practice' | 'quiz' | 'simulation';

interface ExamModeSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examTitle: string;
  timeLimit: number;
}

const modes = [
  {
    id: 'practice' as ExamMode,
    title: 'Practice Mode',
    description: 'Answer at your own pace. Check each answer and get explanations as you go.',
    icon: BookOpen,
    features: ['No time pressure', 'Check answers anytime', 'See explanations', 'Get AI help'],
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'quiz' as ExamMode,
    title: 'Quiz Mode',
    description: 'Fast-paced learning with immediate feedback after each question.',
    icon: Zap,
    features: ['Immediate feedback', 'Auto-advance', 'Track your speed', 'Quick review'],
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  {
    id: 'simulation' as ExamMode,
    title: 'Exam Simulation',
    description: 'Full exam experience with timer. Just like the real exam!',
    icon: Clock,
    features: ['Timed exam', 'Full paper', 'Results at end', 'Track progress'],
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/20',
  },
];

export default function ExamModeSelectionModal({
  open,
  onOpenChange,
  examId,
  examTitle,
  timeLimit,
}: ExamModeSelectionModalProps) {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<ExamMode>('practice');

  const handleStart = () => {
    navigate(`/exam/${examId}?mode=${selectedMode}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose Your Mode</DialogTitle>
          <DialogDescription>
            How would you like to take "{examTitle}"?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  mode.bgColor,
                  isSelected ? mode.borderColor : 'border-transparent',
                  'hover:border-current',
                  mode.color
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'p-3 rounded-lg',
                    isSelected ? 'bg-white dark:bg-background shadow-sm' : 'bg-background/50'
                  )}>
                    <Icon className={cn('w-6 h-6', mode.color)} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{mode.title}</h3>
                      {isSelected && (
                        <CheckCircle className={cn('w-5 h-5', mode.color)} />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {mode.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {mode.features.map((feature) => (
                        <span
                          key={feature}
                          className="text-xs px-2 py-1 rounded-full bg-background/80 text-muted-foreground"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                    
                    {mode.id === 'simulation' && (
                      <p className="text-sm text-muted-foreground mt-2">
                        ⏱ Time limit: {timeLimit} minutes
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart}>
            Start {modes.find(m => m.id === selectedMode)?.title}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
