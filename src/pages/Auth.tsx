import { useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Users, Mail, Lock, Sparkles, Briefcase, School, KeyRound } from 'lucide-react';
import { getDashboardPathForRole } from '@/lib/auth-routing';
import {
  getCountryOptions,
  getDefaultCountryOption,
  getEducationLevelOptionsForCountry,
  GENDER_OPTIONS,
  normalizeCountryLevelSelection,
  validateCountrySelection,
} from '@/lib/identity-options';

type PublicSignupRole = 'student' | 'parent' | 'teacher' | 'school_admin';
type AppRole = PublicSignupRole | 'admin' | 'super_admin';
type AuthMode = 'login-email' | 'login-student-access' | `signup-${PublicSignupRole}`;

interface StudentSignupState {
  firstName: string;
  lastName: string;
  preferredName: string;
  dateOfBirth: string;
  gender: string;
  country: string;
  educationLevel: string;
  gradeLevel: string;
  candidateNumber: string;
}

interface AdultSignupState {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  jobTitle: string;
}

const signupRoleCards: Array<{
  mode: Extract<AuthMode, `signup-${PublicSignupRole}`>;
  label: string;
  description: string;
  icon: typeof GraduationCap;
  gradient: string;
}> = [
  {
    mode: 'signup-student',
    label: 'Student',
    description: 'Independent learner account',
    icon: GraduationCap,
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    mode: 'signup-parent',
    label: 'Parent',
    description: 'Manage and monitor students',
    icon: Users,
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    mode: 'signup-teacher',
    label: 'Teacher',
    description: 'Manage a teaching roster',
    icon: Briefcase,
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    mode: 'signup-school_admin',
    label: 'School Admin',
    description: 'Manage a school organization',
    icon: School,
    gradient: 'from-amber-500 to-orange-600',
  },
];

function buildDisplayName(studentState: StudentSignupState, adultState: AdultSignupState, mode: AuthMode) {
  if (mode === 'signup-student') {
    return [studentState.firstName, studentState.lastName].filter(Boolean).join(' ').trim();
  }
  return [adultState.firstName, adultState.lastName].filter(Boolean).join(' ').trim();
}

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login-email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [accessSecret, setAccessSecret] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [setupSecretConfirm, setSetupSecretConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [studentState, setStudentState] = useState<StudentSignupState>({
    firstName: '',
    lastName: '',
    preferredName: '',
    dateOfBirth: '',
    gender: 'Prefer not to say',
    country: getDefaultCountryOption(),
    educationLevel: '',
    gradeLevel: '',
    candidateNumber: '',
  });
  const [adultState, setAdultState] = useState<AdultSignupState>({
    firstName: '',
    lastName: '',
    phone: '',
    country: getDefaultCountryOption(),
    jobTitle: '',
  });

  const {
    signIn,
    signInWithStudentAccess,
    signUp,
    completeStudentFirstLogin,
    requiresStudentSetup,
    signOut,
    user,
    role,
  } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedPath = location.state?.from?.pathname;
  const from = requestedPath && requestedPath !== '/auth' ? requestedPath : null;
  const shouldShowStudentSetup =
    Boolean(user && role === 'student') &&
    (requiresStudentSetup || searchParams.get('mode') === 'student-setup');

  const activeRoleCard = useMemo(
    () => signupRoleCards.find((card) => card.mode === mode) || signupRoleCards[0],
    [mode],
  );
  const countryOptions = useMemo(() => getCountryOptions(), []);
  const studentEducationLevelOptions = useMemo(
    () => getEducationLevelOptionsForCountry(studentState.country),
    [studentState.country],
  );

  const handleEmailLogin = async () => {
    const { error, role: resolvedRole } = await signIn(email, password);
    if (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    if (!resolvedRole) {
      toast({
        title: 'Login incomplete',
        description: 'We could not determine your account role. Please contact support or try again.',
        variant: 'destructive',
      });
      return;
    }
    const destination = from || getDashboardPathForRole(resolvedRole);
    toast({
      title: 'Welcome back! 🎉',
      description: 'Your account is ready.',
    });
    navigate(destination, { replace: true });
  };

  const handleStudentAccessLogin = async () => {
    const { error, role: resolvedRole, requiresFirstLoginSetup } = await signInWithStudentAccess(accessCode, accessSecret);
    if (error) {
      toast({
        title: 'Student access failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    if (requiresFirstLoginSetup) {
      setSearchParams({ mode: 'student-setup' });
      toast({
        title: 'Set up your student access',
        description: 'Choose a new password or PIN before continuing.',
      });
      return;
    }
    if (!resolvedRole) {
      toast({
        title: 'Student access incomplete',
        description: 'We could not determine your account role. Please contact support or try again.',
        variant: 'destructive',
      });
      return;
    }
    const destination = from || getDashboardPathForRole(resolvedRole);
    toast({
      title: 'Welcome to XamPreps',
      description: 'Student access granted.',
    });
    navigate(destination, { replace: true });
  };

  const handleStudentSetup = async () => {
    if (setupSecret !== setupSecretConfirm) {
      toast({
        title: "Secrets don't match",
        description: 'Please make sure the new password or PIN matches.',
        variant: 'destructive',
      });
      return;
    }
    const { error } = await completeStudentFirstLogin(setupSecret);
    if (error) {
      toast({
        title: 'Setup failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    setSearchParams({});
    toast({
      title: 'Student setup complete',
      description: 'You can now continue to your dashboard.',
    });
    navigate('/dashboard/student', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (shouldShowStudentSetup) {
        await handleStudentSetup();
        return;
      }

      if (mode === 'login-email') {
        await handleEmailLogin();
        return;
      }

      if (mode === 'login-student-access') {
        await handleStudentAccessLogin();
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: 'Please make sure your passwords match.',
          variant: 'destructive',
        });
        return;
      }

      const signupRole = mode.replace('signup-', '') as PublicSignupRole;
      const displayName = buildDisplayName(studentState, adultState, mode);

      if (!displayName) {
        toast({
          title: 'Missing name',
          description: 'Please complete the required name fields before signing up.',
          variant: 'destructive',
        });
        return;
      }

      if (signupRole === 'student') {
        const normalized = normalizeCountryLevelSelection({
          country: studentState.country,
          educationLevel: studentState.educationLevel,
        });
        if (!validateCountrySelection(studentState.country) || !normalized.valid) {
          toast({
            title: 'Invalid student details',
            description: 'Select a valid country and education level combination.',
            variant: 'destructive',
          });
          return;
        }
      } else if (!validateCountrySelection(adultState.country)) {
        toast({
          title: 'Invalid country',
          description: 'Select a valid country before signing up.',
          variant: 'destructive',
        });
        return;
      }

      const studentNormalization = signupRole === 'student'
        ? normalizeCountryLevelSelection({
            country: studentState.country,
            educationLevel: studentState.educationLevel,
          })
        : null;

      const { error } = await signUp(email, password, {
        name: displayName,
        role: signupRole as AppRole,
        country: signupRole === 'student' ? studentState.country : adultState.country,
        educationLevel: signupRole === 'student' ? studentNormalization?.levelCode || null : null,
        educationStage: signupRole === 'student' ? studentNormalization?.stage || null : null,
      });

      if (error) {
        toast({
          title: 'Signup failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Account created',
          description:
            signupRole === 'school_admin'
              ? 'Your school admin account is ready. You can set up your school from the dashboard.'
              : 'Your account has been created. Welcome to XamPreps!',
        });
        navigate('/dashboard', { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isSignup = mode.startsWith('signup-');
  const isStudentSignup = mode === 'signup-student';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground mb-4 shadow-lg shadow-primary/25">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">XamPreps</h1>
          <p className="text-muted-foreground mt-2">Practice real national exams across East Africa.</p>
        </div>

        <div className="bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden">
          {!shouldShowStudentSetup && (
            <div className="flex border-b border-border">
              <button
                onClick={() => setMode('login-email')}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${
                  !isSignup
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('signup-student')}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${
                  isSignup
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          <div className="p-6 space-y-6">
            {shouldShowStudentSetup ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                  Set a password or PIN to secure your student account and continue to your dashboard.
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-setup-secret">New password or PIN</Label>
                    <Input
                      id="student-setup-secret"
                      type="password"
                      value={setupSecret}
                      onChange={(event) => setSetupSecret(event.target.value)}
                      required
                      minLength={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-setup-secret-confirm">Confirm new password or PIN</Label>
                    <Input
                      id="student-setup-secret-confirm"
                      type="password"
                      value={setupSecretConfirm}
                      onChange={(event) => setSetupSecretConfirm(event.target.value)}
                      required
                      minLength={4}
                    />
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    After setup, sign in with your access code and the new password or PIN you chose.
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {isLoading ? 'Saving...' : 'Complete Setup'}
                    </Button>
                    {user && role === 'student' ? (
                      <Button type="button" variant="outline" onClick={signOut} disabled={isLoading}>
                        Sign Out
                      </Button>
                    ) : null}
                  </div>
                </form>
              </div>
            ) : (
              <>
                {!isSignup && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setMode('login-email')}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          mode === 'login-email'
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Mail className="w-5 h-5 mb-2" />
                        <p className="text-sm font-semibold">Email Sign In</p>
                        <p className="text-xs mt-1 text-muted-foreground">For parents, teachers, school admins, and staff</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('login-student-access')}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          mode === 'login-student-access'
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <KeyRound className="w-5 h-5 mb-2" />
                        <p className="text-sm font-semibold">Student Access Code</p>
                        <p className="text-xs mt-1 text-muted-foreground">Managed students sign in with access code and secret</p>
                      </button>
                    </div>
                  </div>
                )}

                {isSignup && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-3 block">Create an account as</Label>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {signupRoleCards.map(({ mode: roleMode, label, description, icon: Icon, gradient }) => (
                          <button
                            key={roleMode}
                            type="button"
                            onClick={() => setMode(roleMode)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                              mode === roleMode
                                ? `border-primary bg-gradient-to-br ${gradient} text-white`
                                : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Icon className="w-6 h-6 mb-3" />
                            <p className="text-sm font-semibold">{label}</p>
                            <p className={`text-xs mt-1 ${mode === roleMode ? 'text-white/85' : 'text-muted-foreground'}`}>
                              {description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      School admin accounts manage an existing school on XamPreps. If your school is not registered yet, contact us to get it set up.
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'login-student-access' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="student-access-code">Access code</Label>
                        <Input
                          id="student-access-code"
                          value={accessCode}
                          onChange={(event) => setAccessCode(event.target.value)}
                          placeholder="ABCD-1234"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="student-access-secret">Temporary secret or PIN</Label>
                        <Input
                          id="student-access-secret"
                          type="password"
                          value={accessSecret}
                          onChange={(event) => setAccessSecret(event.target.value)}
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {isSignup && isStudentSignup && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="student-first-name">First name</Label>
                            <Input id="student-first-name" value={studentState.firstName} onChange={(event) => setStudentState((current) => ({ ...current, firstName: event.target.value }))} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="student-last-name">Last name</Label>
                            <Input id="student-last-name" value={studentState.lastName} onChange={(event) => setStudentState((current) => ({ ...current, lastName: event.target.value }))} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="student-preferred-name">Preferred name</Label>
                            <Input id="student-preferred-name" value={studentState.preferredName} onChange={(event) => setStudentState((current) => ({ ...current, preferredName: event.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="student-date-of-birth">Date of birth</Label>
                            <Input id="student-date-of-birth" type="date" value={studentState.dateOfBirth} onChange={(event) => setStudentState((current) => ({ ...current, dateOfBirth: event.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Gender</Label>
                            <Select value={studentState.gender} onValueChange={(value) => setStudentState((current) => ({ ...current, gender: value }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {GENDER_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <Select
                              value={studentState.country}
                              onValueChange={(value) =>
                                setStudentState((current) => ({
                                  ...current,
                                  country: value,
                                  educationLevel:
                                    current.educationLevel &&
                                    getEducationLevelOptionsForCountry(value).includes(current.educationLevel)
                                      ? current.educationLevel
                                      : '',
                                }))
                              }
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {countryOptions.map((option) => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Education level</Label>
                            <Select value={studentState.educationLevel || undefined} onValueChange={(value) => setStudentState((current) => ({ ...current, educationLevel: value }))}>
                              <SelectTrigger><SelectValue placeholder="Select education level" /></SelectTrigger>
                              <SelectContent>
                                {studentEducationLevelOptions.map((option) => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="student-grade-level">Grade level</Label>
                            <Input id="student-grade-level" value={studentState.gradeLevel} onChange={(event) => setStudentState((current) => ({ ...current, gradeLevel: event.target.value }))} />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="student-candidate-number">Candidate number</Label>
                            <Input id="student-candidate-number" value={studentState.candidateNumber} onChange={(event) => setStudentState((current) => ({ ...current, candidateNumber: event.target.value }))} />
                          </div>
                        </div>
                      )}

                      {isSignup && !isStudentSignup && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="adult-first-name">First name</Label>
                            <Input id="adult-first-name" value={adultState.firstName} onChange={(event) => setAdultState((current) => ({ ...current, firstName: event.target.value }))} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="adult-last-name">Last name</Label>
                            <Input id="adult-last-name" value={adultState.lastName} onChange={(event) => setAdultState((current) => ({ ...current, lastName: event.target.value }))} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="adult-phone">Phone</Label>
                            <Input id="adult-phone" value={adultState.phone} onChange={(event) => setAdultState((current) => ({ ...current, phone: event.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <Select value={adultState.country} onValueChange={(value) => setAdultState((current) => ({ ...current, country: value }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {countryOptions.map((option) => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="adult-job-title">Job title</Label>
                            <Input id="adult-job-title" value={adultState.jobTitle} onChange={(event) => setAdultState((current) => ({ ...current, jobTitle: event.target.value }))} />
                          </div>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="email" className="text-sm">Email</Label>
                        <div className="relative mt-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10" required />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="password" className="text-sm">Password</Label>
                        <div className="relative mt-1">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" required minLength={6} />
                        </div>
                      </div>

                      {isSignup && (
                        <div>
                          <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                          <div className="relative mt-1">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="pl-10" required minLength={6} />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {isSignup ? (
                    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                      Your account will be ready immediately. You'll be taken to your dashboard after signing up.
                    </div>
                  ) : mode === 'login-student-access' ? (
                    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                      Students can sign in using a school-issued access code and PIN.
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full h-12 text-base font-semibold bg-gradient-to-r ${
                      isSignup ? activeRoleCard.gradient : 'from-primary to-primary/80'
                    } hover:opacity-90 transition-opacity`}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : mode === 'login-student-access' ? (
                      'Access Student Account'
                    ) : !isSignup ? (
                      'Sign In'
                    ) : (
                      `Create ${activeRoleCard.label} Account`
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
