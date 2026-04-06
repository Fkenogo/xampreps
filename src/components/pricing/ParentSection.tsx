import React from 'react';
import { Eye, TrendingUp, BarChart3 } from 'lucide-react';

const ParentSection: React.FC = () => {
  const benefits = [
    { icon: Eye, text: 'See how often your child practices' },
    { icon: BarChart3, text: 'Understand weak areas' },
    { icon: TrendingUp, text: 'Track improvement over time' },
  ];

  return (
    <div className="bg-muted/50 rounded-xl p-6 text-center">
      <div className="text-2xl mb-2">👨‍👩‍👧</div>
      <h3 className="text-lg font-semibold mb-4">For Parents</h3>
      <p className="text-sm text-muted-foreground mb-4">XamPreps helps you:</p>
      
      <ul className="space-y-3 text-left max-w-xs mx-auto">
        {benefits.map((benefit, index) => (
          <li key={index} className="flex items-center gap-3 text-sm">
            <benefit.icon className="h-4 w-4 text-primary flex-shrink-0" />
            <span>{benefit.text}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm font-medium mt-4 text-primary">
        No guesswork. Just results.
      </p>
    </div>
  );
};

export default ParentSection;