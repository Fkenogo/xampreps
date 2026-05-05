import React, { useEffect, useState } from 'react';
import { Check, X, Minus, Building2, Zap, Star, Sparkles } from 'lucide-react';
import PublicLayout from '../components/layout/PublicLayout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { cn } from '@/lib/utils';
import { getPricingPlans, SEED_PLANS, type PricingPlan } from '@/integrations/firebase/pricing';
import { PublicPage } from '../types';

interface PricingPageProps {
  onNavigateToAuth: () => void;
  onNavigate: (page: PublicPage) => void;
}

const TIER_GRADIENT: Record<string, string> = {
  basic: 'from-slate-500 to-slate-600',
  standard: 'from-primary to-primary/80',
  premium: 'from-violet-500 to-purple-600',
  pay_per_paper: 'from-emerald-500 to-teal-600',
  school: 'from-amber-500 to-orange-600',
};

const TIER_ICON: Record<string, React.ElementType> = {
  basic: Zap,
  standard: Star,
  premium: Sparkles,
  pay_per_paper: Minus,
  school: Building2,
};

function FeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {included ? (
        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
      )}
      <span className={included ? 'text-foreground' : 'text-muted-foreground line-through'}>{label}</span>
    </li>
  );
}

function SubscriptionCard({
  plan,
  annual,
  onSelect,
}: {
  plan: PricingPlan;
  annual: boolean;
  onSelect: () => void;
}) {
  const Icon = TIER_ICON[plan.tierType] || Star;
  const gradient = TIER_GRADIENT[plan.tierType] || TIER_GRADIENT.standard;
  const price = annual ? plan.annualPriceUsd : plan.monthlyPriceUsd;
  const monthlyEquivalent = annual && plan.annualPriceUsd ? Math.round(plan.annualPriceUsd / 10) : plan.monthlyPriceUsd;

  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-card overflow-hidden flex flex-col',
        plan.isHighlighted
          ? 'border-primary shadow-lg shadow-primary/15 ring-1 ring-primary/30'
          : 'border-border',
      )}
    >
      {/* Top colour strip */}
      <div className={cn('h-1.5 bg-gradient-to-r', gradient)} />

      {/* Highlight badge */}
      {plan.highlightLabel && (
        <div className="absolute top-4 right-4">
          <Badge className="bg-primary text-primary-foreground text-xs">{plan.highlightLabel}</Badge>
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', gradient)}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">{plan.name}</h3>
            <p className="text-xs text-muted-foreground">{plan.description}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-5">
          {plan.monthlyPriceUsd !== null ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">
                  ${annual ? monthlyEquivalent : plan.monthlyPriceUsd}
                </span>
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
              {annual && plan.annualPriceUsd !== null && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Billed ${plan.annualPriceUsd}/year &nbsp;·&nbsp;
                  <span className="text-emerald-600 font-medium">Save 2 months</span>
                </p>
              )}
              {!annual && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Or ${plan.annualPriceUsd}/year &nbsp;·&nbsp;
                  <span className="text-emerald-600 font-medium">Save 2 months</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Pricing at checkout</p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2 mb-6 flex-1">
          {plan.featuresIncluded.map((f) => (
            <FeatureRow key={f} label={f} included />
          ))}
          {plan.featuresExcluded.map((f) => (
            <FeatureRow key={f} label={f} included={false} />
          ))}
        </ul>

        {/* CTA */}
        <Button
          onClick={onSelect}
          className={cn(
            'w-full',
            plan.isHighlighted ? `bg-gradient-to-r ${gradient} hover:opacity-90 border-0` : '',
          )}
          variant={plan.isHighlighted ? 'default' : 'outline'}
        >
          Get {plan.name}
        </Button>
      </div>
    </div>
  );
}

function PayPerPaperCard({ plan, onSelect }: { plan: PricingPlan; onSelect: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className={cn('h-1.5 bg-gradient-to-r', TIER_GRADIENT.pay_per_paper)} />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-lg">{plan.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold">${plan.perPaperPriceUsd}</p>
            <p className="text-xs text-muted-foreground">per paper</p>
          </div>
        </div>

        <ul className="space-y-2 mb-5">
          {plan.featuresIncluded.map((f) => (
            <FeatureRow key={f} label={f} included />
          ))}
        </ul>

        <Button onClick={onSelect} variant="outline" className="w-full">
          Buy a paper
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Subscription is better value if you practice regularly
        </p>
      </div>
    </div>
  );
}

function SchoolCard({ plan, onContact }: { plan: PricingPlan; onContact: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 overflow-hidden">
      <div className={cn('h-1.5 bg-gradient-to-r', TIER_GRADIENT.school)} />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <Building2 className="w-6 h-6 text-amber-600" />
          <div>
            <h3 className="font-bold text-lg">{plan.name}</h3>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          </div>
        </div>

        {plan.bulkMinimumStudents && plan.bulkDiscountPercent && (
          <div className="flex items-center gap-4 mb-4 text-sm">
            <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300">
              {plan.bulkMinimumStudents}+ students
            </Badge>
            <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-300">
              {plan.bulkDiscountPercent}% off standard rates
            </Badge>
          </div>
        )}

        <ul className="space-y-2 mb-5">
          {plan.featuresIncluded.map((f) => (
            <FeatureRow key={f} label={f} included />
          ))}
        </ul>

        <Button
          onClick={onContact}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        >
          Contact us for school pricing
        </Button>
      </div>
    </div>
  );
}

const FAQS = [
  {
    q: 'Can I upgrade anytime?',
    a: 'Yes. You can upgrade at any time. Contact us if you need help managing your subscription.',
  },
  {
    q: 'How do I pay?',
    a: 'Payment options are shown at checkout. Prices are listed in USD; your local currency equivalent is shown when you pay.',
  },
  {
    q: 'What is annual billing?',
    a: 'Paying annually gives you 2 months free. For example, Standard at $7/month billed annually is $70/year — you save $14.',
  },
  {
    q: 'Can one account be used by multiple students?',
    a: 'Each student needs their own account for accurate tracking and personalised progress.',
  },
  {
    q: 'Do school plans work differently?',
    a: 'Yes. School plans are managed — we handle setup, student access, and bulk billing. Contact us to discuss your school needs.',
  },
];

export default function PricingPage({ onNavigateToAuth, onNavigate }: PricingPageProps) {
  const [annual, setAnnual] = useState(false);
  const [plans, setPlans] = useState<PricingPlan[]>(SEED_PLANS);

  // Try to load plans from Firestore; silently fall back to seed data
  useEffect(() => {
    let cancelled = false;
    getPricingPlans()
      .then((result) => {
        if (!cancelled && result.length > 0) {
          setPlans(result);
        }
      })
      .catch(() => {
        // Keep seed data
      });
    return () => { cancelled = true; };
  }, []);

  const visiblePlans = plans.filter((p) => p.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
  const subscriptionPlans = visiblePlans.filter((p) => p.tierType === 'basic' || p.tierType === 'standard' || p.tierType === 'premium');
  const payPerPaperPlan = visiblePlans.find((p) => p.tierType === 'pay_per_paper') ?? null;
  const schoolPlan = visiblePlans.find((p) => p.tierType === 'school') ?? null;

  const handleContact = () => {
    window.location.href = 'mailto:schools@xampreps.com?subject=School Plan Inquiry';
  };

  return (
    <PublicLayout onNavigateToAuth={onNavigateToAuth} onNavigate={onNavigate}>
      <main className="py-10 px-4 sm:px-6 min-h-screen">
        <div className="container mx-auto max-w-5xl">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-6">
            <button onClick={() => onNavigate('landing')} className="hover:text-foreground transition-colors">Home</button>
            <span>/</span>
            <span className="text-foreground">Pricing</span>
          </div>

          {/* Hero */}
          <div className="text-center mb-10 space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold">Simple, honest pricing</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Start free. Upgrade when you are ready. All plans include past papers and practice papers.
            </p>
            <p className="text-xs text-muted-foreground">
              Prices shown in USD. Local currency is shown at checkout.
            </p>
          </div>

          {/* Free tier callout */}
          <div className="mb-8 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm">
              <span className="font-semibold">Free access:</span>{' '}
              Every new account includes 2 practice sessions at no cost. No payment required to get started.
            </div>
            <Button size="sm" onClick={onNavigateToAuth} className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
              Start for free
            </Button>
          </div>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Label htmlFor="billing-toggle" className={cn('text-sm', !annual && 'font-semibold')}>
              Monthly
            </Label>
            <Switch id="billing-toggle" checked={annual} onCheckedChange={setAnnual} />
            <Label htmlFor="billing-toggle" className={cn('text-sm', annual && 'font-semibold')}>
              Annual
            </Label>
            {annual && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                Save 2 months
              </Badge>
            )}
          </div>

          {/* Subscription tier cards */}
          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {subscriptionPlans.map((plan) => (
              <SubscriptionCard
                key={plan.id}
                plan={plan}
                annual={annual}
                onSelect={onNavigateToAuth}
              />
            ))}
          </div>

          <div className="flex items-center gap-4 mb-10">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground font-medium">OR</span>
            <Separator className="flex-1" />
          </div>

          {/* Pay per paper */}
          {payPerPaperPlan && (
            <div className="mb-10 max-w-lg mx-auto">
              <PayPerPaperCard plan={payPerPaperPlan} onSelect={onNavigateToAuth} />
            </div>
          )}

          {/* School section */}
          {schoolPlan && (
            <div className="mb-10">
              <SchoolCard plan={schoolPlan} onContact={handleContact} />
            </div>
          )}

          {/* FAQ */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-center mb-5">Frequently asked questions</h2>
            <Accordion type="single" collapsible className="w-full max-w-2xl mx-auto">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Final CTA */}
          <div className="text-center py-10 bg-card border border-border rounded-2xl">
            <p className="text-lg font-bold mb-1">Exams reward practice.</p>
            <p className="text-muted-foreground text-sm mb-5">XamPreps makes practice simple.</p>
            <Button onClick={onNavigateToAuth} size="lg" className="gap-2">
              Get started free
            </Button>
          </div>

        </div>
      </main>
    </PublicLayout>
  );
}
