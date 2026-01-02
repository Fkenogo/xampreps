import React from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RenewalReminderProps {
  daysRemaining: number;
  onRenew: () => void;
}

const RenewalReminder: React.FC<RenewalReminderProps> = ({ daysRemaining, onRenew }) => {
  if (daysRemaining > 3) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Your Standard access ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Renew to keep practicing without interruption.
          </p>
        </div>
      </div>
      
      <Button size="sm" onClick={onRenew}>
        👉 Renew Standard
      </Button>
    </div>
  );
};

export default RenewalReminder;