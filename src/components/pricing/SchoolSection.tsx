import React from 'react';
import { Button } from '@/components/ui/button';

interface SchoolSectionProps {
  onContact: () => void;
}

const SchoolSection: React.FC<SchoolSectionProps> = ({ onContact }) => {
  return (
    <div className="bg-muted/50 rounded-xl p-6 text-center">
      <div className="text-2xl mb-2">🏫</div>
      <h3 className="text-lg font-semibold mb-2">Schools & Institutions</h3>
      <p className="text-sm text-muted-foreground mb-4">
        We offer special plans for schools.
        <br />
        Bulk access. Student performance reports.
      </p>
      
      <Button variant="outline" onClick={onContact} className="w-full max-w-xs">
        👉 Contact us to learn more
      </Button>
    </div>
  );
};

export default SchoolSection;