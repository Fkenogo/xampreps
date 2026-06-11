import React from 'react';
import {
  BookOpen, Clock, CheckCircle2, BarChart3, Users, Building2,
  GraduationCap, Briefcase, Play, Zap, Brain, RotateCcw, FileText,
  Library, ChevronRight, Globe, MapPin, Sparkles, Lock,
} from 'lucide-react';
import PublicLayout from '../components/layout/PublicLayout';
import { PublicPage } from '../types';

interface LandingPageProps {
  onNavigateToAuth: () => void;
  onNavigate: (page: PublicPage) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth, onNavigate }) => {
  return (
    <PublicLayout onNavigateToAuth={onNavigateToAuth} onNavigate={onNavigate}>
      <main>

        {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative gradient-dark text-primary-foreground py-24 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate to-slate-dark" />
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full filter blur-3xl opacity-40 animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/20 rounded-full filter blur-3xl opacity-40 animate-pulse" style={{ animationDelay: '3s' }} />

          <div className="container mx-auto text-center relative z-10 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-sm font-medium mb-6 animate-fade-in">
              <Globe className="w-4 h-4" />
              National exams across East Africa
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight animate-fade-in">
              Practice Real Exams.
              <br />
              <span className="text-primary">Before Exam Day.</span>
            </h1>

            <p className="mt-6 text-lg text-muted max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Past papers and practice papers for national exams across East Africa.
              Browse free. Try two practice sessions. Upgrade when you're ready.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <button
                onClick={onNavigateToAuth}
                className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 text-base px-8 py-3"
              >
                <Play className="w-4 h-4" />
                Start Practicing
              </button>
              <button
                onClick={() => onNavigate('past-papers')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-lg border border-primary-foreground/20 text-primary-foreground/80 hover:bg-primary-foreground/10 transition-colors text-base font-medium"
              >
                <Library className="w-4 h-4" />
                Browse Exams
              </button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
              No payment required to browse. 2 free practice sessions per account.
            </p>
          </div>
        </section>

        {/* ── 2. PRACTICE MODES (lead value prop) ─────────────────────────────── */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Three Ways to Prepare</h2>
              <p className="mt-2 text-muted-foreground">Choose the mode that fits how you study today.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <ModeCard
                icon={<BookOpen className="w-7 h-7" />}
                label="Practice Mode"
                tagline="Self-paced learning"
                description="Work through questions at your own pace. Check your answer after each one. See feedback and explanations as you go."
                color="primary"
              />
              <ModeCard
                icon={<Zap className="w-7 h-7" />}
                label="Quiz Mode"
                tagline="Focused question practice"
                description="One question at a time. Immediate feedback after each answer. Good for drilling specific topics between study sessions."
                color="secondary"
                featured
              />
              <ModeCard
                icon={<Clock className="w-7 h-7" />}
                label="Simulation Mode"
                tagline="Full exam conditions"
                description="A full paper with a countdown timer. No feedback until you submit. The closest you can get to the real exam before the real exam."
                color="purple"
              />
            </div>
          </div>
        </section>

        {/* ── 3. CONTENT SYSTEM ───────────────────────────────────────────────── */}
        <section className="py-20 px-6 bg-muted/40">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Two Types of Content</h2>
              <p className="mt-2 text-muted-foreground">Real national exams and curated practice papers in one place.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Past Papers */}
              <div className="bg-card rounded-2xl border border-border p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Past Papers</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Official exam papers</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-5">
                  Official national exam papers issued by examining bodies. Organised by exam level and year. The questions are real — the same ones students sat on exam day.
                </p>
                <ul className="space-y-2">
                  {['Real questions from real national exams', 'Organised by year', 'Covers PLE, UCE, UACE, KCSE, PSLE and more'].map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onNavigate('past-papers')}
                  className="mt-6 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Browse past papers <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Practice Papers */}
              <div className="bg-card rounded-2xl border border-border p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Library className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Practice Papers</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">From schools and institutions</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-5">
                  Mock papers and practice sets from schools and educational institutions. Not year-led in the same way as past papers — each shows its source so you know where it came from.
                </p>
                <ul className="space-y-2">
                  {['Mock and practice papers from verified sources', 'Publisher and institution attribution shown', 'Covers subjects across exam levels'].map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onNavigate('practice-papers')}
                  className="mt-6 flex items-center gap-1 text-sm font-medium text-secondary hover:underline"
                >
                  Browse practice papers <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. TRY BEFORE YOU PAY ───────────────────────────────────────────── */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-4xl">
            <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 rounded-3xl border border-primary/20 p-10 text-center">
              <h2 className="text-3xl font-bold mb-3">Try Before You Commit</h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-10">
                You do not need to pay to see what's available. Start here, try a few sessions, then decide.
              </p>

              <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <AccessStep
                  step="1"
                  icon={<Library className="w-5 h-5" />}
                  title="Browse free"
                  description="Explore the exam library, filter by level and subject, and see what's available — no account required."
                />
                <AccessStep
                  step="2"
                  icon={<Play className="w-5 h-5" />}
                  title="2 free sessions"
                  description="Create an account and practice 2 full sessions at no cost. No payment details required."
                  highlight
                />
                <AccessStep
                  step="3"
                  icon={<Lock className="w-5 h-5" />}
                  title="Upgrade when ready"
                  description="After your free sessions, choose a plan that fits how often you practise. Pay per paper or subscribe."
                />
              </div>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={onNavigateToAuth} className="btn-primary px-8 py-3 flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start 2 Free Sessions
                </button>
                <button
                  onClick={() => onNavigate('past-papers')}
                  className="px-8 py-3 rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors font-medium flex items-center gap-2"
                >
                  <Library className="w-4 h-4" />
                  Browse First
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. LEARNING LAYER ───────────────────────────────────────────────── */}
        <section className="py-20 px-6 bg-muted/40">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Learn From Every Answer</h2>
              <p className="mt-2 text-muted-foreground">Practice is useful. Practice with feedback is how you improve.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <LearningCard
                icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                title="Instant feedback"
                description="See whether your answer is correct immediately. No waiting, no uncertainty. Know where you stand after each question."
              />
              <LearningCard
                icon={<Brain className="w-6 h-6 text-primary" />}
                title="AI explanations"
                description="For every question, get a step-by-step explanation of the correct answer. Not just the right answer — why it's right."
              />
              <LearningCard
                icon={<RotateCcw className="w-6 h-6 text-secondary" />}
                title="Review loop"
                description="Questions you got wrong come back at the right intervals. A spaced repetition system that helps you actually remember, not just practice once and forget."
              />
            </div>
          </div>
        </section>

        {/* ── 6. WHO IT'S FOR ─────────────────────────────────────────────────── */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Built for Everyone in the Classroom</h2>
              <p className="mt-2 text-muted-foreground">One platform, four different ways to use it.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <AudienceCard
                icon={<GraduationCap className="w-8 h-8" />}
                title="Students"
                color="primary"
                points={[
                  'Practice with real exam papers',
                  'Check answers and understand mistakes',
                  'Build a study habit with streaks',
                  'Review what you got wrong',
                ]}
                cta="Start practicing"
                onCta={onNavigateToAuth}
              />
              <AudienceCard
                icon={<Users className="w-8 h-8" />}
                title="Parents"
                color="blue"
                points={[
                  'See how often your child practises',
                  'View their scores and recent exams',
                  'Track improvement over time',
                  'No guesswork',
                ]}
                cta="Create parent account"
                onCta={onNavigateToAuth}
              />
              <AudienceCard
                icon={<Briefcase className="w-8 h-8" />}
                title="Teachers"
                color="emerald"
                points={[
                  'Bring your students onto the platform',
                  'Assign access to your roster',
                  'See how students are practising',
                  'Supplement classroom preparation',
                ]}
                cta="Create teacher account"
                onCta={onNavigateToAuth}
              />
              <AudienceCard
                icon={<Building2 className="w-8 h-8" />}
                title="Schools"
                color="amber"
                points={[
                  'Broader access for your student body',
                  'Structured exam preparation',
                  'School admin controls',
                  'Contact us for institutional plans',
                ]}
                cta="Contact us"
                onCta={() => window.location.href = 'mailto:schools@xampreps.com'}
              />
            </div>
          </div>
        </section>

        {/* ── 7. REGIONAL COVERAGE ────────────────────────────────────────────── */}
        <section className="py-20 px-6 bg-muted/40">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <MapPin className="w-4 h-4" />
                East Africa
              </div>
              <h2 className="text-3xl font-bold">Built for National Exams Across the Region</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                XamPreps is designed around the national exam systems of East Africa. Coverage is live and expanding.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <CountryCard country="Uganda" exams="PLE · UCE · UACE" status="live" />
              <CountryCard country="Kenya" exams="KCPE · KCSE" status="expanding" />
              <CountryCard country="Tanzania" exams="PSLE · CSEE · ACSEE" status="expanding" />
              <CountryCard country="Rwanda" exams="PLE · O Level · A Level" status="expanding" />
              <CountryCard country="Burundi" exams="CEP · Cycle Fondamental" status="expanding" />
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Content availability varies by country. We are actively adding exam papers across the region.
            </p>
          </div>
        </section>

        {/* ── 8. PRICING LOGIC / ACCESS PATHS ─────────────────────────────────── */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Access That Fits How You Study</h2>
              <p className="mt-2 text-muted-foreground">Start free. Pay for what you use or subscribe for unlimited access.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <PricingPathCard
                icon={<Library className="w-5 h-5" />}
                title="Browse"
                subtitle="No account"
                description="Explore the full exam library. See what's available by level, subject, and year. No sign-up required."
                cta="Browse now"
                onCta={() => onNavigate('past-papers')}
              />
              <PricingPathCard
                icon={<Play className="w-5 h-5" />}
                title="Free sessions"
                subtitle="Free account"
                description="Create a free account and practice 2 full sessions. No payment details required."
                cta="Create account"
                onCta={onNavigateToAuth}
                highlight
              />
              <PricingPathCard
                icon={<FileText className="w-5 h-5" />}
                title="Pay per paper"
                subtitle="Occasional use"
                description="Buy access to individual papers when you need them. Good if you study occasionally rather than regularly."
                cta="Sign in to access"
                onCta={onNavigateToAuth}
              />
              <PricingPathCard
                icon={<BarChart3 className="w-5 h-5" />}
                title="Subscribe"
                subtitle="Regular practice"
                description="Unlimited access to all papers across all exam levels. The right choice if you practise every week."
                cta="View plans"
                onCta={() => onNavigate('pricing')}
              />
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              School and institutional plans available. <a href="mailto:schools@xampreps.com" className="text-primary hover:underline">Contact us</a> to discuss access for your student body.
            </p>
          </div>
        </section>

        {/* ── 9. FINAL CTA ────────────────────────────────────────────────────── */}
        <section className="gradient-primary text-primary-foreground py-20 px-6">
          <div className="container mx-auto text-center max-w-xl">
            <h2 className="text-3xl font-bold">Start Practising Today</h2>
            <p className="mt-3 text-primary-foreground/80">
              Browse the exam library for free. Create an account when you're ready to practice.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onNavigateToAuth}
                className="w-full sm:w-auto px-8 py-3 bg-card text-primary font-bold rounded-lg shadow-lg hover:bg-card/90 transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Practicing
              </button>
              <button
                onClick={() => onNavigate('past-papers')}
                className="w-full sm:w-auto px-8 py-3 border border-primary-foreground/30 text-primary-foreground font-medium rounded-lg hover:bg-primary-foreground/10 transition-colors flex items-center justify-center gap-2"
              >
                <Library className="w-4 h-4" />
                Browse Exams
              </button>
            </div>
          </div>
        </section>

      </main>
    </PublicLayout>
  );
};

// ── Helper Components ─────────────────────────────────────────────────────────

const ModeCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  tagline: string;
  description: string;
  color: 'primary' | 'secondary' | 'purple';
  featured?: boolean;
}> = ({ icon, label, tagline, description, color, featured }) => {
  const colorMap = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
    secondary: { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
  };
  const c = colorMap[color];

  return (
    <div className={`relative bg-card rounded-2xl border p-7 ${featured ? 'border-primary shadow-lg shadow-primary/10 scale-105' : 'border-border'}`}>
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
            Most popular
          </span>
        </div>
      )}
      <div className={`w-12 h-12 rounded-xl ${c.bg} ${c.text} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className={`text-xs font-semibold uppercase tracking-wide ${c.text} mb-1`}>{tagline}</p>
      <h3 className="text-xl font-bold mb-3">{label}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
};

const LearningCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="bg-card rounded-2xl border border-border p-6">
    <div className="mb-4">{icon}</div>
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

const AudienceCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  color: 'primary' | 'blue' | 'emerald' | 'amber';
  points: string[];
  cta: string;
  onCta: () => void;
}> = ({ icon, title, color, points, cta, onCta }) => {
  const colorMap = {
    primary: { iconBg: 'bg-primary/10 text-primary', check: 'text-primary' },
    blue: { iconBg: 'bg-blue-500/10 text-blue-600', check: 'text-blue-500' },
    emerald: { iconBg: 'bg-emerald-500/10 text-emerald-600', check: 'text-emerald-500' },
    amber: { iconBg: 'bg-amber-500/10 text-amber-600', check: 'text-amber-500' },
  };
  const c = colorMap[color];

  return (
    <div className="bg-card rounded-2xl border border-border p-6 flex flex-col">
      <div className={`w-12 h-12 rounded-full ${c.iconBg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-bold text-lg mb-4">{title}</h3>
      <ul className="space-y-2.5 flex-1">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className={`w-4 h-4 ${c.check} shrink-0 mt-0.5`} />
            <span className="text-muted-foreground">{p}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onCta}
        className="mt-5 text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
      >
        {cta} <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const AccessStep: React.FC<{
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
}> = ({ step, icon, title, description, highlight }) => (
  <div className={`rounded-2xl p-6 text-center ${highlight ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}>
    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 ${highlight ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
      {icon}
    </div>
    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Step {step}</p>
    <h3 className="font-bold text-base mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

const CountryCard: React.FC<{
  country: string;
  exams: string;
  status: 'live' | 'expanding';
}> = ({ country, exams, status }) => (
  <div className={`rounded-xl border p-4 text-center ${status === 'live' ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
    <div className="font-bold text-sm mb-1">{country}</div>
    <div className="text-xs text-muted-foreground mb-2">{exams}</div>
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${status === 'live' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
      {status === 'live' ? 'Available' : 'Expanding'}
    </span>
  </div>
);

const PricingPathCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  onCta: () => void;
  highlight?: boolean;
}> = ({ icon, title, subtitle, description, cta, onCta, highlight }) => (
  <div className={`rounded-2xl border p-6 flex flex-col ${highlight ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border bg-card'}`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${highlight ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
      {icon}
    </div>
    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{subtitle}</div>
    <h3 className="font-bold text-base mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed flex-1">{description}</p>
    <button
      onClick={onCta}
      className={`mt-4 text-sm font-medium flex items-center gap-1 ${highlight ? 'text-primary' : 'text-foreground hover:text-primary'} transition-colors`}
    >
      {cta} <ChevronRight className="w-3.5 h-3.5" />
    </button>
  </div>
);

export default LandingPage;
