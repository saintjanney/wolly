'use client';

import { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { useAuth } from './AuthProvider';
import { SignInDialog } from './SignInDialog';
import { clientDb, clientFunctions } from '@/lib/firebase-client';

interface TierView {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  monthlyPrice: number;
  annualPrice: number | null;
}

const money = (minor: number, currency: string) =>
  `${currency} ${(minor / 100).toFixed(2)}`;

/**
 * Free and paid subscribe options.
 *
 * Free subscribing writes the subscription directly: security rules permit a
 * client to create its OWN free subscription and nothing more. Paid subscribing
 * goes through `initializeSubscription`, which reads the price from the tier
 * document server-side, so the amount can never come from here.
 */
export function SubscribeOptions({
  publicationId,
  publicationName,
  publicationSlug,
  paidEnabled,
  currency,
  tiers,
}: {
  publicationId: string;
  publicationName: string;
  publicationSlug: string;
  paidEnabled: boolean;
  currency: string;
  tiers: TierView[];
}) {
  const { user } = useAuth();
  const [signInFor, setSignInFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribeFree = async () => {
    if (!user) {
      setSignInFor('Sign in to follow this publication.');
      return;
    }
    setBusy('free');
    setError(null);
    try {
      await setDoc(
        doc(clientDb(), 'subscriptions', `${user.uid}_${publicationId}`),
        {
          userId: user.uid,
          publicationId,
          // Rules reject any client write that claims paid status.
          status: 'free',
          isPaid: false,
          cancelAtPeriodEnd: false,
          emailOptIn: true,
          source: 'web',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      );
      setDone(true);
    } catch (e) {
      console.error('free subscribe failed', e);
      setError('Could not subscribe. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const subscribePaid = async (tierId: string, plan: 'monthly' | 'annual') => {
    if (!user) {
      setSignInFor('Sign in to subscribe.');
      return;
    }
    setBusy(`${tierId}-${plan}`);
    setError(null);
    try {
      const call = httpsCallable<
        { publicationId: string; tierId: string; plan: string; callbackUrl: string },
        { authorizationUrl: string }
      >(clientFunctions(), 'initializeSubscription');

      const result = await call({
        publicationId,
        tierId,
        plan,
        callbackUrl: `${window.location.origin}/@${publicationSlug}`,
      });

      // Paystack hosts the payment page.
      window.location.href = result.data.authorizationUrl;
    } catch (e) {
      const message = (e as { message?: string }).message;
      setError(message ?? 'Could not start checkout. Please try again.');
      setBusy(null);
    }
  };

  if (done) {
    return (
      <div className="mt-10 rounded-xl border border-green-200 bg-green-50 px-6 py-8 text-center">
        <p className="font-medium text-green-900">
          You are subscribed to {publicationName}.
        </p>
        <p className="mt-1 text-sm text-green-800">
          New free posts will appear in your feed.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Free is always available: it is how a publication grows. */}
      <section className="rounded-xl border border-[var(--wolly-rule)] p-6">
        <h2 className="text-lg font-semibold">Free</h2>
        <p className="mt-1 text-sm text-[var(--wolly-muted)]">
          Every free post, as soon as it is published.
        </p>
        <button
          onClick={() => void subscribeFree()}
          disabled={busy !== null}
          className="mt-4 w-full rounded-lg border border-[var(--wolly-accent)] px-4 py-2.5 text-sm font-medium text-[var(--wolly-accent)] hover:bg-indigo-50 disabled:opacity-50"
        >
          {busy === 'free' ? 'Subscribing…' : 'Subscribe free'}
        </button>
      </section>

      {paidEnabled && tiers.length > 0
        ? tiers.map((tier) => (
            <section
              key={tier.id}
              className="rounded-xl border border-[var(--wolly-accent)] p-6"
            >
              <h2 className="text-lg font-semibold">{tier.name}</h2>
              {tier.description ? (
                <p className="mt-1 text-sm text-[var(--wolly-muted)]">
                  {tier.description}
                </p>
              ) : null}

              {tier.benefits.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm text-gray-700">
                  {tier.benefits.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-5 space-y-2">
                <button
                  onClick={() => void subscribePaid(tier.id, 'monthly')}
                  disabled={busy !== null}
                  className="w-full rounded-lg bg-[var(--wolly-accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busy === `${tier.id}-monthly`
                    ? 'Starting checkout…'
                    : `${money(tier.monthlyPrice, currency)} / month`}
                </button>

                {tier.annualPrice ? (
                  <button
                    onClick={() => void subscribePaid(tier.id, 'annual')}
                    disabled={busy !== null}
                    className="w-full rounded-lg border border-[var(--wolly-rule)] px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    {busy === `${tier.id}-annual`
                      ? 'Starting checkout…'
                      : `${money(tier.annualPrice, currency)} / year`}
                  </button>
                ) : null}
              </div>

              {tier.annualPrice ? (
                <p className="mt-3 text-xs text-[var(--wolly-muted)]">
                  Paying by mobile money? Choose yearly: it is charged once rather
                  than renewing, which is the only option mobile money supports.
                </p>
              ) : null}
            </section>
          ))
        : null}

      <SignInDialog
        open={signInFor !== null}
        reason={signInFor ?? undefined}
        onClose={() => setSignInFor(null)}
      />
    </div>
  );
}
