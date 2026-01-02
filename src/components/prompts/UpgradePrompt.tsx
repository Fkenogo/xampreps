import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type PromptVariant = 
  | 'after-free-trial'
  | 'second-paper'
  | 'limit-reached'
  | 'parent-weak-areas'
  | 'after-3-attempts';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: PromptVariant;
  onUpgrade: () => void;
  onSecondary?: () => void;
}

const promptContent: Record<PromptVariant, {
  title: string;
  message: string;
  primaryText: string;
  secondaryText?: string;
  showSecondary: boolean;
}> = {
  'after-free-trial': {
    title: 'Great job! 🎉',
    message: "You've completed your first exam. Want unlimited practice and full progress tracking?",
    primaryText: 'Upgrade to Standard',
    secondaryText: 'Maybe later',
    showSecondary: true,
  },
  'second-paper': {
    title: 'Before you purchase',
    message: "You're about to buy your second paper this month. Standard gives you unlimited exams for less.",
    primaryText: 'Go Standard',
    secondaryText: 'Buy this paper',
    showSecondary: true,
  },
  'limit-reached': {
    title: 'Paper limit reached',
    message: "You've reached your paper limit for this month. Upgrade to keep practicing without limits.",
    primaryText: 'Upgrade to Standard',
    secondaryText: 'Back',
    showSecondary: true,
  },
  'parent-weak-areas': {
    title: 'Help your child improve',
    message: 'Your child needs more practice in these areas. Standard unlocks unlimited exams and progress tracking.',
    primaryText: 'Upgrade to Standard',
    showSecondary: false,
  },
  'after-3-attempts': {
    title: 'Keep the momentum',
    message: 'Consistent practice improves scores. Standard helps track progress over time.',
    primaryText: 'Unlock Standard',
    secondaryText: 'Not now',
    showSecondary: true,
  },
};

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  open,
  onOpenChange,
  variant,
  onUpgrade,
  onSecondary,
}) => {
  const content = promptContent[variant];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription className="pt-2">
            {content.message}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onUpgrade} className="w-full">
            {content.primaryText}
          </Button>
          
          {content.showSecondary && content.secondaryText && (
            <Button 
              variant="outline" 
              onClick={() => {
                onSecondary?.();
                onOpenChange(false);
              }}
              className="w-full"
            >
              {content.secondaryText}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePrompt;