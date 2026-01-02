import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
        <div className="text-xs font-medium text-primary uppercase tracking-wide mb-2">
          Standard Price
        </div>
        <CardTitle className="text-xl">Premium Access</CardTitle>
        <CardDescription className="text-sm">
          Best for students preparing seriously for exams.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold">UGX 20,000</span>
            <span className="text-muted-foreground text-sm">/ month</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Unlimited exam practice.</p>
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
          👉 Go Standard
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          Cancel anytime
        </p>
      </CardContent>
    </Card>
  );
};

export default StandardPlanCard;