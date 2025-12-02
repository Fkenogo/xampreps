import React from 'react';
import { SparklesIcon } from '../icons';
import { PublicPage } from '../../types';

interface PublicLayoutProps {
  children: React.ReactNode;
  onNavigateToAuth: () => void;
  onNavigate: (page: PublicPage) => void;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children, onNavigateToAuth, onNavigate }) => {
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
            <span className="text-xl font-bold">Msomesa</span>
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
              Get Started
            </button>
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
                <span className="text-xl font-bold text-primary-foreground">Msomesa</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Transforming the way we learn.</p>
            </div>
            
            <FooterLinks 
              title="Quick Links" 
              links={['PLE Papers', 'UCE Papers', 'UACE Papers']} 
              onNavigate={onNavigate}
            />
            <FooterLinks 
              title="Resources" 
              links={['About Us', 'Pricing', 'Contact']} 
              onNavigate={onNavigate}
            />
            <FooterLinks 
              title="Support" 
              links={['FAQ', 'Terms of Service', 'Privacy Policy']} 
              onNavigate={onNavigate}
            />
          </div>
          
          <div className="text-center text-muted-foreground text-sm mt-12 border-t border-muted-foreground/20 pt-8">
            © {new Date().getFullYear()} Msomesa. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

const FooterLinks: React.FC<{
  title: string; 
  links: string[]; 
  onNavigate: (page: PublicPage) => void;
}> = ({ title, links, onNavigate }) => {
  const handleFooterClick = (link: string) => {
    if (link === 'Pricing') {
      onNavigate('pricing');
    } else if (link.includes('Papers')) {
      onNavigate('past-papers');
    }
  };

  return (
    <div>
      <h4 className="font-semibold text-primary-foreground mb-4">{title}</h4>
      <ul className="space-y-2">
        {links.map(link => (
          <li key={link}>
            <button 
              onClick={() => handleFooterClick(link)} 
              className="text-sm text-muted-foreground hover:text-primary-foreground transition-colors"
            >
              {link}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PublicLayout;
