import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseApp } from '@/integrations/firebase/client';
import {
  completeAdultSelfSignupFirebase,
  completeStudentFirstLoginFirebase,
  studentAccessSignInFirebase,
} from '@/integrations/firebase/identity';
import type { LoginModeOption } from '@/lib/identity-options';

export type AppRole = 'student' | 'parent' | 'teacher' | 'school_admin' | 'school' | 'admin' | 'super_admin';
export type EducationLevel = 'PLE' | 'UCE' | 'UACE' | string;

interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthSession {
  provider: 'firebase';
  accessToken: string | null;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  level?: EducationLevel;
  school?: string;
  phone?: string;
  dob?: string;
  contact_person?: string;
  studentOnboardingState?: 'provisioned' | 'first_login_pending' | 'active' | 'recovery_required';
  studentLoginMode?: 'access_code' | 'email_password' | 'both';
  mustChangePassword?: boolean;
  mustSetPin?: boolean;
}

interface UserProgress {
  xp: number;
  streak: number;
  last_exam_date?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  role: AppRole | null;
  progress: UserProgress | null;
  startupError: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; role: AppRole | null }>;
  signInWithStudentAccess: (accessCode: string, secret: string) => Promise<{
    error: Error | null;
    role: AppRole | null;
    requiresFirstLoginSetup: boolean;
  }>;
  completeStudentFirstLogin: (newSecret: string, loginMode?: LoginModeOption) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: {
      name?: string;
      role?: AppRole;
      country?: string | null;
      educationLevel?: string | null;
      educationStage?: string | null;
    },
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  // Super admin features
  isSuperAdmin: boolean;
  viewAsRole: AppRole | null;
  setViewAsRole: (role: AppRole | null) => void;
  effectiveRole: AppRole | null; // Returns viewAsRole if set, otherwise real role
  requiresStudentSetup: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isAppRole = (value: unknown): value is AppRole =>
  value === 'student' ||
  value === 'parent' ||
  value === 'teacher' ||
  value === 'school_admin' ||
  value === 'school' ||
  value === 'admin' ||
  value === 'super_admin';

const getError = (error: unknown): Error => {
  if (error instanceof Error) {
    const detailsMessage =
      (error as { details?: { message?: string } })?.details?.message ||
      ((error as { details?: string })?.details || '');
    if (
      detailsMessage &&
      (error.message === 'INTERNAL' || error.message === 'internal' || error.message.startsWith('FirebaseError'))
    ) {
      return new Error(detailsMessage);
    }
    return error;
  }
  const maybeMessage = (error as { message?: string })?.message;
  return new Error(maybeMessage || 'Unknown authentication error');
};

const splitDisplayName = (displayName: string | null | undefined) => {
  const parts = (displayName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsRole, setViewAsRoleState] = useState<AppRole | null>(null);
  const lastAuthenticatedUidRef = useRef<string | null>(null);
  const pendingAdultProvisioningUidRef = useRef<string | null>(null);

  // Compute effective role (view-as overrides for UI, but real role for security)
  const effectiveRole = viewAsRole || role;
  // Check if current user is super admin based on real persisted role
  const isSuperAdmin = role === 'super_admin';
  const requiresStudentSetup =
    role === 'student' &&
    (profile?.studentOnboardingState === 'provisioned' || profile?.studentOnboardingState === 'first_login_pending');

  const safeGetDoc = async (collectionName: string, userId: string) => {
    const app = getFirebaseApp();
    const db = getFirestore(app);

    try {
      return await getDoc(doc(db, collectionName, userId));
    } catch (error) {
      console.error(`[AuthContext] Failed to read ${collectionName}/${userId}`, error);
      return null;
    }
  };

  const fetchFirebaseUserData = async (userId: string, email: string | null, displayName: string | null) => {
    const app = getFirebaseApp();
    const auth = getAuth(app);

    const [canonicalUserSnap, progressSnap] = await Promise.all([
      safeGetDoc('users', userId),
      safeGetDoc('user_progress', userId),
    ]);
    const canonicalUserData = canonicalUserSnap?.data() as
      | {
          displayName?: string;
          email?: string | null;
          phone?: string | null;
          primaryRole?: unknown;
        }
      | undefined;
    const fallbackName = displayName || email?.split('@')[0] || 'User';

    let resolvedRole: AppRole | null = null;
    let tokenRole: AppRole | null = null;
    if (auth.currentUser) {
      const tokenResult = await auth.currentUser.getIdTokenResult();
      if (isAppRole(tokenResult.claims.role)) {
        tokenRole = tokenResult.claims.role;
      }
    }
    if (!resolvedRole && tokenRole) {
      resolvedRole = tokenRole;
    }
    if (!resolvedRole && isAppRole(canonicalUserData?.primaryRole)) {
      resolvedRole = canonicalUserData.primaryRole;
    }
    setRole(resolvedRole);
    console.debug('[AuthContext] Resolved role sources', {
      uid: userId,
      tokenRole,
      canonicalRole: canonicalUserData?.primaryRole ?? null,
      resolvedRole,
    });

    const studentProfileSnap = resolvedRole === 'student' ? await safeGetDoc('student_profiles', userId) : null;
    const adultProfileSnap = resolvedRole && resolvedRole !== 'student' ? await safeGetDoc('adult_profiles', userId) : null;
    const studentProfileData = studentProfileSnap?.data() as
      | {
          firstName?: string;
          lastName?: string;
          preferredName?: string | null;
          educationLevel?: EducationLevel;
          onboardingState?: Profile['studentOnboardingState'];
          loginMode?: Profile['studentLoginMode'];
          mustChangePassword?: boolean;
          mustSetPin?: boolean;
        }
      | undefined;
    const adultProfileData = adultProfileSnap?.data() as
      | {
          firstName?: string;
          lastName?: string;
          phone?: string | null;
        }
      | undefined;

    const hasCanonicalUser = Boolean(canonicalUserSnap?.exists());
    const hasRequiredCanonicalProfile =
      resolvedRole === 'student'
        ? Boolean(studentProfileSnap?.exists())
        : Boolean(resolvedRole && adultProfileSnap?.exists());

    if (!hasCanonicalUser) {
      const message = `Canonical identity is missing for authenticated user ${userId}. Expected users/${userId}.`;
      setProfile(null);
      setStartupError(message);
      throw new Error(message);
    }

    if (!resolvedRole) {
      const message = `Unable to resolve a canonical role for authenticated user ${userId}. Expected Firebase custom claims role or users/${userId}.primaryRole.`;
      setProfile(null);
      setStartupError(message);
      throw new Error(message);
    }

    if (!hasRequiredCanonicalProfile) {
      const expectedCollection = resolvedRole === 'student' ? 'student_profiles' : 'adult_profiles';
      const message = `Canonical profile is missing for authenticated user ${userId}. Expected ${expectedCollection}/${userId}.`;
      setProfile(null);
      setStartupError(message);
      throw new Error(message);
    }

    const resolvedName =
      resolvedRole === 'student'
        ? studentProfileData?.preferredName ||
          [studentProfileData?.firstName, studentProfileData?.lastName].filter(Boolean).join(' ').trim() ||
          canonicalUserData?.displayName ||
          fallbackName
        : [adultProfileData?.firstName, adultProfileData?.lastName].filter(Boolean).join(' ').trim() ||
          canonicalUserData?.displayName ||
          fallbackName;

    setProfile({
      id: userId,
      name: resolvedName,
      email: canonicalUserData?.email || email || '',
      level: resolvedRole === 'student' ? studentProfileData?.educationLevel : undefined,
      phone:
        resolvedRole === 'student'
          ? canonicalUserData?.phone || undefined
          : adultProfileData?.phone || canonicalUserData?.phone || undefined,
      studentOnboardingState: studentProfileData?.onboardingState,
      studentLoginMode: studentProfileData?.loginMode,
      mustChangePassword: studentProfileData?.mustChangePassword,
      mustSetPin: studentProfileData?.mustSetPin,
    });
    setStartupError(null);

    const progressData = progressSnap?.data();
    if (progressData) {
      setProgress({
        xp: typeof progressData.xp === 'number' ? progressData.xp : 0,
        streak: typeof progressData.streak === 'number' ? progressData.streak : 0,
        last_exam_date: typeof progressData.last_exam_date === 'string' ? progressData.last_exam_date : undefined,
      });
    } else {
      setProgress({ xp: 0, streak: 0 });
    }

    return resolvedRole;
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const auth = getAuth(getFirebaseApp());
      const firebaseUser = auth.currentUser;
      try {
        await fetchFirebaseUserData(user.id, firebaseUser?.email || null, firebaseUser?.displayName || null);
      } catch (error) {
        console.error('[AuthContext] refreshProfile failed', error);
        setStartupError(error instanceof Error ? error.message : 'Profile refresh failed');
      }
    }
  };

  useEffect(() => {
    const auth = getAuth(getFirebaseApp());
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          if (lastAuthenticatedUidRef.current !== firebaseUser.uid) {
            setViewAsRoleState(null);
            lastAuthenticatedUidRef.current = firebaseUser.uid;
          }
          const token = await firebaseUser.getIdToken();
          setSession({ provider: 'firebase', accessToken: token });
          setUser({ id: firebaseUser.uid, email: firebaseUser.email });
          if (pendingAdultProvisioningUidRef.current === firebaseUser.uid) {
            setProfile(null);
            setRole(null);
            setProgress(null);
            setStartupError(null);
            return;
          }
          await fetchFirebaseUserData(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setProgress(null);
          setStartupError(null);
          lastAuthenticatedUidRef.current = null;
        }
      } catch (error) {
        console.error('[AuthContext] Failed during auth bootstrap', error);
        setStartupError(error instanceof Error ? error.message : 'Authentication bootstrap failed');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setViewAsRoleState(null);
      const credential = await signInWithEmailAndPassword(getAuth(getFirebaseApp()), email, password);
      const token = await credential.user.getIdToken();
      setSession({ provider: 'firebase', accessToken: token });
      setUser({ id: credential.user.uid, email: credential.user.email });
      const resolvedRole = await fetchFirebaseUserData(
        credential.user.uid,
        credential.user.email,
        credential.user.displayName,
      );
      return { error: null, role: resolvedRole };
    } catch (error: unknown) {
      return { error: getError(error), role: null };
    }
  };

  const signInWithStudentAccess = async (accessCode: string, secret: string) => {
    try {
      setViewAsRoleState(null);
      const result = await studentAccessSignInFirebase({ accessCode, secret });
      const credential = await signInWithCustomToken(getAuth(getFirebaseApp()), result.customToken);
      const token = await credential.user.getIdToken();
      setSession({ provider: 'firebase', accessToken: token });
      setUser({ id: credential.user.uid, email: credential.user.email });
      const resolvedRole = await fetchFirebaseUserData(
        credential.user.uid,
        credential.user.email,
        credential.user.displayName,
      );
      return {
        error: null,
        role: resolvedRole,
        requiresFirstLoginSetup:
          result.onboardingState === 'provisioned' || result.onboardingState === 'first_login_pending',
      };
    } catch (error: unknown) {
      return { error: getError(error), role: null, requiresFirstLoginSetup: false };
    }
  };

  const completeStudentFirstLogin = async (newSecret: string, loginMode: LoginModeOption = 'access_code') => {
    try {
      await completeStudentFirstLoginFirebase({ newSecret, loginMode });
      await refreshProfile();
      return { error: null };
    } catch (error: unknown) {
      return { error: getError(error) };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: {
      name?: string;
      role?: AppRole;
      country?: string | null;
      educationLevel?: string | null;
      educationStage?: string | null;
    },
  ) => {
    try {
      const app = getFirebaseApp();
      const auth = getAuth(app);
      const db = getFirestore(app);
      const roleToUse = metadata?.role || 'student';
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (roleToUse !== 'student') {
        pendingAdultProvisioningUidRef.current = credential.user.uid;
      }

      if (metadata?.name) {
        await updateFirebaseProfile(credential.user, { displayName: metadata.name });
      }

      const nameParts = splitDisplayName(metadata?.name || email.split('@')[0]);

      if (roleToUse === 'student') {
        await setDoc(doc(db, 'user_progress', credential.user.uid), {
          xp: 0,
          streak: 0,
          updated_at: serverTimestamp(),
        }, { merge: true });
        await setDoc(doc(db, 'users', credential.user.uid), {
          uid: credential.user.uid,
          primaryRole: 'student',
          secondaryRoles: [],
          status: 'active',
          displayName: metadata?.name || email.split('@')[0],
          email,
          phone: null,
          hasEmailLogin: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: null,
          authProviderSummary: {
            hasPassword: true,
            providers: ['password'],
          },
          profileVersion: 2,
        }, { merge: true });

        await setDoc(doc(db, 'student_profiles', credential.user.uid), {
          uid: credential.user.uid,
          firstName: nameParts.firstName || email.split('@')[0],
          lastName: nameParts.lastName,
          preferredName: null,
          dateOfBirth: null,
          gender: null,
          country: metadata?.country || null,
          educationLevel: metadata?.educationLevel || null,
          educationStage: metadata?.educationStage || null,
          gradeLevel: null,
          candidateNumber: null,
          learningMode: 'self',
          loginMode: 'email_password',
          onboardingState: 'active',
          mustChangePassword: false,
          mustSetPin: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        let provisioningSucceeded = false;
        try {
          await credential.user.getIdToken(true);
          await completeAdultSelfSignupFirebase({
            role: roleToUse as 'parent' | 'teacher' | 'school_admin',
            displayName: metadata?.name || email.split('@')[0],
            country: metadata?.country || null,
            phone: null,
            jobTitle: null,
          });
          provisioningSucceeded = true;
          const token = await credential.user.getIdToken(true);
          setSession({ provider: 'firebase', accessToken: token });
          setUser({ id: credential.user.uid, email: credential.user.email });
          await fetchFirebaseUserData(
            credential.user.uid,
            credential.user.email,
            credential.user.displayName,
          );
        } catch (error) {
          console.warn('[AuthContext] Failed to provision canonical adult identity docs', error);
          if (!provisioningSucceeded) {
            await credential.user.delete().catch(() => null);
          }
          await firebaseSignOut(auth).catch(() => null);
          throw error;
        } finally {
          pendingAdultProvisioningUidRef.current = null;
        }
      }

      return { error: null };
    } catch (error: unknown) {
      return { error: getError(error) };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(getAuth(getFirebaseApp()));
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setProgress(null);
    setStartupError(null);
    setViewAsRoleState(null);
  };

  // View-as setter - only allowed for super admin
  const setViewAsRole = (newRole: AppRole | null) => {
    if (isSuperAdmin) {
      setViewAsRoleState(newRole);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        progress,
        startupError,
        loading,
        signIn,
        signInWithStudentAccess,
        completeStudentFirstLogin,
        signUp,
        signOut,
        refreshProfile,
        isSuperAdmin,
        viewAsRole,
        setViewAsRole,
        effectiveRole,
        requiresStudentSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
