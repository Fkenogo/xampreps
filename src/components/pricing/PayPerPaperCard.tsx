import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PayPerPaperCardProps {
  onSelect: () => void;
}

const PayPerPaperCard: React.FC<PayPerPaperCardProps> = ({ onSelect }) => {
  return (
    <Card className="border border-border">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-lg">Pay per paper</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-2xl font-bold">UGX 2,000</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">One full past exam.</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Includes</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <span>Instant score</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <span>Full detailed explanations</span>
            </li>
          </ul>
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-300">Max 2 papers per month</span>
        </div>

        <Button 
          onClick={onSelect} 
          variant="outline"
          className="w-full"
        >
          👉 Buy this paper
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          Standard is cheaper if you practice often
        </p>
      </CardContent>
    </Card>
  );
};

export default PayPerPaperCard;