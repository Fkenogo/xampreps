import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UpgradeBannerProps {
  onUpgrade: () => void;
}

const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ onUpgrade }) => {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Consistent practice improves scores.</p>
          <p className="text-xs text-muted-foreground">Standard helps track progress over time.</p>
        </div>
      </div>
      
      <Button size="sm" onClick={onUpgrade}>
        Unlock Standard
      </Button>
    </div>
  );
};

export default UpgradeBanner;