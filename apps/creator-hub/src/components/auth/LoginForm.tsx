'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);

    try {
      await signIn(email, password);
      toast.success('Successfully signed in!');
      // Don't redirect immediately - let auth state update and routing logic handle it
      // The home page and OnboardingGuard will handle the appropriate redirect
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      toast.error(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    
    setIsCreatingAccount(true);
    try {
      await signUp(email, password);
      toast.success('Account created successfully!');
      // Wait for auth state to stabilize (onAuthStateChanged needs time to create Firestore doc)
      // Then redirect - OnboardingGuard will also handle this, but explicit redirect ensures smooth UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.replace('/onboarding');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      
      // If email already exists, suggest signing in instead
      if (errorMessage.includes('already exists')) {
        toast.error(errorMessage, {
          duration: 5000,
          icon: 'ℹ️',
        });
        // Optionally, you could auto-switch to sign-in mode here
        // Or show a button to sign in instead
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsCreatingAccount(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-3">
        <div>
          <input
            type="email"
            required
            className="input-field"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <input
            type="password"
            required
            className="input-field"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="submit"
          disabled={isSigningIn || isCreatingAccount}
          className="btn-primary w-full"
        >
          {isSigningIn ? 'Signing in...' : 'Sign in'}
        </button>
        <button
          type="button"
          onClick={handleSignUp}
          disabled={isSigningIn || isCreatingAccount}
          className="btn-secondary w-full"
        >
          {isCreatingAccount ? 'Creating account...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}
