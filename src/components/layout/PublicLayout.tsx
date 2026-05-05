import React from 'react';
import { SparklesIcon } from '../icons';
import { PublicPage } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardPathForRole } from '../../lib/auth-routing';

interface PublicLayoutProps {
  children: React.ReactNode;
  onNavigateToAuth: () => void;
  onNavigate: (page: PublicPage) => void;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children, onNavigateToAuth, onNavigate }) => {
  const { user, role } = useAuth();
  return (
    <div className="bg-background text-foreground font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 glass z-50 border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onNavigate('landing')}
          >
            <SparklesIcon className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">XamPreps</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => onNavigate('landing')}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('past-papers')}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Past Papers
            </button>
            <button
              onClick={() => onNavigate('practice-papers')}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Practice Papers
            </button>
            <button
              onClick={() => onNavigate('pricing')}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Pricing
            </button>
          </nav>

          <div className="flex items-center gap-2">
            {user && role ? (
              <button
                onClick={() => window.location.href = getDashboardPathForRole(role)}
                className="text-sm font-semibold gradient-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-all shadow-md hover:shadow-lg"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={onNavigateToAuth}
                  className="text-sm font-semibold text-secondary hover:bg-secondary/10 px-4 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={onNavigateToAuth}
                  className="text-sm font-semibold gradient-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-all shadow-md hover:shadow-lg"
                >
                  Start Practicing
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {children}

      {/* Footer */}
      <footer className="gradient-dark text-muted py-12 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center md:text-left">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <SparklesIcon className="w-8 h-8 text-primary-foreground" />
                <span className="text-xl font-bold text-primary-foreground">XamPreps</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Practice with purpose. Built for national exams across East Africa.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-primary-foreground mb-4">Exam Library</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => onNavigate('past-papers')}
                    className="text-sm text-muted-foreground hover:text-primary-foreground transition-colors"
                  >
                    Past Papers
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate('practice-papers')}
                    className="text-sm text-muted-foreground hover:text-primary-foreground transition-colors"
                  >
                    Practice Papers
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate('pricing')}
                    className="text-sm text-muted-foreground hover:text-primary-foreground transition-colors"
                  >
                    Pricing
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-primary-foreground mb-4">Exam Levels</h4>
              <ul className="space-y-2">
                {['PLE · UCE · UACE', 'KCPE · KCSE', 'PSLE · CSEE', 'O Level · A Level'].map(level => (
                  <li key={level}>
                    <span className="text-sm text-muted-foreground">{level}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-primary-foreground mb-4">Get Started</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={onNavigateToAuth}
                    className="text-sm text-muted-foreground hover:text-primary-foreground transition-colors"
                  >
                    Create Account
                  </button>
                </li>
                <li>
                  <button
                    onClick={onNavigateToAuth}
                    className="text-sm text-muted-foreground hover:text-primary-foreground transition-colors"
                  >
                    Sign In
                  </button>
                </li>
                <li>
                  <a
                    href="mailto:schools@xampreps.com"
                    className="text-sm text-muted-foreground hover:text-primary-foreground transition-colors"
                  >
                    Schools &amp; Institutions
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center text-muted-foreground text-sm mt-12 border-t border-muted-foreground/20 pt-8">
            © {new Date().getFullYear()} XamPreps. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
