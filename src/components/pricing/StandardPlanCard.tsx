import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StandardPlanCardProps {
  onSelect: () => void;
}

const StandardPlanCard: React.FC<StandardPlanCardProps> = ({ onSelect }) => {
  const features = [
    'Unlimited access to all past exam papers',
    'Full step-by-step explanations for every question',
    'Real exam timing and scoring',
    'Progress tracking over time',
    'Parent access to results and performance',
  ];

  return (
    <Card className="border-2 border-primary shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
      <CardHeader className="text-center pb-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Badge className="bg-primary/10 text-primary border-0 text-xs font-medium">Most popular</Badge>
        </div>
        <CardTitle className="text-xl">Subscription Access</CardTitle>
        <CardDescription className="text-sm">
          Unlimited practice for students preparing seriously for exams.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="text-center py-3 bg-muted/40 rounded-xl">
          <p className="text-sm text-muted-foreground">Monthly and annual plans available</p>
          <p className="text-xs text-muted-foreground mt-1">Pricing shown after sign-up</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Includes</p>
          <ul className="space-y-2.5">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button
          onClick={onSelect}
          className="w-full text-base py-6"
          size="lg"
        >
          Get access
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Contact us to manage your subscription
        </p>
      </CardContent>
    </Card>
  );
};

export default StandardPlanCard;
