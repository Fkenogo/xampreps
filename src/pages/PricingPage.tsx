import React from 'react';
import PublicLayout from '../components/layout/PublicLayout';
import StandardPlanCard from '../components/pricing/StandardPlanCard';
import PayPerPaperCard from '../components/pricing/PayPerPaperCard';
import FreeTrialCard from '../components/pricing/FreeTrialCard';
import ParentSection from '../components/pricing/ParentSection';
import SchoolSection from '../components/pricing/SchoolSection';
import PricingFAQ from '../components/pricing/PricingFAQ';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { PublicPage } from '../types';

interface PricingPageProps {
  onNavigateToAuth: () => void;
  onNavigate: (page: PublicPage) => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onNavigateToAuth, onNavigate }) => {
  const handleContactSchools = () => {
    // Could open a contact modal or navigate to contact page
    window.location.href = 'mailto:schools@msomesa.com?subject=School Plan Inquiry';
  };

  return (
    <PublicLayout onNavigateToAuth={onNavigateToAuth} onNavigate={onNavigate}>
      <main className="py-8 px-4 sm:px-6 min-h-screen">
        <div className="max-w-lg mx-auto space-y-8">
          {/* Hero */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">
              Practice how you want.
            </h1>
            <p className="text-lg text-primary font-medium">
              Upgrade anytime.
            </p>
          </div>

          {/* Standard Plan - Primary */}
          <StandardPlanCard onSelect={onNavigateToAuth} />

          {/* Divider */}
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground font-medium">OR</span>
            <Separator className="flex-1" />
          </div>

          {/* Pay Per Paper */}
          <PayPerPaperCard onSelect={onNavigateToAuth} />

          {/* Free Trial */}
          <FreeTrialCard onSelect={onNavigateToAuth} />

          {/* Parent Section */}
          <ParentSection />

          {/* School Section */}
          <SchoolSection onContact={handleContactSchools} />

          {/* FAQ */}
          <PricingFAQ />

          {/* Final CTA */}
          <div className="text-center space-y-4 pt-4 pb-8">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Exams reward practice.</p>
              <p className="font-semibold">Msomesa makes practice simple.</p>
            </div>
            
            <Button 
              onClick={onNavigateToAuth} 
              size="lg" 
              className="w-full max-w-xs text-base py-6"
            >
              👉 Get Started
            </Button>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
};

export default PricingPage;