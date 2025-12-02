import React, { useState, useCallback, useEffect } from 'react';
import { User, UserRole, Exam, ExamMode, PublicPage, Notification } from '../types';
import { mockExams } from '../data/exams';
import { mockUsers } from '../data/users';
import { mockNotifications } from '../data/notifications';
import { usePersistentState } from '../hooks/usePersistentState';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import StudentDashboard from './StudentDashboard';
import ExamPage from './ExamPage';
import PricingPage from './PricingPage';
import ExamListPage from './ExamListPage';

const Index: React.FC = () => {
  const [users, setUsers] = usePersistentState<User[]>('msomesa_users', []);
  const [currentUser, setCurrentUser] = usePersistentState<User | null>('msomesa_currentUser', null);
  const [examsData, setExamsData] = usePersistentState<Exam[]>('msomesa_exams', []);
  const [notifications, setNotifications] = usePersistentState<Notification[]>('msomesa_notifications', mockNotifications);

  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeExamMode, setActiveExamMode] = useState<ExamMode>('simulation');

  const [authView, setAuthView] = useState<'landing' | 'login'>(currentUser ? 'login' : 'landing');
  const [publicPage, setPublicPage] = useState<PublicPage>('landing');

  // Data reconciliation on mount
  useEffect(() => {
    setUsers(currentStoredUsers => {
      const finalUsersMap = new Map(mockUsers.map(u => [u.id, u]));
      currentStoredUsers.forEach(storedUser => {
        const mockUser = finalUsersMap.get(storedUser.id);
        if (mockUser) {
          finalUsersMap.set(storedUser.id, { ...mockUser, ...storedUser });
        } else {
          finalUsersMap.set(storedUser.id, storedUser);
        }
      });
      return Array.from(finalUsersMap.values());
    });

    setExamsData(currentStoredExams => {
      const finalExamsMap = new Map(mockExams.map(e => [e.id, e]));
      currentStoredExams.forEach(storedExam => {
        const mockExam = finalExamsMap.get(storedExam.id);
        if (mockExam) {
          finalExamsMap.set(storedExam.id, { ...mockExam, ...storedExam });
        } else {
          finalExamsMap.set(storedExam.id, storedExam);
        }
      });
      return Array.from(finalExamsMap.values());
    });
  }, []);

  const handleAuthAction = useCallback((user: Partial<User>) => {
    if (!user.email || !user.password) {
      alert("Authentication failed: Email and password are required.");
      return;
    }

    const email = user.email.toLowerCase();

    // Sign Up Logic
    if (user.role) {
      const existingUser = users.find(u => u.email.toLowerCase() === email);
      if (existingUser) {
        alert("Signup failed: An account with this email already exists. Please log in.");
        return;
      }

      const newUser: User = {
        id: Date.now().toString(),
        name: user.name || user.email,
        email: user.email,
        password: user.password,
        role: user.role,
        level: user.level,
        school: user.school,
        dob: user.dob,
        xp: 0,
        streak: 0,
        achievements: [],
        questionHistory: [],
        studyReminders: [],
        phone: user.phone,
        contactPerson: user.contactPerson,
        subscription: (user.role === 'parent' || user.role === 'school') ? { plan: 'Free', billingHistory: [] } : undefined,
      };

      setUsers(prevUsers => [...prevUsers, newUser]);
      setCurrentUser(newUser);
    } else {
      // Login Logic
      const existingUser = users.find(u => u.email.toLowerCase() === email);

      if (!existingUser) {
        alert("Login failed: No account found with this email address. Please check the email or sign up.");
        return;
      }

      if (existingUser.password !== user.password) {
        alert("Login failed: The password you entered is incorrect. Please try again.");
        return;
      }

      setCurrentUser({ ...existingUser });
    }
  }, [users, setUsers, setCurrentUser]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setAuthView('landing');
    setPublicPage('landing');
  }, [setCurrentUser]);

  const handleStartExam = (examId: string, mode: ExamMode) => {
    const exam = examsData.find(e => e.id === examId);
    if (exam) {
      setActiveExam(exam);
      setActiveExamMode(mode);
    }
  };

  const handleExitExam = (result?: { score: number; total: number }) => {
    if (result && currentUser && activeExamMode === 'simulation') {
      setCurrentUser(prevUser => {
        if (!prevUser) return null;

        const today = new Date().toISOString().split('T')[0];
        const lastDate = prevUser.lastExamDate;
        let newStreak = prevUser.streak || 0;

        if (lastDate) {
          const lastExamDay = new Date(lastDate);
          const todayDay = new Date(today);
          const diffTime = todayDay.getTime() - lastExamDay.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }

        const newXp = (prevUser.xp || 0) + (result.score * 10);

        const newAchievements = [...(prevUser.achievements || [])];
        if (!newAchievements.includes('First Steps')) {
          newAchievements.push('First Steps');
        }
        if (result.score / result.total >= 0.9 && !newAchievements.includes('High Scorer')) {
          newAchievements.push('High Scorer');
        }
        if (newStreak >= 3 && !newAchievements.includes('Streak Starter')) {
          newAchievements.push('Streak Starter');
        }

        return {
          ...prevUser,
          xp: newXp,
          streak: newStreak,
          lastExamDate: today,
          achievements: newAchievements,
        };
      });
    }

    setActiveExam(null);
  };

  const handleNavigate = (page: PublicPage) => {
    setPublicPage(page);
  };

  const handleNavigateToAuth = () => {
    setAuthView('login');
  };

  // Render active exam
  if (activeExam) {
    return (
      <ExamPage
        exam={activeExam}
        mode={activeExamMode}
        onExit={handleExitExam}
      />
    );
  }

  // Render logged-in dashboard
  if (currentUser) {
    return (
      <StudentDashboard
        currentUser={currentUser}
        allExams={examsData}
        onStartExam={handleStartExam}
        onLogout={handleLogout}
      />
    );
  }

  // Render public pages
  if (authView === 'login') {
    return (
      <LoginPage
        onAuth={handleAuthAction}
        onBackToHome={() => {
          setAuthView('landing');
          setPublicPage('landing');
        }}
      />
    );
  }

  switch (publicPage) {
    case 'landing':
      return <LandingPage onNavigateToAuth={handleNavigateToAuth} onNavigate={handleNavigate} />;
    case 'past-papers':
      return <ExamListPage pageType="Past Paper" allExams={examsData} onNavigateToAuth={handleNavigateToAuth} onNavigate={handleNavigate} />;
    case 'practice-papers':
      return <ExamListPage pageType="Practice Paper" allExams={examsData} onNavigateToAuth={handleNavigateToAuth} onNavigate={handleNavigate} />;
    case 'pricing':
      return <PricingPage onNavigateToAuth={handleNavigateToAuth} onNavigate={handleNavigate} />;
    default:
      return <LandingPage onNavigateToAuth={handleNavigateToAuth} onNavigate={handleNavigate} />;
  }
};

export default Index;
