'use client';

import { useState } from 'react';

import { useAuth } from './AuthProvider';
import { SignInDialog } from './SignInDialog';

/** Sign in / sign out control in the site header. */
export function HeaderAuth() {
  const { user, loading, logout } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading) {
    return <span className="h-4 w-16 animate-pulse rounded bg-gray-100" />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setDialogOpen(true)}
          className="text-sm text-[var(--wolly-muted)] hover:text-[var(--wolly-ink)]"
        >
          Sign in
        </button>
        <SignInDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-[var(--wolly-muted)] sm:inline">
        {user.email}
      </span>
      <button
        onClick={() => void logout()}
        className="text-[var(--wolly-muted)] hover:text-[var(--wolly-ink)]"
      >
        Sign out
      </button>
    </div>
  );
}
