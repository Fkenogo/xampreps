import React, { useState } from 'react';
import PublicLayout from '../components/layout/PublicLayout';
import { CheckIcon } from '../components/icons';
import { PublicPage } from '../types';

interface PricingPageProps {
  onNavigateToAuth: () => void;
  onNavigate: (page: PublicPage) => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onNavigateToAuth, onNavigate }) => {
  const [pricingPlan, setPricingPlan] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      name: 'Free',
      price: { monthly: 0, annual: 0 },
      description: 'Perfect for getting started',
      features: [
        'Access to free past papers',
        'Basic practice mode',
        'Limited AI explanations',
        'Progress tracking',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Student',
      price: { monthly: 15000, annual: 150000 },
      description: 'Best for individual students',
      features: [
        'All past papers access',
        'Unlimited practice & simulations',
        'Full AI-powered explanations',
        'Spaced repetition reviews',
        'Detailed analytics',
        'Study reminders',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'School',
      price: { monthly: 500000, annual: 5000000 },
      description: 'For schools and institutions',
      features: [
        'Everything in Student plan',
        'Unlimited student accounts',
        'Admin dashboard',
        'Class performance reports',
        'Custom exam creation',
        'Priority support',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  const formatPrice = (price: number) => {
    return price === 0 ? 'Free' : `UGX ${price.toLocaleString()}`;
  };

  return (
    <PublicLayout onNavigateToAuth={onNavigateToAuth} onNavigate={onNavigate}>
      <main>
        <section className="py-20 px-6 bg-muted/50">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl font-extrabold mb-4">Choose Your Perfect Plan</h1>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Flexible options for students, parents, and schools. Start for free to experience the full power of Msomesa.
            </p>
            
            {/* Toggle */}
            <div className="flex justify-center items-center gap-4 mb-12">
              <span className={`font-semibold ${pricingPlan === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={pricingPlan === 'annual'} 
                  onChange={() => setPricingPlan(p => p === 'monthly' ? 'annual' : 'monthly')} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-primary after:border-primary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary/30"></div>
              </label>
              <span className={`font-semibold ${pricingPlan === 'annual' ? 'text-primary' : 'text-muted-foreground'}`}>
                Annual
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  Save 17%
                </span>
              </span>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <div 
                  key={plan.name}
                  className={`bg-card rounded-2xl shadow-lg p-8 relative ${
                    plan.popular ? 'ring-2 ring-primary scale-105' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="gradient-primary text-primary-foreground text-sm font-bold px-4 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      {formatPrice(plan.price[pricingPlan])}
                    </span>
                    {plan.price[pricingPlan] > 0 && (
                      <span className="text-muted-foreground">
                        /{pricingPlan === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    )}
                  </div>
                  
                  <ul className="space-y-3 mb-8 text-left">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={onNavigateToAuth}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      plan.popular
                        ? 'gradient-primary text-primary-foreground hover:opacity-90'
                        : 'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <FAQItem 
                question="Can I try Msomesa for free?"
                answer="Yes! Our Free plan gives you access to select past papers and basic features. You can upgrade anytime to unlock all content."
              />
              <FAQItem 
                question="How does the Student plan work?"
                answer="The Student plan gives you unlimited access to all past papers, full AI explanations, and advanced features like spaced repetition and detailed analytics."
              />
              <FAQItem 
                question="Can I cancel my subscription anytime?"
                answer="Absolutely! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period."
              />
              <FAQItem 
                question="Do you offer school discounts?"
                answer="Yes! Schools get special pricing based on the number of students. Contact our sales team for a custom quote."
              />
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
};

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => (
  <div className="bg-card rounded-lg p-6 shadow-sm">
    <h3 className="font-bold text-lg mb-2">{question}</h3>
    <p className="text-muted-foreground">{answer}</p>
  </div>
);

export default PricingPage;
