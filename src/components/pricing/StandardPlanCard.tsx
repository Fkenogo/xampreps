import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface StandardPlanCardProps {
  onSelect: () => void;
}

const StandardPlanCard: React.FC<StandardPlanCardProps> = ({ onSelect }) => {
  const [isAnnual, setIsAnnual] = useState(false);

  const monthlyPrice = 20000;
  const annualPrice = 200000;
  const annualMonthlyEquivalent = Math.round(annualPrice / 12);
  const monthlySavings = monthlyPrice - annualMonthlyEquivalent;

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
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Label 
            htmlFor="billing-toggle" 
            className={`text-sm cursor-pointer transition-colors ${!isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
          >
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
          <div className="flex items-center gap-2">
            <Label 
              htmlFor="billing-toggle" 
              className={`text-sm cursor-pointer transition-colors ${isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
            >
              Annual
            </Label>
            {isAnnual && (
              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Save 2 months
              </Badge>
            )}
          </div>
        </div>

        <div className="text-center">
          {isAnnual ? (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold">UGX {annualPrice.toLocaleString()}</span>
                <span className="text-muted-foreground text-sm">/ year</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                That's UGX {annualMonthlyEquivalent.toLocaleString()}/month • Save UGX {(monthlySavings * 12).toLocaleString()}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold">UGX {monthlyPrice.toLocaleString()}</span>
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Unlimited exam practice.</p>
            </>
          )}
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
          👉 Go {isAnnual ? 'Annual' : 'Standard'}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          Cancel anytime
        </p>
      </CardContent>
    </Card>
  );
};

export default StandardPlanCard;