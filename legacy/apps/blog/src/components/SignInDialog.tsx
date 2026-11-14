'use client';

import { useState } from 'react';

import { useAuth } from './AuthProvider';

/**
 * Sign in or create an account.
 *
 * Deliberately minimal: subscribing should not feel like enrolling. Email and
 * password keeps it working for readers without a Google account, which matters
 * for the audience this platform serves.
 */
export function SignInDialog({
  open,
  onClose,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  reason?: string;
}) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'in') await signIn(email, password);
      else await signUp(email, password);
      // A reload follows on success, so nothing to do here.
    } catch (e) {
      // Firebase codes are not reader-facing; translate the common ones.
      const code = (e as { code?: string }).code ?? '';
      setError(
        code.includes('invalid-credential') || code.includes('wrong-password')
          ? 'That email and password do not match.'
          : code.includes('email-already-in-use')
            ? 'That email already has an account. Try signing in.'
            : code.includes('weak-password')
              ? 'Use at least six characters.'
              : 'Something went wrong. Please try again.',
      );
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold tracking-tight">
          {mode === 'in' ? 'Sign in' : 'Create an account'}
        </h2>
        {reason ? <p className="mt-1 text-sm text-[var(--wolly-muted)]">{reason}</p> : null}

        <button
          onClick={() => void signInWithGoogle()}
          className="mt-5 w-full rounded-lg border border-[var(--wolly-rule)] px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-[var(--wolly-muted)]">
          <span className="h-px flex-1 bg-[var(--wolly-rule)]" />
          or
          <span className="h-px flex-1 bg-[var(--wolly-rule)]" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-[var(--wolly-rule)] px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-[var(--wolly-rule)] px-3 py-2 text-sm"
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[var(--wolly-accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm text-[var(--wolly-muted)] hover:text-[var(--wolly-ink)]"
        >
          {mode === 'in'
            ? 'No account? Create one'
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
