import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FreeTrialCardProps {
  onSelect: () => void;
}

const FreeTrialCard: React.FC<FreeTrialCardProps> = ({ onSelect }) => {
  const includes = ['Instant score', 'Sample explanations'];
  const excludes = ['Repeat attempts', 'Progress tracking', 'Parent dashboard'];

  return (
    <Card className="border border-border bg-muted/30">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-lg">Free trial</CardTitle>
        <p className="text-sm text-muted-foreground">Try 1 full exam.</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <ul className="space-y-1.5">
          {includes.map((item, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Does not include</p>
          <ul className="space-y-1.5">
            {excludes.map((item, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="h-4 w-4 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button 
          onClick={onSelect} 
          variant="secondary"
          className="w-full"
        >
          👉 Start free trial
        </Button>
      </CardContent>
    </Card>
  );
};

export default FreeTrialCard;