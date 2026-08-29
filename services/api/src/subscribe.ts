import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const REGION = 'europe-west2';
const PAYSTACK_SECRET = defineSecret('PAYSTACK_SECRET_KEY');
const PAYSTACK_API = 'https://api.paystack.co';

const PUBLICATIONS = 'publications';
const TIERS = 'tiers';
const SUBSCRIPTIONS = 'subscriptions';

type Plan = 'monthly' | 'annual';

interface SubscribeRequest {
  publicationId: string;
  tierId: string;
  plan: Plan;
  /** Where to send the reader after paying. */
  callbackUrl?: string;
}

async function paystack<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
): Promise<T> {
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET.value()}`,
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const payload = (await res.json()) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || payload.status !== true) {
    throw new HttpsError(
      'internal',
      payload.message ?? `Paystack request failed (${res.status}).`,
    );
  }
  return payload.data as T;
}

/**
 * Starts a subscription checkout.
 *
 * The client sends only a publication, a tier and an interval. Everything that
 * decides what is charged is read server-side from the tier document, so a
 * modified client cannot choose its own price. The resulting transaction carries
 * metadata identifying the reader, publication and tier, which is the only link
 * the webhook trusts when it later grants access.
 *
 * Two payment shapes, because of a real constraint rather than a preference:
 *
 *  - `monthly` uses a Paystack Plan, so it renews automatically. Recurring
 *    charges need a card mandate.
 *  - `annual` is a ONE-OFF charge for twelve months. Paystack cannot auto-renew
 *    mobile money, which is the dominant payment method in Ghana, so an annual
 *    prepay is the only way those readers can hold a paid subscription at all.
 *    The webhook grants the same access and marks it not to renew.
 */
export const initializeSubscription = onCall(
  { region: REGION, secrets: [PAYSTACK_SECRET], cors: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Sign in to subscribe.');
    }

    const { publicationId, tierId, plan, callbackUrl } =
      (request.data ?? {}) as SubscribeRequest;

    if (!publicationId || !tierId || (plan !== 'monthly' && plan !== 'annual')) {
      throw new HttpsError(
        'invalid-argument',
        'publicationId, tierId and plan (monthly or annual) are required.',
      );
    }

    const db = getFirestore();

    const pubSnap = await db.collection(PUBLICATIONS).doc(publicationId).get();
    if (!pubSnap.exists) throw new HttpsError('not-found', 'Publication not found.');
    const publication = pubSnap.data() as {
      name?: string;
      slug?: string;
      ownerUserId?: string;
      paidEnabled?: boolean;
      currency?: string;
      status?: string;
    };

    if (publication.status !== 'active' || publication.paidEnabled !== true) {
      throw new HttpsError(
        'failed-precondition',
        'This publication is not accepting paid subscriptions.',
      );
    }
    if (publication.ownerUserId === uid) {
      throw new HttpsError('failed-precondition', 'You cannot subscribe to your own publication.');
    }

    // Already subscribed and still inside the paid period.
    const subRef = db.collection(SUBSCRIPTIONS).doc(`${uid}_${publicationId}`);
    const existing = await subRef.get();
    const currentEnd = existing.data()?.currentPeriodEnd as
      | { toMillis(): number }
      | undefined;
    if (existing.data()?.isPaid === true && currentEnd && currentEnd.toMillis() > Date.now()) {
      throw new HttpsError('already-exists', 'You already have an active subscription.');
    }

    const tierSnap = await db
      .collection(PUBLICATIONS)
      .doc(publicationId)
      .collection(TIERS)
      .doc(tierId)
      .get();
    if (!tierSnap.exists) throw new HttpsError('not-found', 'Tier not found.');

    const tier = tierSnap.data() as {
      name?: string;
      monthlyPrice?: number;
      annualPrice?: number;
      currency?: string;
      isActive?: boolean;
      paystackPlanCodeMonthly?: string;
    };
    if (tier.isActive === false) {
      throw new HttpsError('failed-precondition', 'That tier is no longer available.');
    }

    // Price comes from the tier document. The client never sends an amount.
    const amount = plan === 'annual' ? tier.annualPrice : tier.monthlyPrice;
    if (!amount || amount <= 0) {
      throw new HttpsError(
        'failed-precondition',
        plan === 'annual'
          ? 'This tier does not offer an annual price.'
          : 'This tier has no price set.',
      );
    }

    const currency = tier.currency ?? publication.currency ?? 'GHS';
    const email = request.auth?.token.email ?? (await getAuth().getUser(uid)).email;
    if (!email) {
      throw new HttpsError('failed-precondition', 'Your account has no email address.');
    }

    // A Paystack Plan is needed only for the auto-renewing monthly option.
    let planCode = tier.paystackPlanCodeMonthly;
    if (plan === 'monthly' && !planCode) {
      const created = await paystack<{ plan_code: string }>('/plan', {
        method: 'POST',
        body: {
          name: `${publication.name ?? 'Publication'} - ${tier.name ?? 'Paid'} (monthly)`,
          amount,
          interval: 'monthly',
          currency,
        },
      });
      planCode = created.plan_code;
      // Cache it so the plan is created once per tier, not once per subscriber.
      await tierSnap.ref.set(
        { paystackPlanCodeMonthly: planCode, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }

    const reference = `WOLLYSUB_${publicationId}_${uid}_${Date.now()}`;

    const transaction = await paystack<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>('/transaction/initialize', {
      method: 'POST',
      body: {
        email,
        amount,
        currency,
        reference,
        ...(plan === 'monthly' && planCode ? { plan: planCode } : {}),
        callback_url: callbackUrl,
        // The webhook trusts ONLY this metadata to decide who gets access.
        metadata: {
          kind: plan === 'annual' ? 'annual_prepay' : 'subscription',
          userId: uid,
          publicationId,
          tierId,
          plan,
        },
      },
    });

    return {
      authorizationUrl: transaction.authorization_url,
      reference: transaction.reference,
      amount,
      currency,
      plan,
    };
  },
);
