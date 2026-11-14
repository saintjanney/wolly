'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';

import {
  clearSessionCookie,
  clientAuth,
  syncSessionCookie,
} from '@/lib/firebase-client';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const Context = createContext<AuthState | undefined>(undefined);

/**
 * Reader auth for the blog.
 *
 * Every sign-in path ends by posting the ID token to `/api/session`, because the
 * paywall is decided server-side. Skipping that step leaves a reader who is
 * signed in on the client but anonymous to the server, which shows the paywall
 * on content they have paid for.
 *
 * A full page refresh follows sign-in and sign-out: the post page is server
 * rendered, so its paid/unpaid state only changes when the server renders it
 * again with the new cookie.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(clientAuth(), (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  const finish = useCallback(async () => {
    await syncSessionCookie();
    // Re-render server components with the session in place.
    window.location.reload();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(clientAuth(), email, password);
        await finish();
      },
      signUp: async (email, password) => {
        await createUserWithEmailAndPassword(clientAuth(), email, password);
        await finish();
      },
      signInWithGoogle: async () => {
        await signInWithPopup(clientAuth(), new GoogleAuthProvider());
        await finish();
      },
      logout: async () => {
        await signOut(clientAuth());
        await clearSessionCookie();
        window.location.reload();
      },
    }),
    [user, loading, finish],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
