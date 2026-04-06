import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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

export type AppRole = 'student' | 'parent' | 'school' | 'admin' | 'super_admin';
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
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: { name?: string; role?: AppRole }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  // Super admin features
  isSuperAdmin: boolean;
  viewAsRole: AppRole | null;
  setViewAsRole: (role: AppRole | null) => void;
  effectiveRole: AppRole | null; // Returns viewAsRole if set, otherwise real role
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isAppRole = (value: unknown): value is AppRole =>
  value === 'student' || value === 'parent' || value === 'school' || value === 'admin' || value === 'super_admin';

const getError = (error: unknown): Error =>
  error instanceof Error ? error : new Error('Unknown authentication error');

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsRole, setViewAsRoleState] = useState<AppRole | null>(null);

  // Compute effective role (view-as overrides for UI, but real role for security)
  const effectiveRole = viewAsRole || role;
  // Check if current user is super admin based on real persisted role
  const isSuperAdmin = role === 'super_admin';

  const fetchFirebaseUserData = async (userId: string, email: string | null, displayName: string | null) => {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    const profileSnap = await getDoc(doc(db, 'profiles', userId));
    const profileData = profileSnap.data() as Partial<Profile> | undefined;
    const fallbackName = displayName || email?.split('@')[0] || 'User';
    setProfile({
      id: userId,
      name: profileData?.name || fallbackName,
      email: profileData?.email || email || '',
      avatar_url: profileData?.avatar_url,
      level: profileData?.level,
      school: profileData?.school,
      phone: profileData?.phone,
      dob: profileData?.dob,
      contact_person: profileData?.contact_person,
    });

    let resolvedRole: AppRole | null = null;
    if (auth.currentUser) {
      const tokenResult = await auth.currentUser.getIdTokenResult();
      if (isAppRole(tokenResult.claims.role)) {
        resolvedRole = tokenResult.claims.role;
      }
    }
    if (!resolvedRole) {
      const roleSnap = await getDoc(doc(db, 'user_roles', userId));
      const roleValue = roleSnap.data()?.role;
      resolvedRole = isAppRole(roleValue) ? roleValue : 'student';
    }
    setRole(resolvedRole);

    const progressSnap = await getDoc(doc(db, 'user_progress', userId));
    const progressData = progressSnap.data();
    if (progressData) {
      setProgress({
        xp: typeof progressData.xp === 'number' ? progressData.xp : 0,
        streak: typeof progressData.streak === 'number' ? progressData.streak : 0,
        last_exam_date: typeof progressData.last_exam_date === 'string' ? progressData.last_exam_date : undefined,
      });
    } else {
      setProgress({ xp: 0, streak: 0 });
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const auth = getAuth(getFirebaseApp());
      const firebaseUser = auth.currentUser;
      await fetchFirebaseUserData(user.id, firebaseUser?.email || null, firebaseUser?.displayName || null);
    }
  };

  useEffect(() => {
    const auth = getAuth(getFirebaseApp());
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setSession({ provider: 'firebase', accessToken: token });
        setUser({ id: firebaseUser.uid, email: firebaseUser.email });
        await fetchFirebaseUserData(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        setProgress(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(getAuth(getFirebaseApp()), email, password);
      return { error: null };
    } catch (error: unknown) {
      return { error: getError(error) };
    }
  };

  const signUp = async (email: string, password: string, metadata?: { name?: string; role?: AppRole }) => {
    try {
      const app = getFirebaseApp();
      const auth = getAuth(app);
      const db = getFirestore(app);
      const credential = await createUserWithEmailAndPassword(auth, email, password);

      if (metadata?.name) {
        await updateFirebaseProfile(credential.user, { displayName: metadata.name });
      }

      const roleToUse = metadata?.role || 'student';
      await setDoc(doc(db, 'profiles', credential.user.uid), {
        id: credential.user.uid,
        email,
        name: metadata?.name || email.split('@')[0],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      }, { merge: true });
      await setDoc(doc(db, 'user_roles', credential.user.uid), {
        role: roleToUse,
        updated_at: serverTimestamp(),
      }, { merge: true });
      await setDoc(doc(db, 'user_progress', credential.user.uid), {
        xp: 0,
        streak: 0,
        updated_at: serverTimestamp(),
      }, { merge: true });

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
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        isSuperAdmin,
        viewAsRole,
        setViewAsRole,
        effectiveRole,
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
