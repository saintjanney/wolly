'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasRedirectedRef = useRef(false);

  // Normalize pathname (remove trailing slash)
  const normalizedPathname = pathname?.replace(/\/$/, '') || pathname;

  useEffect(() => {
    // Clear any pending redirects when component unmounts or dependencies change
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    console.log('[OnboardingGuard] Effect running:', { 
      loading, 
      user: user?.email, 
      onboardingCompleted: user?.onboardingCompleted, 
      pathname: normalizedPathname,
      hasRedirected: hasRedirectedRef.current
    });

    // Don't do anything while loading
    if (loading) {
      return;
    }

    // If no user, reset redirect flag and let other components handle it
    if (!user) {
      hasRedirectedRef.current = false;
      return;
    }

    // If already on onboarding page, don't redirect - just reset flag
    if (normalizedPathname === '/onboarding') {
      hasRedirectedRef.current = false;
      return;
    }

    // If on home page, don't redirect (home page handles its own redirects)
    if (normalizedPathname === '/') {
      hasRedirectedRef.current = false;
      return;
    }

    // Check if onboarding is needed (explicitly false, not undefined)
    const needsOnboarding = user.onboardingCompleted === false;

    // Only redirect if user needs onboarding, not already redirected, and not on onboarding/home
    if (needsOnboarding && !hasRedirectedRef.current) {
      console.log('[OnboardingGuard] Initiating redirect to onboarding from:', normalizedPathname);
      hasRedirectedRef.current = true;
      
      // Use router.replace immediately (no timeout needed)
      router.replace('/onboarding');
    }

    // Cleanup function
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [user, loading, normalizedPathname, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If on onboarding page, ALWAYS render immediately (before any other checks)
  if (normalizedPathname === '/onboarding') {
    console.log('[OnboardingGuard] Rendering onboarding page');
    return <>{children}</>;
  }

  // If on home page, always render
  if (normalizedPathname === '/') {
    return <>{children}</>;
  }

  // If user needs onboarding and trying to access other pages, show redirecting state
  if (user && user.onboardingCompleted === false) {
    console.log('[OnboardingGuard] Blocking access, needs onboarding - showing redirect screen');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to onboarding...</p>
        </div>
      </div>
    );
  }

  // All other cases, render normally
  return <>{children}</>;
}
