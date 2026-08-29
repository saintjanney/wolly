import { createHmac, timingSafeEqual } from 'node:crypto';

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

const REGION = 'europe-west2';

/**
 * The Paystack secret key, from Secret Manager.
 *
 * Deliberately NOT an environment variable read from a `.env`. That is how the
 * existing services/payments functions were configured, and it means the secret
 * lives only inside the deployed environment: redeploying from the repo would
 * silently drop it (see services/payments/predeploy-guard.sh). A Secret Manager
 * binding survives redeploys and is versioned.
 *
 * Set it once with:
 *   npx firebase-tools functions:secrets:set PAYSTACK_SECRET_KEY
 */
const PAYSTACK_SECRET = defineSecret('PAYSTACK_SECRET_KEY');

const SUBSCRIPTIONS = 'subscriptions';
const PUBLICATIONS = 'publications';

/**
 * Verifies a Paystack webhook signature.
 *
 * Paystack sends `x-paystack-signature`, an HMAC SHA512 of the request body
 * signed with the secret key. The HMAC MUST be computed over the RAW body:
 * re-serialising the parsed JSON can reorder keys or change whitespace and the
 * signature will never match.
 *
 * Compared with `timingSafeEqual` so the comparison cannot be used as an oracle.
 */
export function verifySignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;

  const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Paystack subscription events we act on. */
type PaystackEvent =
  | 'charge.success'
  | 'subscription.create'
  | 'subscription.disable'
  | 'subscription.not_renew'
  | 'invoice.update'
  | 'invoice.payment_failed';

interface PaystackPayload {
  event: PaystackEvent | string;
  data?: {
    reference?: string;
    status?: string;
    amount?: number;
    paid_at?: string;
    channel?: string;
    gateway_response?: string;
    next_payment_date?: string;
    subscription_code?: string;
    email_token?: string;
    plan?: { plan_code?: string; interval?: string };
    customer?: { customer_code?: string; email?: string };
    /** Set by us when initialising, and the only trustworthy link to our data. */
    metadata?: {
      userId?: string;
      publicationId?: string;
      tierId?: string;
      plan?: 'monthly' | 'annual' | 'founding';
      kind?: 'subscription' | 'annual_prepay' | 'book';
    };
  };
}

/**
 * Paystack webhook. The ONLY writer of `subscriptions.isPaid` and
 * `currentPeriodEnd`.
 *
 * Security rules deny every client write to those fields, so a reader cannot
 * grant themselves paid access; it has to arrive here, signed by Paystack.
 *
 * Always returns 200 once the signature is valid, even for events we ignore or
 * cannot map. Paystack retries non-2xx responses, and retrying an event we will
 * never handle just produces noise. Genuine problems are logged.
 */
export const paystackWebhook = onRequest(
  { region: REGION, secrets: [PAYSTACK_SECRET], cors: false },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    // `rawBody` is the unparsed body Firebase preserves for exactly this case.
    const raw = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!raw) {
      console.error('paystackWebhook: rawBody unavailable, cannot verify');
      res.status(400).send('Bad request');
      return;
    }

    const signature = req.headers['x-paystack-signature'] as string | undefined;
    if (!verifySignature(raw, signature, PAYSTACK_SECRET.value())) {
      // Do not explain why. An attacker probing signatures learns nothing.
      console.warn('paystackWebhook: rejected an unsigned or mis-signed request');
      res.status(401).send('Unauthorized');
      return;
    }

    let payload: PaystackPayload;
    try {
      payload = JSON.parse(raw.toString('utf8')) as PaystackPayload;
    } catch {
      res.status(400).send('Bad request');
      return;
    }

    try {
      await handleEvent(payload);
    } catch (error) {
      // Log and still return 200: a retry would hit the same bug. Losing an
      // event is recoverable by the nightly reconciliation job; a retry storm is
      // not.
      console.error('paystackWebhook: handler failed', payload.event, error);
    }

    res.status(200).send('ok');
  },
);

async function handleEvent(payload: PaystackPayload): Promise<void> {
  const { event, data } = payload;
  if (!data) return;

  const meta = data.metadata ?? {};

  // Book purchases are handled by services/payments; ignore them here so the two
  // do not both write the same document.
  if (meta.kind === 'book') return;

  const userId = meta.userId;
  const publicationId = meta.publicationId;
  if (!userId || !publicationId) {
    console.warn(`paystackWebhook: ${event} without userId/publicationId metadata`);
    return;
  }

  const db = getFirestore();
  const ref = db.collection(SUBSCRIPTIONS).doc(`${userId}_${publicationId}`);

  switch (event) {
    case 'charge.success': {
      if (data.status !== 'success') return;

      // An annual prepay is a one-off charge, not a Paystack subscription: card
      // mandates are unavailable on mobile money, which is the dominant method
      // in Ghana, so a reader pays 12 months up front instead. Access is
      // identical; only renewal differs, so it is marked to not auto-renew.
      const isPrepay = meta.kind === 'annual_prepay';
      const periodEnd = isPrepay
        ? addMonths(new Date(), 12)
        : periodEndFrom(data.next_payment_date, meta.plan);

      await ref.set(
        {
          userId,
          publicationId,
          ownerUserId: await publicationOwner(db, publicationId),
          status: 'active',
          isPaid: true,
          tierId: meta.tierId ?? null,
          plan: isPrepay ? 'annual' : (meta.plan ?? 'monthly'),
          currentPeriodEnd: Timestamp.fromDate(periodEnd),
          cancelAtPeriodEnd: isPrepay,
          paystackCustomerCode: data.customer?.customer_code,
          paystackSubscriptionCode: data.subscription_code,
          paystackEmailToken: data.email_token,
          lastPaymentAt: FieldValue.serverTimestamp(),
          lastPaymentReference: data.reference,
          emailOptIn: true,
          source: 'paystack',
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    case 'subscription.create': {
      await ref.set(
        {
          paystackSubscriptionCode: data.subscription_code,
          paystackEmailToken: data.email_token,
          paystackCustomerCode: data.customer?.customer_code,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    case 'invoice.update': {
      // A successful renewal extends the period.
      if (data.status !== 'success') return;
      await ref.set(
        {
          status: 'active',
          isPaid: true,
          currentPeriodEnd: Timestamp.fromDate(
            periodEndFrom(data.next_payment_date, meta.plan),
          ),
          lastPaymentAt: FieldValue.serverTimestamp(),
          lastPaymentReference: data.reference,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    case 'invoice.payment_failed': {
      // Do NOT clear isPaid here. The reader has paid for the current period;
      // access should last until it actually ends. `past_due` records the state
      // so the creator and a dunning flow can see it.
      await ref.set(
        { status: 'past_due', updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      return;
    }

    case 'subscription.not_renew': {
      await ref.set(
        { cancelAtPeriodEnd: true, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      return;
    }

    case 'subscription.disable': {
      // Cancelled or exhausted. Access still runs to the end of the paid period;
      // the rules compare currentPeriodEnd against request.time, so leaving
      // isPaid true until then is correct and honest.
      await ref.set(
        {
          status: 'canceled',
          cancelAtPeriodEnd: true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    default:
      // Not an event we act on.
      return;
  }
}

async function publicationOwner(
  db: FirebaseFirestore.Firestore,
  publicationId: string,
): Promise<string> {
  const snap = await db.collection(PUBLICATIONS).doc(publicationId).get();
  return (snap.data()?.ownerUserId as string) ?? '';
}

/**
 * When the current paid period ends.
 *
 * Prefers Paystack's own `next_payment_date`, which accounts for their billing
 * calendar. Falls back to one interval from now, plus a small grace period so a
 * renewal that lands slightly late does not briefly lock out a paying reader.
 */
export function periodEndFrom(
  nextPaymentDate: string | undefined,
  plan: string | undefined,
): Date {
  if (nextPaymentDate) {
    const parsed = new Date(nextPaymentDate);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getTime() + GRACE_MS);
    }
  }
  const months = plan === 'annual' ? 12 : 1;
  return new Date(addMonths(new Date(), months).getTime() + GRACE_MS);
}

/** Two days, so a late renewal does not lock out someone who has paid. */
const GRACE_MS = 2 * 24 * 60 * 60 * 1000;

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  // Clamp: 31 Jan + 1 month must not roll into March.
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0);
  }
  return d;
}
