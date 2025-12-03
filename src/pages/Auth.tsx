import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Users, Building, Mail, Lock, User, ArrowLeft, Sparkles } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

type AuthMode = 'login' | 'signup-student' | 'signup-parent' | 'signup-school';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome back! 🎉",
            description: "Let's continue your learning journey!",
          });
          navigate(from, { replace: true });
        }
      } else {
        if (password !== confirmPassword) {
          toast({
            title: "Passwords don't match",
            description: "Please make sure your passwords match.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const roleMap: Record<string, AppRole> = {
          'signup-student': 'student',
          'signup-parent': 'parent',
          'signup-school': 'school',
        };

        const { error } = await signUp(email, password, {
          name: name || email.split('@')[0],
          role: roleMap[mode],
        });

        if (error) {
          toast({
            title: "Signup failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account created! 🚀",
            description: "Welcome to Msomesa! Your adventure begins now!",
          });
          navigate('/dashboard', { replace: true });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'signup-student': return <GraduationCap className="w-6 h-6" />;
      case 'signup-parent': return <Users className="w-6 h-6" />;
      case 'signup-school': return <Building className="w-6 h-6" />;
      default: return <User className="w-6 h-6" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'signup-student': return 'from-violet-500 to-purple-600';
      case 'signup-parent': return 'from-blue-500 to-cyan-600';
      case 'signup-school': return 'from-emerald-500 to-teal-600';
      default: return 'from-primary to-primary/80';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground mb-4 shadow-lg shadow-primary/25">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Msomesa</h1>
          <p className="text-muted-foreground mt-2">Your learning adventure awaits!</p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden">
          {/* Tab Selector */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup-student')}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                mode !== 'login'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="p-6">
            {/* Role Selection for Signup */}
            {mode !== 'login' && (
              <div className="mb-6">
                <Label className="text-sm text-muted-foreground mb-3 block">I am a...</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { mode: 'signup-student', label: 'Student', icon: GraduationCap },
                    { mode: 'signup-parent', label: 'Parent', icon: Users },
                    { mode: 'signup-school', label: 'School', icon: Building },
                  ].map(({ mode: roleMode, label, icon: Icon }) => (
                    <button
                      key={roleMode}
                      type="button"
                      onClick={() => setMode(roleMode as AuthMode)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        mode === roleMode
                          ? `border-primary bg-gradient-to-br ${getRoleColor(roleMode)} text-white`
                          : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode !== 'login' && (
                <div>
                  <Label htmlFor="name" className="text-sm">Full Name</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-sm">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-sm">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {mode !== 'login' && (
                <div>
                  <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className={`w-full h-12 text-base font-semibold bg-gradient-to-r ${getRoleColor(mode)} hover:opacity-90 transition-opacity`}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : mode === 'login' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Back to Home */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2 w-full mt-6 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>
    </div>
  );
}
