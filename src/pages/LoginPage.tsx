import React, { useState, FormEvent } from 'react';
import { User, UserRole, EducationLevel } from '../types';
import { SparklesIcon, BookOpenIcon, UsersIcon, BuildingOfficeIcon } from '../components/icons';

type AuthMode = 'login' | 'signup-student' | 'signup-parent' | 'signup-school';

interface LoginPageProps {
  onAuth: (user: Partial<User>) => void;
  onBackToHome: () => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 font-semibold border-b-2 transition-colors duration-300 ${active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
  >
    {children}
  </button>
);

const LoginPage: React.FC<LoginPageProps> = ({ onAuth, onBackToHome }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  const handleSignupFormSubmit = (event: FormEvent<HTMLFormElement>, role: UserRole) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      alert("Passwords do not match. Please try again.");
      return;
    }

    const newUser: Partial<User> = {
      name: formData.get('name') as string || formData.get('schoolName') as string || formData.get('email') as string,
      email: formData.get('email') as string,
      password: password,
      role: role,
      level: formData.get('level') as EducationLevel,
      school: formData.get('school') as string,
      dob: formData.get('dob') as string,
      phone: formData.get('phone') as string,
      contactPerson: formData.get('contactPerson') as string,
    };
    onAuth(newUser);
  };

  const handleLoginFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const loginAttempt: Partial<User> = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };
    onAuth(loginAttempt);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-secondary/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <SparklesIcon className="w-12 h-12 mx-auto text-primary" />
          <h1 className="text-4xl font-bold text-foreground mt-2">Welcome to Msomesa</h1>
          <p className="text-muted-foreground mt-1">Your journey to exam success starts here.</p>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-8">
          <div className="flex justify-center border-b border-border mb-6">
            <TabButton active={mode === 'login'} onClick={() => setMode('login')}>Login</TabButton>
            <TabButton active={mode.startsWith('signup')} onClick={() => setMode('signup-student')}>Sign Up</TabButton>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLoginFormSubmit} className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-semibold text-center text-foreground mb-4">Sign in to your account</h2>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Email</label>
                <input type="email" name="email" required className="input-style mt-1" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Password</label>
                <input type="password" name="password" required className="input-style mt-1" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full btn-primary">Login</button>
              
              <div className="text-center text-sm text-muted-foreground mt-4">
                <p>Demo accounts:</p>
                <p className="text-xs">student@demo.com / demo123</p>
              </div>
            </form>
          )}

          {mode.startsWith('signup') && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-3 gap-2 mb-6">
                <RoleButton icon={<BookOpenIcon className="w-5 h-5"/>} label="Student" active={mode === 'signup-student'} onClick={() => setMode('signup-student')} />
                <RoleButton icon={<UsersIcon className="w-5 h-5"/>} label="Parent" active={mode === 'signup-parent'} onClick={() => setMode('signup-parent')} />
                <RoleButton icon={<BuildingOfficeIcon className="w-5 h-5"/>} label="School" active={mode === 'signup-school'} onClick={() => setMode('signup-school')} />
              </div>

              {mode === 'signup-student' && <StudentSignupForm onSubmit={handleSignupFormSubmit} />}
              {mode === 'signup-parent' && <ParentSignupForm onSubmit={handleSignupFormSubmit} />}
              {mode === 'signup-school' && <SchoolSignupForm onSubmit={handleSignupFormSubmit} />}
            </div>
          )}
          
          <div className="text-center mt-6">
            <button onClick={onBackToHome} className="text-sm text-primary hover:underline">
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RoleButton: React.FC<{icon: React.ReactNode; label: string; active: boolean; onClick: () => void;}> = ({ icon, label, active, onClick }) => (
  <button 
    type="button" 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${active ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground'}`}
  >
    {icon}
    <span className="text-xs font-semibold mt-1">{label}</span>
  </button>
);

const PasswordFields: React.FC = () => (
  <>
    <input type="password" name="password" placeholder="Password" required className="input-style" />
    <input type="password" name="confirmPassword" placeholder="Confirm Password" required className="input-style" />
  </>
);

const StudentSignupForm: React.FC<{ onSubmit: (e: FormEvent<HTMLFormElement>, role: UserRole) => void }> = ({ onSubmit }) => (
  <form onSubmit={(e) => onSubmit(e, 'student')} className="space-y-4">
    <h2 className="text-xl font-semibold text-center text-foreground mb-4">Create Student Account</h2>
    <input name="name" placeholder="Full Name" required className="input-style" />
    <input name="school" placeholder="School Name" required className="input-style" />
    <select name="level" required className="input-style text-muted-foreground">
      <option value="">Select Grade Level</option>
      <option value="PLE">PLE</option>
      <option value="UCE">UCE</option>
      <option value="UACE">UACE</option>
    </select>
    <input type="date" name="dob" placeholder="Date of Birth" required className="input-style text-muted-foreground" />
    <input type="email" name="email" placeholder="Email Address" required className="input-style" />
    <PasswordFields />
    <button type="submit" className="w-full btn-primary">Sign Up</button>
  </form>
);

const ParentSignupForm: React.FC<{ onSubmit: (e: FormEvent<HTMLFormElement>, role: UserRole) => void }> = ({ onSubmit }) => (
  <form onSubmit={(e) => onSubmit(e, 'parent')} className="space-y-4">
    <h2 className="text-xl font-semibold text-center text-foreground mb-4">Create Parent Account</h2>
    <input name="name" placeholder="Full Name" required className="input-style" />
    <input type="email" name="email" placeholder="Email Address" required className="input-style" />
    <input type="tel" name="phone" placeholder="Phone Number" required className="input-style" />
    <PasswordFields />
    <button type="submit" className="w-full btn-primary">Sign Up</button>
  </form>
);

const SchoolSignupForm: React.FC<{ onSubmit: (e: FormEvent<HTMLFormElement>, role: UserRole) => void }> = ({ onSubmit }) => (
  <form onSubmit={(e) => onSubmit(e, 'school')} className="space-y-4">
    <h2 className="text-xl font-semibold text-center text-foreground mb-4">Register Your School</h2>
    <input name="schoolName" placeholder="School Name" required className="input-style" />
    <input name="contactPerson" placeholder="Contact Person" required className="input-style" />
    <input type="email" name="email" placeholder="Official Email" required className="input-style" />
    <input type="tel" name="phone" placeholder="Contact Number" required className="input-style" />
    <PasswordFields />
    <button type="submit" className="w-full btn-primary">Register</button>
  </form>
);

export default LoginPage;
