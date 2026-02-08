'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  onboardingCompleted?: boolean;
  /** ISO 4217 currency code from Firestore (e.g. "GHS", "USD") */
  currency?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  markOnboardingComplete: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Get user document from Firestore to check onboarding status
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          // If no Firestore document exists, create a minimal one
          if (!userDocSnap.exists()) {
            console.log('[AuthContext] No Firestore document found, creating minimal user document');
            try {
              const minimalUserData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                onboardingCompleted: false,
                onboardingStep: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
              };
              
              // Remove undefined values
              const cleanedData: Record<string, unknown> = {};
              for (const [key, value] of Object.entries(minimalUserData)) {
                if (value !== undefined && value !== null) {
                  cleanedData[key] = value;
                }
              }
              
              await setDoc(userDocRef, cleanedData, { merge: true });
              console.log('[AuthContext] Created minimal user document');
            } catch (createError) {
              console.error('[AuthContext] Error creating user document:', createError);
              // Continue anyway - onboarding will create the full document
            }
          }
          
          // Re-fetch the document (it might have been just created)
          const updatedDocSnap = await getDoc(userDocRef);
          const userDocData = updatedDocSnap.exists() ? updatedDocSnap.data() : {};
          
          const userData: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || userDocData?.displayName || firebaseUser.email?.split('@')[0] || 'User',
            photoURL: firebaseUser.photoURL || undefined,
            onboardingCompleted: userDocData?.onboardingCompleted || false,
            currency: typeof userDocData?.currency === 'string' ? userDocData.currency : undefined,
          };
          
          console.log('[AuthContext] User authenticated:', userData);
          setUser(userData);
        } catch (error) {
          console.error('[AuthContext] Error fetching user data:', error);
          // Fallback to basic user info if Firestore fetch fails
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            photoURL: firebaseUser.photoURL || undefined,
            onboardingCompleted: false,
            currency: undefined,
          });
        }
      } else {
        console.log('[AuthContext] No user authenticated');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Attempting sign in:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('[AuthContext] Sign in successful:', userCredential.user.uid);
      // onAuthStateChanged will update the user state
    } catch (error: unknown) {
      console.error('[AuthContext] Sign in error:', error);
      const firebaseError = error as { code?: string; message?: string };
      const errorMessage = 
        firebaseError.code === 'auth/invalid-credential' || 
        firebaseError.code === 'auth/user-not-found' || 
        firebaseError.code === 'auth/wrong-password'
          ? 'Invalid email or password'
          : firebaseError.code === 'auth/invalid-email'
          ? 'Invalid email address'
          : firebaseError.code === 'auth/user-disabled'
          ? 'This account has been disabled'
          : firebaseError.code === 'auth/too-many-requests'
          ? 'Too many failed login attempts. Please try again later.'
          : firebaseError.message || 'Failed to sign in';
      throw new Error(errorMessage);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Attempting sign up:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('[AuthContext] Sign up successful:', userCredential.user.uid);
      
      // Update the user's display name to be their email username
      const displayName = email.split('@')[0];
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
      
      // onAuthStateChanged will update the user state
      // User document will be created during onboarding
    } catch (error: unknown) {
      console.error('[AuthContext] Sign up error:', error);
      const firebaseError = error as { code?: string; message?: string };
      const errorMessage = firebaseError.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists. Please sign in instead.'
        : firebaseError.code === 'auth/invalid-email'
        ? 'Invalid email address'
        : firebaseError.code === 'auth/weak-password'
        ? 'Password should be at least 6 characters'
        : firebaseError.message || 'Failed to create account';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      console.log('[AuthContext] Logging out');
      await firebaseSignOut(auth);
      // onAuthStateChanged will update the user state to null
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      throw error;
    }
  };

  const markOnboardingComplete = () => {
    console.log('[AuthContext] Marking onboarding complete for:', user?.email);
    if (user) {
      // Update local state - the Firestore document will be updated by the onboarding service
      const updatedUser = {
        ...user,
        onboardingCompleted: true
      };
      console.log('[AuthContext] Updated user:', updatedUser);
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout, markOnboardingComplete }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
