import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LandingPage from './LandingPage';

const Index: React.FC = () => {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect authenticated users to their dashboard
  if (user && role) {
    return <Navigate to={`/dashboard/${role}`} replace />;
  }

  // Show landing page for unauthenticated users
  return (
    <LandingPage 
      onNavigateToAuth={() => window.location.href = '/auth'} 
      onNavigate={(page) => {
        if (page === 'past-papers') window.location.href = '/past-papers';
        else if (page === 'practice-papers') window.location.href = '/practice-papers';
        else if (page === 'pricing') window.location.href = '/pricing';
      }} 
    />
  );
};

export default Index;
