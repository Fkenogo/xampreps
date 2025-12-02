import React from 'react';
import { SparklesIcon, BookOpenIcon, ChartBarIcon, ArrowTrendingUpIcon, BuildingOfficeIcon, UsersIcon, WrenchIcon, AcademicCapIcon, CheckIcon } from '../components/icons';
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
        {/* Hero Section */}
        <section className="relative gradient-dark text-primary-foreground py-24 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate to-slate-dark"></div>
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/20 rounded-full filter blur-3xl opacity-50 animate-pulse"></div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-secondary/20 rounded-full filter blur-3xl opacity-50 animate-pulse animation-delay-4000"></div>
          
          <div className="container mx-auto text-center relative z-10">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight animate-fade-in">
              Ace Your Ugandan National Exams with Msomesa
            </h1>
            <p className="mt-6 text-lg text-muted max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Your Ultimate Exam Prep Partner for PLE, UCE & UACE. Access thousands of past papers, receive instant feedback, and learn from detailed AI-powered explanations to boost your exam performance.
            </p>
            <button 
              onClick={onNavigateToAuth} 
              className="mt-10 btn-primary animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              Get Started
            </button>
            <p className="mt-4 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
              Start Learning for Free
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-6">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-12">Get Started in 3 Simple Steps</h2>
            <div className="grid md:grid-cols-3 gap-10 relative">
              <div className="absolute top-8 left-0 w-full h-0.5 bg-border hidden md:block z-0"></div>
              <StepCard number="1" title="Create Your Account" description="Quickly sign up as a student, parent, or school to get started." />
              <StepCard number="2" title="Choose Your Exam" description="Select from a vast library of past papers and choose your study mode." />
              <StepCard number="3" title="Learn & Improve" description="Get instant feedback, review explanations, and watch your scores climb." />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6 bg-muted/50">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">A Smarter Way to Prepare</h2>
              <p className="mt-2 text-muted-foreground">Everything you need to succeed in one place.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard 
                icon={<WrenchIcon className="w-6 h-6 text-secondary" />} 
                title="AI-Powered Tutoring" 
                description="Get instant, step-by-step explanations for every question. Understand the 'why' behind every answer." 
              />
              <FeatureCard 
                icon={<BookOpenIcon className="w-6 h-6 text-secondary" />} 
                title="Practice & Simulation" 
                description="Choose between a stress-free Practice Mode with instant feedback or a timed Exam Simulation." 
              />
              <FeatureCard 
                icon={<ChartBarIcon className="w-6 h-6 text-secondary" />} 
                title="Smart Review System" 
                description="Our spaced repetition system identifies your weak spots and creates personalized review sessions." 
              />
              <FeatureCard 
                icon={<ArrowTrendingUpIcon className="w-6 h-6 text-secondary" />} 
                title="Performance Analytics" 
                description="Track your progress with detailed charts. See your scores improve over time." 
              />
            </div>
          </div>
        </section>

        {/* Who We Serve */}
        <section className="py-20 px-6">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Why Msomesa Works for Everyone</h2>
              <p className="mt-2 text-muted-foreground">Personalized solutions that drive academic success.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <WhoCard 
                icon={<AcademicCapIcon className="w-8 h-8"/>} 
                title="For Students" 
                points={[
                  'Practice with real exam questions', 
                  'Track your progress and weak spots', 
                  'Get instant feedback and AI explanations', 
                  'Build confidence consistently'
                ]} 
                color="purple" 
              />
              <WhoCard 
                icon={<UsersIcon className="w-8 h-8"/>} 
                title="For Parents" 
                points={[
                  "Monitor your child's progress", 
                  'Identify learning gaps early', 
                  'Provide targeted support', 
                  'Affordable access to quality resources'
                ]} 
                color="blue" 
              />
              <WhoCard 
                icon={<BuildingOfficeIcon className="w-8 h-8"/>} 
                title="For Schools" 
                points={[
                  "Assess students' exam readiness", 
                  'Generate detailed performance reports', 
                  'Supplement your curriculum', 
                  'Improve overall student outcomes'
                ]} 
                color="green" 
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="gradient-primary text-primary-foreground py-20 px-6">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold">Ready to Ace Your Exams?</h2>
            <p className="mt-2 max-w-xl mx-auto">Join thousands of students who have improved their exam scores with Msomesa.</p>
            <button 
              onClick={onNavigateToAuth} 
              className="mt-6 px-8 py-3 bg-card text-primary font-bold rounded-lg shadow-lg hover:bg-card/90 transition-transform hover:scale-105"
            >
              Get Started Now
            </button>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
};

// Helper Components
const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="card-hover p-6 text-center">
    <div className="flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-full mb-4 mx-auto">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);

const WhoCard: React.FC<{ icon: React.ReactNode; title: string; points: string[]; color: 'purple' | 'blue' | 'green' }> = ({ icon, title, points, color }) => {
  const colors = {
    purple: 'bg-primary/10 text-primary',
    blue: 'bg-secondary/10 text-secondary',
    green: 'bg-green-500/10 text-green-600',
  };
  const checkColors = { 
    purple: 'text-primary', 
    blue: 'text-secondary', 
    green: 'text-green-500' 
  };
  
  return (
    <div className="bg-card p-6 rounded-xl shadow-lg">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${colors[color]} mb-4`}>
        {icon}
      </div>
      <h3 className="font-bold text-xl mb-4">{title}</h3>
      <ul className="space-y-3 text-left">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-3">
            <CheckIcon className={`w-5 h-5 ${checkColors[color]} flex-shrink-0 mt-0.5`} />
            <span className="text-sm text-muted-foreground">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const StepCard: React.FC<{ number: string; title: string; description: string }> = ({ number, title, description }) => (
  <div className="relative bg-card px-4 z-10 py-6 rounded-xl">
    <div className="mx-auto w-16 h-16 bg-secondary/10 text-secondary font-bold text-2xl rounded-full flex items-center justify-center mb-4 border-4 border-card">
      {number}
    </div>
    <h3 className="font-bold text-lg">{title}</h3>
    <p className="text-sm text-muted-foreground mt-2">{description}</p>
  </div>
);

export default LandingPage;
