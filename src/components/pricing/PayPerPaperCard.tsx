import React from 'react';
import { Check } from 'lucide-react';
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
        <p className="text-sm text-muted-foreground">Access one paper at a time.</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center py-2 bg-muted/40 rounded-xl">
          <p className="text-sm text-muted-foreground">Per-paper pricing available after sign-up</p>
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

        <Button
          onClick={onSelect}
          variant="outline"
          className="w-full"
        >
          View plans
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Subscription is better value if you practice regularly
        </p>
      </CardContent>
    </Card>
  );
};

export default PayPerPaperCard;
