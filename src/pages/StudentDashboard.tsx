import React from 'react';
import { User, Exam, ExamMode } from '../types';
import { SparklesIcon, FireIcon, AcademicCapIcon, ChartBarIcon, ClockIcon, PlayIcon, TrophyIcon } from '../components/icons';
import Card from '../components/common/Card';

interface StudentDashboardProps {
  currentUser: User;
  allExams: Exam[];
  onStartExam: (examId: string, mode: ExamMode) => void;
  onLogout: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentUser, allExams, onStartExam, onLogout }) => {
  const userLevel = currentUser.level || 'UCE';
  const relevantExams = allExams.filter(exam => exam.level === userLevel);
  const freeExams = relevantExams.filter(exam => exam.isFree);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">XamPreps</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold text-foreground">{currentUser.name}</p>
              <p className="text-sm text-muted-foreground">{currentUser.level} Student</p>
            </div>
            <button 
              onClick={onLogout}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">Every exam is a chance to shine ✨</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            icon={<FireIcon className="w-6 h-6 text-orange-500" />}
            label="Day Streak"
            value={currentUser.streak || 0}
            bgColor="bg-orange-50"
          />
          <StatCard 
            icon={<SparklesIcon className="w-6 h-6 text-primary" />}
            label="Total XP"
            value={currentUser.xp || 0}
            bgColor="bg-primary/10"
          />
          <StatCard 
            icon={<AcademicCapIcon className="w-6 h-6 text-secondary" />}
            label="Exams Taken"
            value={currentUser.questionHistory?.length || 0}
            bgColor="bg-secondary/10"
          />
          <StatCard 
            icon={<TrophyIcon className="w-6 h-6 text-yellow-500" />}
            label="Achievements"
            value={currentUser.achievements?.length || 0}
            bgColor="bg-yellow-50"
          />
        </div>

        {/* Achievements Banner */}
        {currentUser.achievements && currentUser.achievements.length > 0 && (
          <Card className="gradient-primary text-primary-foreground">
            <div className="flex items-center gap-4">
              <TrophyIcon className="w-10 h-10" />
              <div>
                <h3 className="font-bold text-lg">Your Achievements</h3>
                <div className="flex gap-2 mt-2">
                  {currentUser.achievements.map((achievement, i) => (
                    <span key={i} className="px-3 py-1 bg-primary-foreground/20 rounded-full text-sm">
                      {achievement}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Available Exams */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Available {userLevel} Exams</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {freeExams.map(exam => (
              <ExamCard key={exam.id} exam={exam} onStartExam={onStartExam} />
            ))}
          </div>
        </div>

        {/* Premium Exams Teaser */}
        {relevantExams.filter(e => !e.isFree).length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Premium Exams</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relevantExams.filter(e => !e.isFree).slice(0, 3).map(exam => (
                <ExamCard key={exam.id} exam={exam} onStartExam={onStartExam} isPremium />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; bgColor: string }> = ({ icon, label, value, bgColor }) => (
  <Card className="flex items-center gap-4">
    <div className={`p-3 rounded-xl ${bgColor}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </Card>
);

const ExamCard: React.FC<{ exam: Exam; onStartExam: (examId: string, mode: ExamMode) => void; isPremium?: boolean }> = ({ exam, onStartExam, isPremium }) => {
  const difficultyColors = {
    Easy: 'bg-green-100 text-green-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Hard: 'bg-red-100 text-red-800',
  };

  return (
    <Card className={`card-hover ${isPremium ? 'opacity-75' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${difficultyColors[exam.difficulty]}`}>
          {exam.difficulty}
        </span>
        {isPremium && (
          <span className="px-2 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded text-xs font-medium">
            Premium
          </span>
        )}
      </div>
      
      <h3 className="font-bold text-lg text-foreground mb-2">{exam.title}</h3>
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <ClockIcon className="w-4 h-4" />
          {exam.timeLimit} min
        </span>
        <span>{exam.questionCount} questions</span>
      </div>
      
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-muted-foreground">Avg Score: {exam.avgScore}%</span>
        <span className="px-2 py-1 bg-muted rounded text-xs">{exam.type}</span>
      </div>

      {isPremium ? (
        <button className="w-full py-2 border border-primary text-primary font-semibold rounded-lg hover:bg-primary/10 transition-colors">
          Upgrade to Access
        </button>
      ) : (
        <div className="flex gap-2">
          <button 
            onClick={() => onStartExam(exam.id, 'practice')}
            className="flex-1 py-2 border border-primary text-primary font-semibold rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
          >
            <BookOpenIcon className="w-4 h-4" />
            Practice
          </button>
          <button 
            onClick={() => onStartExam(exam.id, 'simulation')}
            className="flex-1 py-2 gradient-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <PlayIcon className="w-4 h-4" />
            Exam
          </button>
        </div>
      )}
    </Card>
  );
};

const BookOpenIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export default StudentDashboard;
